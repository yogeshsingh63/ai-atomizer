import os
import json
import asyncio
import logging
import yt_dlp
from typing import Dict, List, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db import async_session
from app.models import Project, Transcript, Highlight, GeneratedAsset, Job
from app.services.llm import chat_completion
from app.services.transcribe import transcribe_audio

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

async def run_pipeline(project_id: int):
    """
    Background Task coordinating the entire content repurposing engine.
    Runs Ingest -> Transcribe -> Highlight Extract -> Content Write -> Critic Loop -> Image Gen.
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
                
                # Run download in worker thread
                loop = asyncio.get_event_loop()
                def download():
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        ydl.download([project.source_ref])
                
                await loop.run_in_executor(None, download)
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

            # --- STEP 3: Extract Highlights ---
            project.status = "extracting"
            await db.commit()
            await update_job_status(db, project_id, "Extracting Highlights", "running")
            
            highlights_prompt = (
                "You are an elite video editor and content strategist. You will be given a transcript with timestamps.\n"
                "Your task is to identify the 3 to 7 most compelling, high-impact, or surprising moments in the transcript—the kinds of hooks that make people stop scrolling on social feeds.\n\n"
                "For each highlight, you must extract:\n"
                "- start_seconds, end_seconds: Exact integer timestamps marking the start and end of this specific moment.\n"
                "- quote: The exact word-for-word quote from the transcript corresponding to these timestamps. Do not paraphrase.\n"
                "- reason: A brief, punchy, 1-sentence explanation of why this moment is notable (e.g. key takeaway, surprising claim, counter-intuitive insight).\n\n"
                "Respond ONLY with a valid JSON object matching this exact shape:\n"
                '{"highlights": [{"start_seconds": 0, "end_seconds": 0, "quote": "quote text", "reason": "reason description"}]}'
            )
            
            transcript_input = "\n".join([f"[{s['start_seconds']}s - {s['end_seconds']}s]: {s['text']}" for s in segments])
            messages = [{"role": "user", "content": f"Transcript:\n{transcript_input}"}]
            
            # Execute highlights LLM request
            logger.info("Requesting highlights extraction...")
            res_content, model_used = await chat_completion(
                messages,
                system_prompt=highlights_prompt,
                model_mode=project.default_model_mode,
                pinned_model=project.default_pinned_model,
                json_mode=True
            )
            
            # Parse highlights JSON safely with retry
            try:
                highlights_data = extract_and_parse_json(res_content)
            except json.JSONDecodeError:
                # Simple correction retry on decode fail
                logger.warning("Failed to decode highlights JSON. Retrying correction prompt...")
                correction_msg = [
                    {"role": "user", "content": f"Transcript:\n{transcript_input}"},
                    {"role": "assistant", "content": res_content},
                    {"role": "user", "content": "Your response was not valid JSON. Fix it and return ONLY the valid JSON object."}
                ]
                res_content, model_used = await chat_completion(
                    correction_msg,
                    system_prompt=highlights_prompt,
                    model_mode=project.default_model_mode,
                    pinned_model=project.default_pinned_model,
                    json_mode=True
                )
                highlights_data = extract_and_parse_json(res_content)

            # Store Highlights
            highlights_list = []
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
            # Fetch stored items with IDs
            await db.flush()
            await update_job_status(db, project_id, "Extracting Highlights", "completed", model_used=model_used)

            # --- STEP 4: Generate Content ---
            project.status = "generating"
            await db.commit()
            await update_job_status(db, project_id, "Generating Assets", "running")

            # Formulate text formats prompts
            blog_sys = (
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
            thread_sys = (
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
            linkedin_sys = (
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

            highlights_summary = "\n".join([f"- Quote: \"{h.quote}\" (Reason: {h.reason})" for h in highlights_list])
            user_content = f"Source Transcript:\n{full_text}\n\nKey Highlights to cover:\n{highlights_summary}"

            # Run LLM calls in parallel
            tasks = [
                chat_completion([{"role": "user", "content": user_content}], system_prompt=blog_sys, model_mode=project.default_model_mode, pinned_model=project.default_pinned_model),
                chat_completion([{"role": "user", "content": user_content}], system_prompt=thread_sys, model_mode=project.default_model_mode, pinned_model=project.default_pinned_model),
                chat_completion([{"role": "user", "content": user_content}], system_prompt=linkedin_sys, model_mode=project.default_model_mode, pinned_model=project.default_pinned_model)
            ]
            
            blog_res, thread_res, linkedin_res = await asyncio.gather(*tasks)

            # Generate clip caption recommendations
            clip_content_parts = []
            for idx, h in enumerate(highlights_list):
                clip_sys = (
                    "You are a viral short-form video editor (TikTok, Instagram Reels, YouTube Shorts). "
                    "Given the key moment quote from the transcript, write:\n"
                    "1. A high-engagement caption (1-2 sentences, punchy, curiosity-driven).\n"
                    "2. A scroll-stopping on-screen text overlay instruction (max 5 words, uppercase, punchy, e.g., 'THE TRUTH ABOUT AI', '10X YOUR LEVERAGE').\n\n"
                    "Make it modern, snappy, and optimized for social feeds."
                )
                clip_res, clip_model = await chat_completion(
                    [{"role": "user", "content": f"Moment Quote: \"{h.quote}\""}],
                    system_prompt=clip_sys,
                    model_mode=project.default_model_mode,
                    pinned_model=project.default_pinned_model
                )
                clip_content_parts.append((h.id, clip_res, clip_model))

            await update_job_status(db, project_id, "Generating Assets", "completed", model_used=blog_res[1])

            # --- STEP 4.5: Critic Rewrite Pass ---
            await update_job_status(db, project_id, "Running Critic Review", "running")
            critic_model = os.getenv("CRITIC_MODEL", "google/gemini-3.1-flash-lite")
            
            async def run_critic(draft: str, asset_type: str) -> str:
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
                user_msg = f"Source Transcript:\n{full_text}\n\nDraft Draft ({asset_type}):\n{draft}"
                # Pinned paid model call
                content, _ = await chat_completion(
                    [{"role": "user", "content": user_msg}],
                    system_prompt=critic_prompt,
                    model_mode="pinned",
                    pinned_model=critic_model
                )
                return content

            # Run drafts through critic pass
            critic_tasks = [
                run_critic(blog_res[0], "blog"),
                run_critic(thread_res[0], "thread"),
                run_critic(linkedin_res[0], "linkedin")
            ]
            blog_clean, thread_clean, linkedin_clean = await asyncio.gather(*critic_tasks)

            # Store text assets
            assets_to_create = [
                GeneratedAsset(project_id=project_id, asset_type="blog", content=blog_clean, model_used=blog_res[1], status="done"),
                GeneratedAsset(project_id=project_id, asset_type="thread", content=thread_clean, model_used=thread_res[1], status="done"),
                GeneratedAsset(project_id=project_id, asset_type="linkedin", content=linkedin_clean, model_used=linkedin_res[1], status="done")
            ]
            
            # Store clip assets
            for h_id, clip_text, clip_model in clip_content_parts:
                # Run clips through critic
                clip_clean = await run_critic(clip_text, "clip suggestion")
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
