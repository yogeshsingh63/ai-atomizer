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
from app.services.prompts import (
    BLOG_SYS, THREAD_SYS, LINKEDIN_SYS, CLIP_SYS, CRITIC_PROMPT, THUMB_DESC_PROMPT,
    SYSTEM_PROMPTS, get_asset_config, resolve_critic_model,
    build_generation_message, build_critic_message,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/projects", tags=["Assets"])


async def _regenerate_text_asset(
    asset: GeneratedAsset,
    system_prompt: str,
    asset_type: str,
    user_content: str,
    full_text: str,
    model_mode: str,
    pinned_model,
    custom_prompt,
) -> tuple:
    """Shared path for blog/thread/linkedin/clip regeneration: draft -> critic."""
    cfg = get_asset_config(asset_type)
    msg = build_generation_message(user_content, custom_prompt)
    draft, model_used = await chat_completion(
        [{"role": "user", "content": msg}],
        system_prompt=system_prompt,
        model_mode=model_mode,
        pinned_model=pinned_model,
        max_tokens=cfg["max_tokens"],
        temperature=cfg["temperature"],
    )

    # Critic pass (always pinned to the configured critic model)
    critic_model = resolve_critic_model()
    critic_cfg = get_asset_config("critic")
    critic_msg = build_critic_message(full_text, draft, asset_type, custom_prompt)
    content, _ = await chat_completion(
        [{"role": "user", "content": critic_msg}],
        system_prompt=CRITIC_PROMPT,
        model_mode="pinned",
        pinned_model=critic_model,
        max_tokens=critic_cfg["max_tokens"],
        temperature=critic_cfg["temperature"],
    )

    asset.content = content
    asset.model_used = model_used
    asset.status = "done"
    return asset


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
    Regenerates a single specific asset (e.g. blog post, thread) with optional
    pinned model + custom prompt overrides in the body.
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
    # model_mode is explicit if provided; otherwise infer from presence of a model.
    if payload.model_mode in ("auto", "pinned"):
        model_mode = payload.model_mode
    else:
        model_mode = "pinned" if payload.model else "auto"
    pinned_model = payload.model
    custom_prompt = payload.prompt

    logger.info(
        f"Regenerating asset {asset_id} (type: {asset.asset_type}) "
        f"with model: {pinned_model or 'auto'}, prompt: {'yes' if custom_prompt else 'no'}..."
    )

    try:
        # 4. Routing regeneration based on asset type
        if asset.asset_type in ("blog", "thread", "linkedin"):
            sys_prompt = SYSTEM_PROMPTS[asset.asset_type]
            user_content = f"Source Transcript:\n{full_text}\n\nKey Highlights to cover:\n{highlights_summary}"
            await _regenerate_text_asset(
                asset, sys_prompt, asset.asset_type, user_content, full_text,
                model_mode, pinned_model, custom_prompt,
            )

        elif asset.asset_type == "clip":
            highlight = next((h for h in highlights_list if h.id == asset.related_highlight_id), None)
            if not highlight:
                raise HTTPException(status_code=400, detail="Related highlight quote not found.")
            
            user_content = f"Highlight: \"{highlight.quote}\""
            await _regenerate_text_asset(
                asset, CLIP_SYS, "clip suggestion", user_content, full_text,
                model_mode, pinned_model, custom_prompt,
            )

        elif asset.asset_type == "thumbnail":
            desc_cfg = get_asset_config("thumbnail")
            title_ref = project.title
            if asset.related_highlight_id:
                highlight = next((h for h in highlights_list if h.id == asset.related_highlight_id), None)
                if highlight:
                    title_ref = highlight.quote
            
            desc, _ = await chat_completion(
                [{"role": "user", "content": f"Reference: {title_ref}"}],
                system_prompt=THUMB_DESC_PROMPT,
                model_mode=model_mode,
                pinned_model=pinned_model,
                max_tokens=desc_cfg["max_tokens"],
                temperature=desc_cfg["temperature"],
            )
            
            # Image gen
            label = f"regen_cover_{asset_id}"
            thumb_path, model_used = await generate_image(desc, id, label, quality="quality", title=project.title)
            
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
