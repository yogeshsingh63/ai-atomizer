import os
import re
import json
import asyncio
import logging
import yt_dlp
from typing import Dict, List, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db import async_session
from app.models import Project, Transcript, Highlight, GeneratedAsset, Job
from app.services.llm import chat_completion
from app.services.transcribe import transcribe_audio
from app.services.imagegen import generate_image
from app.services.prompts import (
    HIGHLIGHTS_PROMPT, BLOG_SYS, THREAD_SYS, LINKEDIN_SYS, CLIP_SYS, CRITIC_PROMPT, THUMB_DESC_PROMPT,
    SYSTEM_PROMPTS, get_asset_config, resolve_critic_model,
    build_generation_message, build_critic_message,
)

logger = logging.getLogger(__name__)

def extract_and_parse_json(text: str) -> Any:
    """Safely extracts and parses a JSON object or list from a potentially wrapped LLM response."""
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try extracting JSON object substring
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        json_str = text[first_brace:last_brace + 1]
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            pass

    # Try extracting JSON list substring
    first_bracket = text.find("[")
    last_bracket = text.rfind("]")
    if first_bracket != -1 and last_bracket != -1 and last_bracket > first_bracket:
        json_str = text[first_bracket:last_bracket + 1]
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            pass

    raise json.JSONDecodeError("Could not extract or parse valid JSON from text.", text, 0)


# ---------------------------------------------------------------------------
# Content validation helpers (quality gate beyond the critic pass)
# ---------------------------------------------------------------------------
_TWEET_SPLIT_RE = re.compile(r"(?m)^\s*\d+[/.)]\s*")

def _word_count(text: str) -> int:
    return len(text.split())

def _parse_tweets(thread_text: str) -> List[str]:
    """Splits a numbered thread into individual tweet bodies."""
    parts = _TWEET_SPLIT_RE.split(thread_text)
    return [p.strip() for p in parts if p.strip()]

def _blog_is_valid(content: str) -> bool:
    """Blog must reach the long-form depth target (reject truncated/short drafts).
    Target is 1200-1800 words; we gate at 1000 to allow minor variance from the
    model while still rejecting anything that is obviously a quick summary."""
    return _word_count(content) >= 1000

def _thread_is_valid(content: str) -> bool:
    """Every tweet in the thread must stay under 280 chars."""
    tweets = _parse_tweets(content)
    if not tweets:
        return True
    return all(len(t) <= 280 for t in tweets)


# In-memory queues for SSE events broadcasting
# Maps project_id -> list of subscriber asyncio.Queues
project_queues: Dict[int, List[asyncio.Queue]] = {}

def get_project_queue(project_id: int) -> asyncio.Queue:
    """Creates or returns an event queue for a subscriber."""
    q = asyncio.Queue()
    if project_id not in project_queues:
        project_queues[project_id] = []
    project_queues[project_id].append(q)
    return q

def remove_project_queue(project_id: int, queue: asyncio.Queue):
    """Removes a subscriber queue when SSE connection disconnects."""
    if project_id in project_queues:
        try:
            project_queues[project_id].remove(queue)
        except ValueError:
            pass
        if not project_queues[project_id]:
            del project_queues[project_id]

async def broadcast_event(project_id: int, event_data: Dict[str, Any]):
    """Pushes pipeline event state to all active client streams."""
    if project_id in project_queues:
        for q in project_queues[project_id]:
            await q.put(event_data)

async def update_job_status(
    db: AsyncSession,
    project_id: int,
    stage: str,
    status: str,
    error_message: str = None,
    model_used: str = None
):
    """Updates the Job stage in the DB and broadcasts progress state via SSE."""
    # Find or create Job
    result = await db.execute(
        select(Job).where(Job.project_id == project_id, Job.stage == stage)
    )
    job = result.scalars().first()
    if not job:
        job = Job(project_id=project_id, stage=stage)
        db.add(job)

    job.status = status
    job.error_message = error_message
    job.model_used = model_used
    await db.commit()

    # Broadcast update event
    event = {
        "stage": stage,
        "status": status,
        "model_used": model_used,
        "error_message": error_message
    }
    await broadcast_event(project_id, event)


