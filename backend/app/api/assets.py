import os
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db import get_db
from app.models import Project, GeneratedAsset, Highlight, Transcript
from app.schemas import GeneratedAssetResponse, AssetRegenerateRequest
from app.services.auth import get_current_user, User
from app.services.llm import chat_completion
from app.services.imagegen import generate_image

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/projects", tags=["Assets"])

@router.get("/{id}/assets", response_model=List[GeneratedAssetResponse])
async def list_project_assets(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Lists all generated assets (blog, thread, card, clip, and thumbnail covers) for a project."""
    # Validate project belongs to user
    result = await db.execute(select(Project).where(Project.id == id))
    project = result.scalars().first()
    if not project or project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Project not found.")

    assets_res = await db.execute(
        select(GeneratedAsset).where(GeneratedAsset.project_id == id)
    )
    return assets_res.scalars().all()

@router.post("/{id}/assets/{asset_id}/regenerate", response_model=GeneratedAssetResponse)
async def regenerate_single_asset(
    id: int,
    asset_id: int,
    payload: AssetRegenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Regenerates a single specific asset (e.g. blog post, thread)
    with an optional pinned model overrides in the body.
    """
    # 1. Validate project and asset ownership
    project_res = await db.execute(select(Project).where(Project.id == id))
    project = project_res.scalars().first()
    if not project or project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Project not found.")

    asset_res = await db.execute(
        select(GeneratedAsset).where(GeneratedAsset.project_id == id, GeneratedAsset.id == asset_id)
    )
    asset = asset_res.scalars().first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found.")

    # 2. Retrieve transcript and highlights
    transcript_res = await db.execute(select(Transcript).where(Transcript.project_id == id))
    transcript = transcript_res.scalars().first()
    full_text = transcript.full_text if transcript else project.source_ref

    highlights_res = await db.execute(select(Highlight).where(Highlight.project_id == id))
    highlights_list = highlights_res.scalars().all()
    highlights_summary = "\n".join([f"- Quote: \"{h.quote}\" (Reason: {h.reason})" for h in highlights_list])

    # 3. Handle model selection override
    model_mode = "pinned" if payload.model else "auto"
    pinned_model = payload.model

    logger.info(f"Regenerating asset {asset_id} (type: {asset.asset_type}) with model: {pinned_model or 'auto'}...")

    try:
        # 4. Routing regeneration based on asset type
        if asset.asset_type == "blog":
            sys_prompt = (
                "You are an elite technology blogger and technical writer. "
                "Write a high-quality, comprehensive long-form blog post (700-1000 words) based on the provided transcript and key highlights.\n\n"
                "Structuring Guidelines:\n"
                "- Create a catchy, high-conversion H1 title.\n"
                "- Divide the post into logical H2 and H3 sections to keep the reader engaged.\n"
                "- Integrate at least two exact, relevant quotes from the transcript inside blockquotes (> \"quote\") to establish credibility.\n"
                "- Use bullet points, bold key concepts, and formatted lists to make the article highly scannable.\n\n"
                "Writing & Style Rules:\n"
                "- Tone must be authoritative, clear, and direct. Avoid corporate speak or marketing hype.\n"
                "- DO NOT use generic AI intro/outro filler phrases (e.g., 'In today\'s fast-paced digital landscape', 'Let\'s dive in', 'In conclusion', 'It is important to remember'). Start directly with a compelling hook.\n"
                "- Ground all claims, statistics, and examples strictly in the transcript data. Do not make up external facts.\n"
                "- Focus on creating value-dense, deep-dive content."
            )
            user_content = f"Source Transcript:\n{full_text}\n\nKey Highlights to cover:\n{highlights_summary}"
            draft, model_used = await chat_completion([{"role": "user", "content": user_content}], system_prompt=sys_prompt, model_mode=model_mode, pinned_model=pinned_model)
            
            # Critic pass
            critic_model = os.getenv("CRITIC_MODEL", "google/gemini-3.1-flash-lite")
            critic_prompt = (
                "You are a strict, world-class Editorial Director and Fact-Checker.\n"
                "Audit and rewrite the provided draft to remove any signs of AI-generated fluff and ensure absolute accuracy.\n\n"
                "Strict Rules:\n"
                "1. ELIMINATE ALL FILLER: Scan for and delete generic assertions, cliché intros/outros, and buzzwords.\n"
                "2. GROUND IN DATA: Cross-reference every single claim, number, and concept in the draft with the source transcript. If the draft references anything not explicitly mentioned or supported by the transcript, delete or correct it.\n"
                "3. READABILITY & FLOW: Improve sentence structure. Make the voice sound human, active, and direct.\n"
                "4. FORMAT COMPLIANCE: Keep the native layout of the asset (H1/H2 markdown headers for blogs, numbered format for Twitter threads, spacing for LinkedIn).\n"
                "5. LENGTH AUDIT: If the draft is a Twitter thread, verify that every single numbered tweet remains strictly under 280 characters. Trim, split, or compress sentences if they exceed this limit.\n"
                "6. OUTPUT FORMAT: Respond ONLY with the finalized, audited, and rewritten draft of the asset. Do NOT include any intro/outro commentary, audit notes, change lists, explanations, or rejection alerts. The output must be a direct drop-in replacement for the asset."
            )
            content, _ = await chat_completion([{"role": "user", "content": f"Source Transcript:\n{full_text}\n\nDraft:\n{draft}"}], system_prompt=critic_prompt, model_mode="pinned", pinned_model=critic_model)
            
            asset.content = content
            asset.model_used = model_used
            asset.status = "done"

        elif asset.asset_type == "thread":
            sys_prompt = (
                "You are a master of social copywriting and Twitter/X storytelling. "
                "Write an engaging 5-8 tweet thread based on the provided transcript.\n\n"
                "Formatting & Structure:\n"
                "- Tweet 1: Hook. Must be a scroll-stopping statement, question, or counter-intuitive insight derived from the transcript. Add a thread indicator (🧵 or 'a thread:').\n"
                "- Tweets 2-7: Value-dense body tweets. Every tweet must offer a specific key takeaway, concrete example, or actionable step from the source data.\n"
                "- Tweet 8 (Final): Clear, punchy one-line summary takeaway.\n"
                "- Number each tweet clearly at the start (e.g., '1/', '2/', etc.).\n\n"
                "CRITICAL constraints:\n"
                "- Every single tweet MUST be strictly under 280 characters (including its number prefix). Double-check lengths.\n"
                "- Avoid generic AI summaries. Ensure each tweet reads like it was written by an active practitioner.\n"
                "- Use whitespace and linebreaks strategically within each tweet to make them highly readable."
            )
            user_content = f"Source Transcript:\n{full_text}\n\nKey Highlights to cover:\n{highlights_summary}"
            draft, model_used = await chat_completion([{"role": "user", "content": user_content}], system_prompt=sys_prompt, model_mode=model_mode, pinned_model=pinned_model)
            
            # Critic pass
            critic_model = os.getenv("CRITIC_MODEL", "google/gemini-3.1-flash-lite")
            critic_prompt = (
                "You are a strict, world-class Editorial Director and Fact-Checker.\n"
                "Audit and rewrite the provided draft to remove any signs of AI-generated fluff and ensure absolute accuracy.\n\n"
                "Strict Rules:\n"
                "1. ELIMINATE ALL FILLER: Scan for and delete generic assertions, cliché intros/outros, and buzzwords.\n"
                "2. GROUND IN DATA: Cross-reference every single claim, number, and concept in the draft with the source transcript. If the draft references anything not explicitly mentioned or supported by the transcript, delete or correct it.\n"
                "3. READABILITY & FLOW: Improve sentence structure. Make the voice sound human, active, and direct.\n"
                "4. FORMAT COMPLIANCE: Keep the native layout of the asset (H1/H2 markdown headers for blogs, numbered format for Twitter threads, spacing for LinkedIn).\n"
                "5. LENGTH AUDIT: If the draft is a Twitter thread, verify that every single numbered tweet remains strictly under 280 characters. Trim, split, or compress sentences if they exceed this limit.\n"
                "6. OUTPUT FORMAT: Respond ONLY with the finalized, audited, and rewritten draft of the asset. Do NOT include any intro/outro commentary, audit notes, change lists, explanations, or rejection alerts. The output must be a direct drop-in replacement for the asset."
            )
            content, _ = await chat_completion([{"role": "user", "content": f"Source Transcript:\n{full_text}\n\nDraft:\n{draft}"}], system_prompt=critic_prompt, model_mode="pinned", pinned_model=critic_model)
            
            asset.content = content
            asset.model_used = model_used
            asset.status = "done"

        elif asset.asset_type == "linkedin":
            sys_prompt = (
                "You are a thought leader on LinkedIn. "
                "Write a high-converting, professional LinkedIn post (200-300 words) based on the transcript.\n\n"
                "Guidelines:\n"
                "- Open with a powerful, single-line hook that creates curiosity or challenges status quo.\n"
                "- Structure the post with generous spacing (short paragraphs of 1-2 sentences) to ensure it is easy to scan on mobile devices.\n"
                "- Focus on a core narrative: 'Problem -> Actionable Insight from Transcript -> Concrete Lesson'.\n"
                "- Integrate a key quote from the transcript naturally.\n"
                "- End with an engaging question to drive comments, followed by 3-4 highly relevant hashtags.\n"
                "- Style: Professional, authentic, and direct. Avoid emojis overload or corporate buzzwords."
            )
            user_content = f"Source Transcript:\n{full_text}\n\nKey Highlights to cover:\n{highlights_summary}"
            draft, model_used = await chat_completion([{"role": "user", "content": user_content}], system_prompt=sys_prompt, model_mode=model_mode, pinned_model=pinned_model)
            
            # Critic pass
            critic_model = os.getenv("CRITIC_MODEL", "google/gemini-3.1-flash-lite")
            critic_prompt = (
                "You are a strict, world-class Editorial Director and Fact-Checker.\n"
                "Audit and rewrite the provided draft to remove any signs of AI-generated fluff and ensure absolute accuracy.\n\n"
                "Strict Rules:\n"
                "1. ELIMINATE ALL FILLER: Scan for and delete generic assertions, cliché intros/outros, and buzzwords.\n"
                "2. GROUND IN DATA: Cross-reference every single claim, number, and concept in the draft with the source transcript. If the draft references anything not explicitly mentioned or supported by the transcript, delete or correct it.\n"
                "3. READABILITY & FLOW: Improve sentence structure. Make the voice sound human, active, and direct.\n"
                "4. FORMAT COMPLIANCE: Keep the native layout of the asset (H1/H2 markdown headers for blogs, numbered format for Twitter threads, spacing for LinkedIn).\n"
                "5. LENGTH AUDIT: If the draft is a Twitter thread, verify that every single numbered tweet remains strictly under 280 characters. Trim, split, or compress sentences if they exceed this limit.\n"
                "6. OUTPUT FORMAT: Respond ONLY with the finalized, audited, and rewritten draft of the asset. Do NOT include any intro/outro commentary, audit notes, change lists, explanations, or rejection alerts. The output must be a direct drop-in replacement for the asset."
            )
            content, _ = await chat_completion([{"role": "user", "content": f"Source Transcript:\n{full_text}\n\nDraft:\n{draft}"}], system_prompt=critic_prompt, model_mode="pinned", pinned_model=critic_model)
            
            asset.content = content
            asset.model_used = model_used
            asset.status = "done"

        elif asset.asset_type == "clip":
            highlight = next((h for h in highlights_list if h.id == asset.related_highlight_id), None)
            if not highlight:
                raise HTTPException(status_code=400, detail="Related highlight quote not found.")
                
            sys_prompt = (
                "You are a viral short-form video editor (TikTok, Instagram Reels, YouTube Shorts). "
                "Given the key moment quote from the transcript, write:\n"
                "1. A high-engagement caption (1-2 sentences, punchy, curiosity-driven).\n"
                "2. A scroll-stopping on-screen text overlay instruction (max 5 words, uppercase, punchy, e.g., 'THE TRUTH ABOUT AI', '10X YOUR LEVERAGE').\n\n"
                "Make it modern, snappy, and optimized for social feeds."
            )
            draft, model_used = await chat_completion([{"role": "user", "content": f"Highlight: \"{highlight.quote}\""}], system_prompt=sys_prompt, model_mode=model_mode, pinned_model=pinned_model)
            
            # Critic pass
            critic_model = os.getenv("CRITIC_MODEL", "google/gemini-3.1-flash-lite")
            critic_prompt = (
                "You are a strict, world-class Editorial Director and Fact-Checker.\n"
                "Audit and rewrite the provided draft to remove any signs of AI-generated fluff and ensure absolute accuracy.\n\n"
                "Strict Rules:\n"
                "1. ELIMINATE ALL FILLER: Scan for and delete generic assertions, cliché intros/outros, and buzzwords.\n"
                "2. GROUND IN DATA: Cross-reference every single claim, number, and concept in the draft with the source transcript. If the draft references anything not explicitly mentioned or supported by the transcript, delete or correct it.\n"
                "3. READABILITY & FLOW: Improve sentence structure. Make the voice sound human, active, and direct.\n"
                "4. FORMAT COMPLIANCE: Keep the native layout of the asset (H1/H2 markdown headers for blogs, numbered format for Twitter threads, spacing for LinkedIn).\n"
                "5. LENGTH AUDIT: If the draft is a Twitter thread, verify that every single numbered tweet remains strictly under 280 characters. Trim, split, or compress sentences if they exceed this limit.\n"
                "6. OUTPUT FORMAT: Respond ONLY with the finalized, audited, and rewritten draft of the asset. Do NOT include any intro/outro commentary, audit notes, change lists, explanations, or rejection alerts. The output must be a direct drop-in replacement for the asset."
            )
            content, _ = await chat_completion([{"role": "user", "content": f"Source Transcript:\n{full_text}\n\nDraft:\n{draft}"}], system_prompt=critic_prompt, model_mode="pinned", pinned_model=critic_model)
            
            asset.content = content
            asset.model_used = model_used
            asset.status = "done"

        elif asset.asset_type == "thumbnail":
            # Determine visual title/quote
            desc_prompt = (
                "You are a senior creative director designing premium graphics for tech and business content.\n"
                "Based on the provided title/reference, generate a highly detailed, professional visual prompt for an image generation model (like FLUX.1).\n\n"
                "The prompt should specify:\n"
                "- Subject/Concept: An abstract, high-fidelity 3D composition representing the theme (e.g. geometric shapes, light fibers, data stream, network node).\n"
                "- Environment & Composition: Close-up, cinematic depth of field, atmospheric dark void.\n"
                "- Color Palette & Lighting: Dark mode aesthetic, neon glows (e.g., electric cyan, deep amber, or monochromatic slate), high-contrast refraction, and dramatic side lighting.\n"
                "- Style Keywords: Hyper-detailed, minimalist, modern tech aesthetic, 8k resolution, octane render style.\n\n"
                "Respond ONLY with the generated visual instruction prompt (approx 45-60 words). Do not include any intro, markdown, or quote wrappers."
            )
            title_ref = project.title
            if asset.related_highlight_id:
                highlight = next((h for h in highlights_list if h.id == asset.related_highlight_id), None)
                if highlight:
                    title_ref = highlight.quote
            
            desc, _ = await chat_completion([{"role": "user", "content": f"Reference: {title_ref}"}], system_prompt=desc_prompt, model_mode=model_mode, pinned_model=pinned_model)
            
            # Image gen
            label = f"regen_cover_{asset_id}"
            thumb_path, model_used = await generate_image(desc, id, label)
            
            asset.content = thumb_path
            asset.model_used = model_used
            asset.status = "done"

        await db.commit()
        await db.refresh(asset)
        return asset

    except Exception as e:
        logger.error(f"Asset regeneration failed: {e}")
        asset.status = "failed"
        await db.commit()
        raise HTTPException(status_code=500, detail=f"Regeneration failed: {str(e)}")
