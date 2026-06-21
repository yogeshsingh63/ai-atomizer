import os
import json
import jwt
import asyncio
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File, Form, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db import get_db
from app.models import Project, User, Highlight, Transcript, GeneratedAsset
from app.schemas import ProjectResponse, HighlightResponse, ProjectCreate
from app.services.auth import get_current_user, JWT_SECRET, JWT_ALGORITHM
from app.pipeline import run_pipeline, get_project_queue, remove_project_queue

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/projects", tags=["Projects"])

@router.post("", response_model=dict)
async def create_new_project(
    background_tasks: BackgroundTasks,
    title: Optional[str] = Form(None),
    source_type: str = Form(...),  # youtube_url | upload | article_text
    source_ref: Optional[str] = Form(None),
    default_model_mode: str = Form("auto"),
    default_pinned_model: Optional[str] = Form(None),
    target_assets: Optional[str] = Form(None),  # JSON array string
    puter_user_id: Optional[str] = Form(None),  # Puter.js user UUID
    pipeline_mode: str = Form("backend"),  # "backend" | "puter"
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a new content repurposing project.
    Kicks off the transcription & generation pipeline in a background thread.
    Supports form fields (multipart) to handle raw audio/video uploads.
    """
    # 1. Validation
    if source_type == "upload" and not file:
        raise HTTPException(status_code=400, detail="Missing upload file.")
    if source_type != "upload" and not source_ref:
        raise HTTPException(status_code=400, detail="Missing source reference (URL or text).")

    # 2. Setup title
    project_title = title
    if not project_title:
        if source_type == "youtube_url":
            project_title = "YouTube Video Atomizer"
        elif source_type == "upload":
            project_title = file.filename
        else:
            project_title = "Pasted Text Repurpose"

    # 3. Create Project record
    project = Project(
        title=project_title,
        source_type=source_type,
        source_ref=source_ref or "",
        status="pending",
        default_model_mode=default_model_mode,
        default_pinned_model=default_pinned_model,
        target_assets=target_assets,
        puter_user_id=puter_user_id,
        pipeline_mode=pipeline_mode,
        user_id=current_user.id
    )
    
    db.add(project)
    await db.commit()
    await db.refresh(project)

    # 4. Handle direct file uploads
    if source_type == "upload" and file:
        upload_dir = os.path.join(os.getenv("UPLOAD_DIR", "./uploads"), str(project.id))
        os.makedirs(upload_dir, exist_ok=True)
        audio_path = os.path.join(upload_dir, "audio.mp3")
        
        try:
            # Write file upload in chunks
            contents = await file.read()
            with open(audio_path, "wb") as f:
                f.write(contents)
            project.source_ref = file.filename
            await db.commit()
        except Exception as e:
            logger.error(f"Failed to save uploaded file: {e}")
            project.status = "failed"
            await db.commit()
            raise HTTPException(status_code=500, detail="Failed to save uploaded file.")

    # 5. Kick off backend pipeline task (only for guest/backend mode).
    # Puter.js users run the pipeline in the browser via puter.ai.*,
    # then save results via POST /{id}/save-results.
    if pipeline_mode != "puter":
        background_tasks.add_task(run_pipeline, project.id)
    else:
        # Puter mode: backend still does free, non-LLM work so the browser
        # pipeline has everything it needs.
        if source_type == "youtube_url":
            # Download the YouTube audio (no AI cost — just yt-dlp) so the
            # browser can fetch it and transcribe via puter.ai.speech2txt().
            background_tasks.add_task(
                _download_youtube_audio_for_puter, project.id, source_ref
            )
        elif source_type == "upload":
            # File was already saved in step 4. Mark as ready immediately.
            project.status = "audio_ready"
            await db.commit()
        elif source_type == "article_text":
            # Text source — no audio needed.
            project.status = "audio_ready"
            await db.commit()

    return {"project_id": project.id}


async def _download_youtube_audio_for_puter(project_id: int, url: str):
    """Download YouTube audio for a Puter-mode project. No AI cost — just
    yt-dlp + ffmpeg. Sets project.status to 'audio_ready' on success or
    'failed' on error so the processing page knows when to proceed."""
    import yt_dlp
    from app.db import async_session
    from app.models import Project
    from sqlalchemy.future import select

    upload_dir = os.path.join(os.getenv("UPLOAD_DIR", "./uploads"), str(project_id))
    os.makedirs(upload_dir, exist_ok=True)
    audio_path = os.path.join(upload_dir, "audio.mp3")

    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": os.path.join(upload_dir, "audio.%(ext)s"),
        "postprocessors": [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "192",
        }],
        "quiet": True,
        "no_warnings": True,
    }

    try:
        def _download():
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])

        await asyncio.to_thread(_download)

        # Mark as ready
        async with async_session() as db:
            result = await db.execute(select(Project).where(Project.id == project_id))
            project = result.scalars().first()
            if project:
                project.status = "audio_ready"
                await db.commit()
        logger.info(f"YouTube audio ready for Puter project {project_id}")
    except Exception as e:
        logger.error(f"YouTube audio download failed for project {project_id}: {e}")
        async with async_session() as db:
            result = await db.execute(select(Project).where(Project.id == project_id))
            project = result.scalars().first()
            if project:
                project.status = "failed"
                await db.commit()

@router.get("", response_model=List[ProjectResponse])
async def list_user_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves all projects owned by the authenticated user."""
    result = await db.execute(
        select(Project)
        .where(Project.user_id == current_user.id)
        .order_by(Project.created_at.desc())
    )
    projects = result.scalars().all()
    return projects

@router.get("/{id}", response_model=ProjectResponse)
async def get_project_details(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves project metadata details."""
    result = await db.execute(select(Project).where(Project.id == id))
    project = result.scalars().first()
    
    if not project or project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Project not found.")
    return project

@router.get("/{id}/highlights", response_model=List[HighlightResponse])
async def get_project_highlights(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves key moments/highlights extracted from source content."""
    # Auth validation
    result = await db.execute(select(Project).where(Project.id == id))
    project = result.scalars().first()
    if not project or project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Project not found.")

    highlights_result = await db.execute(
        select(Highlight).where(Highlight.project_id == id)
    )
    return highlights_result.scalars().all()


@router.get("/{id}/transcript")
async def get_project_transcript(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Returns the transcript's full_text (for Puter client-side regen)."""
    result = await db.execute(select(Project).where(Project.id == id))
    project = result.scalars().first()
    if not project or project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Project not found.")

    from app.models import Transcript as TranscriptModel
    t_result = await db.execute(
        select(TranscriptModel).where(TranscriptModel.project_id == id)
    )
    transcript = t_result.scalars().first()
    if not transcript:
        return {"full_text": "", "segments": []}
    return {"full_text": transcript.full_text, "segments": transcript.segments or []}

@router.get("/{id}/events")
async def get_project_events_stream(
    id: int,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Server-Sent Events (SSE) progress update stream.
    Authenticates manually using token query parameter (since standard browser EventSource doesn't support headers).
    """
    # 1. Manual JWT Token verification
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id_str = payload.get("sub")
        if not user_id_str:
            raise HTTPException(status_code=401, detail="Invalid token details.")
        user_id = int(user_id_str)
    except Exception:
        raise HTTPException(status_code=401, detail="Unauthorized access token.")

    # 2. Validate Project exists and belongs to the user
    result = await db.execute(select(Project).where(Project.id == id))
    project = result.scalars().first()
    if not project or project.user_id != user_id:
        raise HTTPException(status_code=404, detail="Project not found.")

    # 3. Stream generator
    async def event_generator():
        q = get_project_queue(id)
        try:
            while True:
                # Keep-alive check or get event
                try:
                    event_data = await asyncio.wait_for(q.get(), timeout=15.0)
                    yield f"data: {json.dumps(event_data)}\n\n"
                    # Stop if it reached final stages
                    if event_data.get("stage") == "Running Critic Review" and event_data.get("status") in ["completed", "failed"]:
                        break
                except asyncio.TimeoutError:
                    # Send empty comment to prevent browser timeout
                    yield ": keep-alive\n\n"
        finally:
            remove_project_queue(id, q)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# --- Client-side pipeline save endpoint (Puter.js users) ---
@router.post("/{id}/save-results", response_model=dict)
async def save_client_pipeline_results(
    id: int,
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Saves the results of a client-side pipeline run (Puter.js users).
    Accepts the transcript, highlights, and assets produced by the
    browser-side pipeline and persists them to the DB.
    """
    # Validate project ownership
    result = await db.execute(select(Project).where(Project.id == id))
    project = result.scalars().first()
    if not project or project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Project not found.")

    # Save transcript
    transcript_data = payload.get("transcript", {})
    if transcript_data:
        transcript = Transcript(
            project_id=id,
            full_text=transcript_data.get("full_text", ""),
            segments=transcript_data.get("segments", []),
        )
        db.add(transcript)

    # Save highlights
    highlight_id_map = {}
    for h in payload.get("highlights", []):
        highlight = Highlight(
            project_id=id,
            start_seconds=int(h.get("start_seconds", 0)),
            end_seconds=int(h.get("end_seconds", 0)),
            quote=h.get("quote", ""),
            reason=h.get("reason", ""),
        )
        db.add(highlight)
        await db.flush()
        highlight_id_map[h.get("id", 0)] = highlight.id

    # Save assets
    for a in payload.get("assets", []):
        related_id = a.get("related_highlight_id")
        # Map client-side highlight IDs to DB IDs
        if related_id is not None and related_id in highlight_id_map:
            related_id = highlight_id_map[related_id]
        asset = GeneratedAsset(
            project_id=id,
            asset_type=a.get("asset_type", "blog"),
            content=a.get("content", ""),
            related_highlight_id=related_id,
            model_used=a.get("model_used", "puter"),
            status="done",
        )
        db.add(asset)

    # Link project to Puter user if provided
    puter_id = payload.get("puter_user_id")
    if puter_id:
        project.puter_user_id = puter_id

    # Mark project as done
    project.status = "done"
    await db.commit()

    return {"status": "saved", "project_id": id}