async def _generate_with_reroll(
    user_content: str,
    system_prompt: str,
    asset_type: str,
    project: Project,
    custom_prompt: str = None,
) -> Tuple[str, str]:
    """
    Generates a draft with one validation re-roll if quality checks fail.
    """
    cfg = get_asset_config(asset_type)
    msg = build_generation_message(user_content, custom_prompt)
    content, model_used = await chat_completion(
        [{"role": "user", "content": msg}],
        system_prompt=system_prompt,
        model_mode=project.default_model_mode,
        pinned_model=project.default_pinned_model,
        max_tokens=cfg["max_tokens"],
        temperature=cfg["temperature"],
    )

    # Validation + single re-roll
    if asset_type == "blog" and not _blog_is_valid(content):
        logger.warning(f"Blog draft too short ({_word_count(content)} words). Re-rolling once...")
        retry_msg = build_generation_message(
            f"Your previous draft was too short. Write the FULL 1200-1800 word long-form blog post. "
            f"Include all 4-6 H2 sections, multiple blockquote quotes from the transcript, "
            f"a Key Takeaways section, and a The Bottom Line section. Do not summarize.\n\n{user_content}",
            custom_prompt,
        )
        content, model_used = await chat_completion(
            [{"role": "user", "content": retry_msg}],
            system_prompt=system_prompt,
            model_mode=project.default_model_mode,
            pinned_model=project.default_pinned_model,
            max_tokens=cfg["max_tokens"],
            temperature=cfg["temperature"],
        )
    elif asset_type == "thread" and not _thread_is_valid(content):
        logger.warning("Thread has tweets exceeding 280 chars. Re-rolling once...")
        retry_msg = build_generation_message(
            f"Your previous thread had tweets over 280 characters. Rewrite ensuring EVERY tweet is strictly under 280 characters.\n\n{user_content}",
            custom_prompt,
        )
        content, model_used = await chat_completion(
            [{"role": "user", "content": retry_msg}],
            system_prompt=system_prompt,
            model_mode=project.default_model_mode,
            pinned_model=project.default_pinned_model,
            max_tokens=cfg["max_tokens"],
            temperature=cfg["temperature"],
        )

    return content, model_used


