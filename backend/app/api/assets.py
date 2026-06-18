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
            sys_prompt = "Write a long-form blog post (600-900 words) based on this transcript. Include an H1 title and H2 section headers. Do not use generic filler phrases. Write in a direct, no-fluff tone."
            user_content = f"Source Transcript:\n{full_text}\n\nKey Highlights to cover:\n{highlights_summary}"
            draft, model_used = await chat_completion([{"role": "user", "content": user_content}], system_prompt=sys_prompt, model_mode=model_mode, pinned_model=pinned_model)
            
            # Critic pass
            critic_model = os.getenv("CRITIC_MODEL", "google/gemini-2.5-pro")
            critic_prompt = "You are a strict editorial director. Audit and rewrite this draft to make it sound human, removing generic filler and verifying claims against the source transcript."
            content, _ = await chat_completion([{"role": "user", "content": f"Source Transcript:\n{full_text}\n\nDraft:\n{draft}"}], system_prompt=critic_prompt, model_mode="pinned", pinned_model=critic_model)
            
            asset.content = content
            asset.model_used = model_used
            asset.status = "done"

        elif asset.asset_type == "thread":
            sys_prompt = "Write a 5-8 tweet thread based on this transcript. Tweet 1 must be a hook. End with a one-line takeaway. Number each tweet (1/, 2/, etc.)."
            user_content = f"Source Transcript:\n{full_text}\n\nKey Highlights to cover:\n{highlights_summary}"
            draft, model_used = await chat_completion([{"role": "user", "content": user_content}], system_prompt=sys_prompt, model_mode=model_mode, pinned_model=pinned_model)
            
            # Critic pass
            critic_model = os.getenv("CRITIC_MODEL", "google/gemini-2.5-pro")
            critic_prompt = "You are a strict editorial director. Audit and rewrite this tweet thread to make it sound human, removing filler and verifying facts."
            content, _ = await chat_completion([{"role": "user", "content": f"Source Transcript:\n{full_text}\n\nDraft:\n{draft}"}], system_prompt=critic_prompt, model_mode="pinned", pinned_model=critic_model)
            
            asset.content = content
            asset.model_used = model_used
            asset.status = "done"

        elif asset.asset_type == "linkedin":
            sys_prompt = "Write a LinkedIn post (150-250 words) based on this transcript. Open with a one-line hook. Professional but not corporate-speak tone. End with one concrete takeaway."
            user_content = f"Source Transcript:\n{full_text}\n\nKey Highlights to cover:\n{highlights_summary}"
            draft, model_used = await chat_completion([{"role": "user", "content": user_content}], system_prompt=sys_prompt, model_mode=model_mode, pinned_model=pinned_model)
            
            # Critic pass
            critic_model = os.getenv("CRITIC_MODEL", "google/gemini-2.5-pro")
            critic_prompt = "You are a strict editorial director. Audit and rewrite this LinkedIn post to make it sound human."
            content, _ = await chat_completion([{"role": "user", "content": f"Source Transcript:\n{full_text}\n\nDraft:\n{draft}"}], system_prompt=critic_prompt, model_mode="pinned", pinned_model=critic_model)
            
            asset.content = content
            asset.model_used = model_used
            asset.status = "done"

        elif asset.asset_type == "clip":
            highlight = next((h for h in highlights_list if h.id == asset.related_highlight_id), None)
            if not highlight:
                raise HTTPException(status_code=400, detail="Related highlight quote not found.")
                
            sys_prompt = "Write a short caption (1 sentence, platform style) and an on-screen text overlay instruction (max 6 words, punchy) representing this highlight quote."
            draft, model_used = await chat_completion([{"role": "user", "content": f"Highlight: \"{highlight.quote}\""}], system_prompt=sys_prompt, model_mode=model_mode, pinned_model=pinned_model)
            
            # Critic pass
            critic_model = os.getenv("CRITIC_MODEL", "google/gemini-2.5-pro")
            critic_prompt = "Audit and rewrite this clip caption to make it sound human."
            content, _ = await chat_completion([{"role": "user", "content": f"Source Transcript:\n{full_text}\n\nDraft:\n{draft}"}], system_prompt=critic_prompt, model_mode="pinned", pinned_model=critic_model)
            
            asset.content = content
            asset.model_used = model_used
            asset.status = "done"

        elif asset.asset_type == "thumbnail":
            # Determine visual title/quote
            desc_prompt = "Generate a concrete, abstract visual scene description representing this title. Respond only with the visual instruction prompt, max 40 words."
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
