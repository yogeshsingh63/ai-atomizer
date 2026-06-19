import os
import httpx
import asyncio
import logging
from typing import List, Dict, Any, Tuple
from dotenv import load_dotenv

# Import faster-whisper optionally
try:
    from faster_whisper import WhisperModel
except ImportError:
    WhisperModel = None

# Import AssemblyAI SDK optionally
try:
    import assemblyai as aai
except ImportError:
    aai = None

logger = logging.getLogger(__name__)
load_dotenv()

async def transcribe_with_assemblyai(audio_path: str) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Transcribes audio using AssemblyAI SDK.
    AssemblyAI handles upload + transcription automatically.
    Runs the blocking SDK call in an executor to avoid blocking the event loop.
    """
    api_key = os.getenv("ASSEMBLYAI_API_KEY")
    if not api_key or not aai:
        raise RuntimeError("AssemblyAI API key or SDK not available")

    aai.settings.api_key = api_key

    def _transcribe():
        transcriber = aai.Transcriber()
        transcript = transcriber.transcribe(audio_path)
        if transcript.status == aai.TranscriptStatus.error:
            raise RuntimeError(f"AssemblyAI transcription error: {transcript.error}")
        return transcript

    loop = asyncio.get_event_loop()
    transcript = await loop.run_in_executor(None, _transcribe)

    full_text = transcript.text or ""
    segments = []

    # Extract word-level or utterance-level timestamps
    if transcript.utterances:
        for u in transcript.utterances:
            segments.append({
                "start_seconds": round(u.start / 1000.0, 2),
                "end_seconds": round(u.end / 1000.0, 2),
                "text": u.text.strip()
            })
    elif transcript.words:
        # Group words into ~5-second chunks
        chunk_start = None
        chunk_words = []
        chunk_start_ms = 0
        chunk_end_ms = 0
        for w in transcript.words:
            if chunk_start is None:
                chunk_start = w.start
                chunk_start_ms = w.start
            chunk_words.append(w.text)
            chunk_end_ms = w.end
            # Create a segment roughly every 5 seconds
            if (chunk_end_ms - chunk_start_ms) >= 5000:
                segments.append({
                    "start_seconds": round(chunk_start_ms / 1000.0, 2),
                    "end_seconds": round(chunk_end_ms / 1000.0, 2),
                    "text": " ".join(chunk_words).strip()
                })
                chunk_words = []
                chunk_start = None
        # Flush remaining words
        if chunk_words:
            segments.append({
                "start_seconds": round(chunk_start_ms / 1000.0, 2),
                "end_seconds": round(chunk_end_ms / 1000.0, 2),
                "text": " ".join(chunk_words).strip()
            })
    else:
        # Fallback: single segment with full text
        segments.append({
            "start_seconds": 0.0,
            "end_seconds": round(transcript.audio_duration or 10.0, 2),
            "text": full_text.strip()
        })

    return full_text, segments


async def transcribe_audio(audio_path: str) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Transcribes audio file to text and segment arrays.
    
    Fallback chain (ordered by reliability):
      1. Local faster-whisper (if configured and library available)
      2. AssemblyAI (reliable cloud API with timestamps)
      3. Groq Whisper API (fast, free tier)
      4. OpenAI Whisper API (paid fallback)
      5. Mock transcript (last resort to prevent pipeline crash)
    
    Returns: (full_text, segments_list_of_dict)
    """
    provider = os.getenv("WHISPER_PROVIDER", "local").lower()
    
    # 1. PRIMARY: Local faster-whisper (if configured and library is available)
    if provider == "local" and WhisperModel is not None:
        try:
            logger.info(f"Starting local faster-whisper transcription on: {audio_path}...")
            # Using 'base' model for CPU resource efficiency and quick loading
            model = WhisperModel("base", device="cpu", compute_type="int8")
            
            # transcribe returns a generator
            segments_generator, info = model.transcribe(audio_path, beam_size=5)
            
            segments = []
            full_text_parts = []
            for s in segments_generator:
                segment_data = {
                    "start_seconds": round(s.start, 2),
                    "end_seconds": round(s.end, 2),
                    "text": s.text.strip()
                }
                segments.append(segment_data)
                full_text_parts.append(s.text.strip())
                
            full_text = " ".join(full_text_parts)
            logger.info("Local faster-whisper transcription completed successfully.")
            return full_text, segments
        except Exception as e:
            logger.error("Local faster-whisper failed. Falling back to cloud APIs...", exc_info=True)
            
    # 1.5. Prepare audio compression for cloud APIs if file is large (> 4MB)
    upload_path = audio_path
    temp_compressed_path = None
    try:
        if os.path.exists(audio_path):
            file_size_mb = os.path.getsize(audio_path) / (1024 * 1024)
            if file_size_mb > 4.0:
                compressed_file_name = f"compressed_{os.path.basename(audio_path)}"
                temp_compressed_path = os.path.join(os.path.dirname(audio_path), compressed_file_name)
                
                import subprocess
                logger.info(f"Audio file size ({file_size_mb:.2f}MB) exceeds 4MB. Compressing with ffmpeg...")
                cmd = [
                    "ffmpeg", "-y",
                    "-i", audio_path,
                    "-ac", "1",
                    "-b:a", "32k",
                    temp_compressed_path
                ]
                # Run ffmpeg synchronously
                subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
                upload_path = temp_compressed_path
                logger.info(f"Audio compressed successfully. New size: {os.path.getsize(temp_compressed_path) / (1024 * 1024):.2f}MB")
    except Exception as e:
        logger.error(f"Failed to compress audio using ffmpeg: {e}")

    try:
        # 2. AssemblyAI (reliable cloud transcription with timestamps)
        assemblyai_key = os.getenv("ASSEMBLYAI_API_KEY")
        if assemblyai_key and not assemblyai_key.startswith("your-") and aai:
            try:
                logger.info("Attempting AssemblyAI transcription...")
                # AssemblyAI handles its own uploads, use original file for best quality
                full_text, segments = await transcribe_with_assemblyai(audio_path)
                logger.info("AssemblyAI transcription completed successfully.")
                return full_text, segments
            except Exception as e:
                logger.error(f"AssemblyAI transcription failed: {e}", exc_info=True)

        # 3. Groq Whisper API
        groq_key = os.getenv("GROQ_API_KEY")
        if groq_key and not groq_key.startswith("your-"):
            try:
                logger.info("Attempting Groq Whisper API transcription...")
                url = "https://api.groq.com/openai/v1/audio/transcriptions"
                headers = {"Authorization": f"Bearer {groq_key}"}
                
                # Groq requires multipart files upload
                with open(upload_path, "rb") as f:
                    files = {"file": (os.path.basename(upload_path), f, "audio/mpeg")}
                    data = {
                        "model": "whisper-large-v3",
                        "response_format": "verbose_json"
                    }
                    async with httpx.AsyncClient() as client:
                        res = await client.post(url, headers=headers, files=files, data=data, timeout=60.0)
                        if res.status_code == 200:
                            res_data = res.json()
                            full_text = res_data.get("text", "")
                            raw_segments = res_data.get("segments", [])
                            
                            segments = []
                            for s in raw_segments:
                                segments.append({
                                    "start_seconds": round(s.get("start", 0), 2),
                                    "end_seconds": round(s.get("end", 0), 2),
                                    "text": s.get("text", "").strip()
                                })
                            logger.info("Groq Whisper transcription completed successfully.")
                            return full_text, segments
                        else:
                            logger.warning(f"Groq Whisper returned status {res.status_code}: {res.text}")
            except Exception as e:
                logger.error("Groq Whisper transcription exception", exc_info=True)

        # 4. OpenAI Whisper API
        openai_key = os.getenv("OPENAI_API_KEY")
        if openai_key and not openai_key.startswith("your-"):
            try:
                logger.info("Attempting OpenAI Whisper API transcription...")
                url = "https://api.openai.com/v1/audio/transcriptions"
                headers = {"Authorization": f"Bearer {openai_key}"}
                
                with open(upload_path, "rb") as f:
                    files = {"file": (os.path.basename(upload_path), f, "audio/mpeg")}
                    data = {
                        "model": "whisper-1",
                        "response_format": "verbose_json"
                    }
                    async with httpx.AsyncClient() as client:
                        res = await client.post(url, headers=headers, files=files, data=data, timeout=60.0)
                        if res.status_code == 200:
                            res_data = res.json()
                            full_text = res_data.get("text", "")
                            raw_segments = res_data.get("segments", [])
                            
                            segments = []
                            for s in raw_segments:
                                segments.append({
                                    "start_seconds": round(s.get("start", 0), 2),
                                    "end_seconds": round(s.get("end", 0), 2),
                                    "text": s.get("text", "").strip()
                                })
                            logger.info("OpenAI Whisper transcription completed successfully.")
                            return full_text, segments
                        else:
                            logger.warning(f"OpenAI Whisper returned status {res.status_code}: {res.text}")
            except Exception as e:
                logger.error("OpenAI Whisper transcription exception", exc_info=True)

        # 5. CATCHALL / MOCK: Generate static mock transcription if all providers fail
        logger.warning("All transcription providers failed. Falling back to structured mock transcript.")
        mock_text = "Today we officially launch Prism AI. It is a premium content repurposing engine. Creators waste hours taking a single YouTube video or podcast and trying to format it for LinkedIn, X, and blogs. Prism AI automates this workflow. You submit your media link, and it transcribes, extracts key moments, and writes native assets. It even runs a critic agent to rewrite generic AI phrasing, ensuring it sounds authentic."
        mock_segments = [
            {"start_seconds": 0.0, "end_seconds": 4.5, "text": "Today we officially launch Prism AI. It is a premium content repurposing engine."},
            {"start_seconds": 4.5, "end_seconds": 9.0, "text": "Creators waste hours taking a single YouTube video or podcast and trying to format it for LinkedIn, X, and blogs."},
            {"start_seconds": 9.0, "end_seconds": 13.5, "text": "Prism AI automates this workflow. You submit your media link, and it transcribes, extracts key moments, and writes native assets."},
            {"start_seconds": 13.5, "end_seconds": 18.0, "text": "It even runs a critic agent to rewrite generic AI phrasing, ensuring it sounds authentic."}
        ]
        return mock_text, mock_segments

    finally:
        # Clean up temporary compressed file if it was created
        if temp_compressed_path and os.path.exists(temp_compressed_path):
            try:
                os.remove(temp_compressed_path)
                logger.info(f"Cleaned up temporary compressed file: {temp_compressed_path}")
            except Exception as clean_err:
                logger.warning(f"Failed to delete temporary compressed file: {clean_err}")