async def run_pipeline(project_id: int):
    """
    Background Task coordinating the entire content repurposing engine.
    Runs Ingest -> Transcribe -> Highlight Extract -> Content Write -> Critic Loop.
    """
    logger.info(f"Initiating pipeline for project {project_id}...")
    
    # We open a dedicated DB session since this runs asynchronously in the background
    async with async_session() as db:
        # Load Project
        result = await db.execute(select(Project).where(Project.id == project_id))
        project = result.scalars().first()
        if not project:
            logger.error(f"Pipeline failed: Project {project_id} not found.")
            return

        upload_dir = os.path.join(os.getenv("UPLOAD_DIR", "./uploads"), str(project_id))
        os.makedirs(upload_dir, exist_ok=True)
        audio_path = os.path.join(upload_dir, "audio.mp3")

        try:
            # --- STEP 1: Ingest ---
            project.status = "transcribing" if project.source_type != "article_text" else "extracting"
            await db.commit()

            if project.source_type == "youtube_url":
                await update_job_status(db, project_id, "Ingesting Media", "running")
                logger.info(f"Downloading audio from YouTube URL: {project.source_ref}...")
                
                 # yt-dlp downloader configuration
                ydl_opts = {
                    "format": "bestaudio/best",
                    "outtmpl": os.path.join(upload_dir, "audio.%(ext)s"),
                    "postprocessors": [{
                        "key": "FFmpegExtractAudio",
                        "preferredcodec": "mp3",
                        "preferredquality": "192",
                    }],
                    "quiet": True,
                    "no_warnings": True
                }
                
                # Check for cookies file to prevent bot block on cloud platforms like Render
                cookie_candidates = [
                    os.getenv("YOUTUBE_COOKIES_FILE"),
                    "/data/cookies.txt",
                    "./cookies.txt",
                    "cookies.txt"
                ]
                for path in cookie_candidates:
                    if path and os.path.exists(path):
                        ydl_opts["cookiefile"] = path
                        logger.info(f"Using cookies file for yt-dlp: {path}")
                        break

                # Run download in worker thread (to_thread avoids deprecated get_event_loop)
                def download():
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        ydl.download([project.source_ref])
                
                await asyncio.to_thread(download)
                await update_job_status(db, project_id, "Ingesting Media", "completed")
            
            elif project.source_type == "upload":
                # File is uploaded directly by POST route to upload_dir/audio.mp3
                await update_job_status(db, project_id, "Ingesting Media", "completed")

            # --- STEP 2: Transcribe ---
            full_text = ""
            segments = []
            
            if project.source_type != "article_text":
                await update_job_status(db, project_id, "Transcribing Audio", "running")
                
                # Run transcription (local or cloud)
                full_text, segments = await transcribe_audio(audio_path)
                
                # Save Transcript
                transcript = Transcript(
                    project_id=project_id,
                    full_text=full_text,
                    segments=segments
                )
                db.add(transcript)
                await db.commit()
                await update_job_status(db, project_id, "Transcribing Audio", "completed")
            else:
                # Text input is the transcript directly
                full_text = project.source_ref
                segments = [{"start_seconds": 0.0, "end_seconds": 0.0, "text": full_text}]
                transcript = Transcript(
                    project_id=project_id,
                    full_text=full_text,
                    segments=segments
                )
                db.add(transcript)
                await db.commit()

            # --- STEP 3: Extract Highlights (only if clips are selected) ---
            # Parse target_assets early to decide if we need highlights at all.
            # Highlights are only used for clip generation — skip the LLM call
            # entirely if clips aren't selected, saving ~5-10s per project.
            try:
                target = json.loads(project.target_assets) if project.target_assets else []
            except (json.JSONDecodeError, TypeError):
                target = []
            ALL_ASSETS = {"blog", "thread", "linkedin", "clip"}
            target_set = set(target) & ALL_ASSETS
            if not target_set:
                target_set = ALL_ASSETS  # default: generate everything
            logger.info(f"Project {project_id} target assets: {sorted(target_set)}")

            highlights_list = []
            if "clip" in target_set:
                project.status = "extracting"
                await db.commit()
                await update_job_status(db, project_id, "Extracting Highlights", "running")
                
                transcript_input = "\n".join([f"[{s['start_seconds']}s - {s['end_seconds']}s]: {s['text']}" for s in segments])
                messages = [{"role": "user", "content": f"Transcript:\n{transcript_input}"}]
                
                hcfg = get_asset_config("highlights")
                logger.info("Requesting highlights extraction...")
                res_content, model_used = await chat_completion(
                    messages,
                    system_prompt=HIGHLIGHTS_PROMPT,
                    model_mode=project.default_model_mode,
                    pinned_model=project.default_pinned_model,
                    json_mode=True,
                    max_tokens=hcfg["max_tokens"],
                    temperature=hcfg["temperature"],
                )
                
                try:
                    highlights_data = extract_and_parse_json(res_content)
                except json.JSONDecodeError:
                    logger.warning("Failed to decode highlights JSON. Retrying correction prompt...")
                    correction_msg = [
                        {"role": "user", "content": f"Transcript:\n{transcript_input}"},
                        {"role": "assistant", "content": res_content},
                        {"role": "user", "content": "Your response was not valid JSON. Fix it and return ONLY the valid JSON object."}
                    ]
                    res_content, model_used = await chat_completion(
                        correction_msg,
                        system_prompt=HIGHLIGHTS_PROMPT,
                        model_mode=project.default_model_mode,
                        pinned_model=project.default_pinned_model,
                        json_mode=True,
                        max_tokens=hcfg["max_tokens"],
                        temperature=hcfg["temperature"],
                    )
                    highlights_data = extract_and_parse_json(res_content)

                # Store Highlights
                for h in highlights_data.get("highlights", []):
                    highlight = Highlight(
                        project_id=project_id,
                        start_seconds=int(h.get("start_seconds", 0)),
                        end_seconds=int(h.get("end_seconds", 0)),
                        quote=h.get("quote", ""),
                        reason=h.get("reason", "")
                    )
                    db.add(highlight)
                    highlights_list.append(highlight)
                
                await db.commit()
                await db.flush()
                await update_job_status(db, project_id, "Extracting Highlights", "completed", model_used=model_used)
            else:
                logger.info(f"Project {project_id}: skipping highlights extraction (clips not selected)")

            # --- STEP 4: Generate Content ---
            project.status = "generating"
            await db.commit()
            await update_job_status(db, project_id, "Generating Assets", "running")

            highlights_summary = "\n".join([f"- Quote: \"{h.quote}\" (Reason: {h.reason})" for h in highlights_list])
            user_content = f"Source Transcript:\n{full_text}\n\nKey Highlights to cover:\n{highlights_summary}"

            # Build the parallel generation tasks only for selected assets.
            text_tasks = []
            task_keys = []  # track which asset each task result maps to
            if "blog" in target_set:
                text_tasks.append(_generate_with_reroll(user_content, BLOG_SYS, "blog", project))
                task_keys.append("blog")
            if "thread" in target_set:
                text_tasks.append(_generate_with_reroll(user_content, THREAD_SYS, "thread", project))
                task_keys.append("thread")
            if "linkedin" in target_set:
                text_tasks.append(_generate_with_reroll(user_content, LINKEDIN_SYS, "linkedin", project))
                task_keys.append("linkedin")

            text_results = await asyncio.gather(*text_tasks) if text_tasks else []
            results_by_type = {key: res for key, res in zip(task_keys, text_results)}
            blog_res = results_by_type.get("blog")
            thread_res = results_by_type.get("thread")
            linkedin_res = results_by_type.get("linkedin")

            # Generate clip captions in parallel (only if clips are selected)
            clip_content_parts: List[Tuple[int, str, str]] = []
            if "clip" in target_set and highlights_list:
                async def gen_clip(h: Highlight) -> Tuple[int, str, str]:
                    clip_cfg = get_asset_config("clip")
                    clip_msg = build_generation_message(f"Moment Quote: \"{h.quote}\"", None)
                    clip_res, clip_model = await chat_completion(
                        [{"role": "user", "content": clip_msg}],
                        system_prompt=CLIP_SYS,
                        model_mode=project.default_model_mode,
                        pinned_model=project.default_pinned_model,
                        max_tokens=clip_cfg["max_tokens"],
                        temperature=clip_cfg["temperature"],
                    )
                    return h.id, clip_res, clip_model

                clip_content_parts = await asyncio.gather(*[gen_clip(h) for h in highlights_list])

            assets_model_for_status = blog_res or thread_res or linkedin_res
            await update_job_status(db, project_id, "Generating Assets", "completed", model_used=assets_model_for_status[1] if assets_model_for_status else None)

            # --- STEP 4.5: Critic Rewrite Pass (+ parallel blog cover thumbnail) ---
            await update_job_status(db, project_id, "Running Critic Review", "running")
            critic_model = resolve_critic_model()
            critic_cfg = get_asset_config("critic")
            
            async def run_critic(draft: str, asset_type: str, custom_prompt: str = None) -> str:
                user_msg = build_critic_message(full_text, draft, asset_type, custom_prompt)
                content, _ = await chat_completion(
                    [{"role": "user", "content": user_msg}],
                    system_prompt=CRITIC_PROMPT,
                    model_mode="pinned",
                    pinned_model=critic_model,
                    max_tokens=critic_cfg["max_tokens"],
                    temperature=critic_cfg["temperature"],
                )
                return content

            async def generate_blog_cover() -> Tuple[str, str]:
                """Generates the blog cover thumbnail. Never raises — has its own
                fallback chain ending in a gradient placeholder. Runs in parallel
                with the critic pass so it adds near-zero wall-clock time."""
                try:
                    desc_cfg = get_asset_config("thumbnail")
                    desc, _ = await chat_completion(
                        [{"role": "user", "content": f"Reference: {project.title}"}],
                        system_prompt=THUMB_DESC_PROMPT,
                        model_mode=project.default_model_mode,
                        pinned_model=project.default_pinned_model,
                        max_tokens=desc_cfg["max_tokens"],
                        temperature=desc_cfg["temperature"],
                    )
                    thumb_path, thumb_model = await generate_image(
                        desc, project_id, "blog_cover", quality="fast", title=project.title
                    )
                    return thumb_path, thumb_model
                except Exception as e:
                    logger.warning(f"Blog cover generation failed (non-fatal): {e}")
                    return None, None

            # Run selected critics + blog cover all in parallel
            parallel_tasks = []
            parallel_keys = []
            if blog_res:
                parallel_tasks.append(run_critic(blog_res[0], "blog"))
                parallel_keys.append("blog")
            if thread_res:
                parallel_tasks.append(run_critic(thread_res[0], "thread"))
                parallel_keys.append("thread")
            if linkedin_res:
                parallel_tasks.append(run_critic(linkedin_res[0], "linkedin"))
                parallel_keys.append("linkedin")
            for (_, clip_text, _) in clip_content_parts:
                parallel_tasks.append(run_critic(clip_text, "clip suggestion"))
                parallel_keys.append("clip")
            # Blog cover only if blog was generated
            if blog_res:
                parallel_tasks.append(generate_blog_cover())
                parallel_keys.append("cover")

            parallel_results = await asyncio.gather(*parallel_tasks) if parallel_tasks else []
            result_map = {key: res for key, res in zip(parallel_keys, parallel_results)}
            blog_clean = result_map.get("blog")
            thread_clean = result_map.get("thread")
            linkedin_clean = result_map.get("linkedin")
            clip_critics = [result_map[k] for k in parallel_keys if k == "clip"]
            cover_path, cover_model = result_map.get("cover", (None, None))

            # Store text assets (only those that were generated)
            assets_to_create = []
            if blog_clean and blog_res:
                assets_to_create.append(
                    GeneratedAsset(project_id=project_id, asset_type="blog", content=blog_clean, model_used=blog_res[1], status="done")
                )
            if thread_clean and thread_res:
                assets_to_create.append(
                    GeneratedAsset(project_id=project_id, asset_type="thread", content=thread_clean, model_used=thread_res[1], status="done")
                )
            if linkedin_clean and linkedin_res:
                assets_to_create.append(
                    GeneratedAsset(project_id=project_id, asset_type="linkedin", content=linkedin_clean, model_used=linkedin_res[1], status="done")
                )
            
            # Store blog cover thumbnail (if generation succeeded)
            if cover_path:
                assets_to_create.append(
                    GeneratedAsset(
                        project_id=project_id,
                        asset_type="thumbnail",
                        content=cover_path,
                        related_highlight_id=None,
                        model_used=cover_model or "unknown",
                        status="done"
                    )
                )
                logger.info(f"Blog cover thumbnail stored: {cover_path} ({cover_model})")
            
            # Store clip assets (model_used from the draft generation, not the critic)
            for (h_id, _clip_text, clip_model), clip_clean in zip(clip_content_parts, clip_critics):
                assets_to_create.append(
                    GeneratedAsset(
                        project_id=project_id,
                        asset_type="clip",
                        content=clip_clean,
                        related_highlight_id=h_id,
                        model_used=clip_model,
                        status="done"
                    )
                )

            for asset in assets_to_create:
                db.add(asset)
            
            # Mark Project Completed in database first, to ensure no client race condition
            project.status = "done"
            await db.commit()

            # Broadcast final completion event
            await update_job_status(db, project_id, "Running Critic Review", "completed", model_used=critic_model)
            logger.info(f"Pipeline completed successfully for project {project_id}.")

        except Exception as e:
            logger.error(f"Pipeline execution failed for project {project_id}: {e}", exc_info=True)
            project.status = "failed"
            await db.commit()
            
            # Find active stage and mark failed
            active_job_result = await db.execute(
                select(Job).where(Job.project_id == project_id, Job.status == "running")
            )
            active_job = active_job_result.scalars().first()
            if active_job:
                await update_job_status(db, project_id, active_job.stage, "failed", error_message=str(e))
            else:
                await update_job_status(db, project_id, "Ingesting Media", "failed", error_message=str(e))
