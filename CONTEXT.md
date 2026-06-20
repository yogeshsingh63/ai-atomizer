# Project Context & AI Instructions

This document serves as the persistent context and rules manual for any AI model working on the **AI Atomizer (Prism AI)** repository. 

---

## 📜 Rules for AI Assistants (Context Updates)
1. **Maintain This File:** Before concluding any turn or session, check if new architecture changes, preferences, or findings have been introduced. If so, update this file.
2. **Keep it Concise:** Maintain sections cleanly. Do not remove historical configuration facts unless they are deprecated by new code changes.
3. **Strict Commit Standards:** Keep git commits short, atomic, and descriptive. Prefix commits with standard conventions (e.g., `fix:`, `feat:`, `chore:`, `style:`). Always commit directly on the `dev` branch only (enforced for any AI agent).

---

## 🛠️ Project Overview & Architecture
Prism AI is a content refraction engine that ingests long-form video URLs, audio files, or raw text and automatically generates platform-optimized social copy (Blog Posts, X/Twitter Threads, LinkedIn Posts, Short Clip Captions) along with graphic thumbnail references.

- **Frontend Client:** Next.js (TypeScript, React) running on port `3000`.
- **Backend API:** FastAPI (Python) running on port `8000`.
- **Database:** SQLite (`backend/app.db`) managed via SQLAlchemy + `aiosqlite`.
- **Local Dev Server Execution Warning:** Avoid running uvicorn with `--reload` when testing SQLite writes. Uvicorn will detect SQLite file changes (`app.db`) or file uploads (`uploads/`, `generated/`) and trigger infinite server restarts.

---

## ⚙️ Workflow & Integration Configurations

### 1. Unified Project Creation Payload
- **Mouthpiece (Client to Backend):** The backend project router expects form fields (`Form(...)` / `File(...)`) to handle file uploads.
- **Client implementation:** All project creations in [api.ts](client/lib/api.ts) must be submitted using `FormData` (even if no file is uploaded and raw text/URL is sent). Do NOT set a manual `Content-Type` header (let the browser auto-calculate the multipart boundary) to avoid `422 Unprocessable Entity` validation errors.

### 2. Status-Aware Dashboard Redirects & Anti-Caching Guards
- **Dashboard Guard:** The frontend project dashboard (`/project/[id]`) checks the project's database status on mount. If the status is not `"done"`, it redirects to `/project/[id]/processing` using `router.replace()`.
- **Termination State & SSE Sync:** Since thumbnail generation is bypassed in the backend pipeline for efficiency, the pipeline ends at the **`Running Critic Review`** stage. The SSE events generator stops streaming once this stage is complete, and the client SSE listener (`subscribeToEvents`) closes the connection.
- **Race Condition Prevention:** The backend commits `project.status = "done"` to the database **before** broadcasting the final completed stage event. This prevents the client from fetching a stale state.
- **Cache-Busting & Refreshing:** To prevent next.js and browsers from rendering stale layout states after completion, the API client (`client/lib/api.ts`) appends a cache-busting timestamp `?t=${Date.now()}` to all GET requests for projects, assets, and highlights. The processing page also calls `router.refresh()` on redirect to force segment layout re-validation.

### 3. Twitter/X Thread & LinkedIn Dashboard Card Previews
- **Dynamic Bento Headers:** Bento Grid cards dynamically render actual generated content previews inside their header elements (first tweet from parsed thread for X/Twitter, and generated copy for LinkedIn) instead of using hardcoded mock messages.
- **Fallback Cover Template:** Because thumbnail assets are not generated in the main pipeline, the client dashboard uses a default high-quality Unsplash image (`DEFAULT_THUMBNAIL_PLACEHOLDER`) as a visual fallback in place of empty links or broken icons.
- **Character Constraint:** Each tweet in an X thread must remain strictly **under 280 characters** (free tier post limit). This is enforced in both the initial prompt (`pipeline.py`) and the Critic pass instructions.
- **Split-Copy Cards:** The dashboard details modal parses the thread by tweet index and renders multiple copyable cards with individual `"Copy Tweet"` actions and character counters instead of a single long text block.

---

## 🔍 Fallback Matrix & API Findings

When working on text, transcription, or image generations, the backend relies on a **High-Reliability Fallback Matrix** to ensure system availability even during rate limits (429) or token balance issues (402).

| Service | Primary Provider | Fallback 1 | Fallback 2 | Fallback 3 (No-Key Catchall) |
| :--- | :--- | :--- | :--- | :--- |
| **Text LLM** | **OpenRouter** *(Free)* | **Gemini API** *(Flash)* | **Groq API** *(Llama 3.3)* | **Local Ollama** *(Llama 3)* |
| **Audio Transcription** | **Local `faster-whisper`** | **Groq Whisper API** | **OpenAI Whisper API** | *Mock Fallback* |
| **Image Generation** | **OpenRouter** *(SDXL)* | **Hugging Face API** | **Gemini Imagen API** | **Pollinations AI** / *Unsplash* |

### Key API Discoveries:
1. **Groq Whisper (Transcription):** Groq's `/v1/audio/transcriptions` endpoint has a strict **25 MB file upload limit**. If an audio extraction yields a larger file (e.g., 34.6 MB for a 24-minute video), Groq will close the connection early, causing `httpx` connection exceptions. In this case, the matrix correctly falls back to the structured mock transcript.
2. **OpenRouter Rate Limits:** Free-tier keys frequently encounter `429 Too Many Requests` (daily limits) and `402 Payment Required` (credits block). The matrix gracefully handles this by escalating calls down the list.
3. **Gemini Direct SDK JSON Constraints:**
   - Enforce native JSON response structures in the direct Gemini API fallback by passing `generation_config={"response_mime_type": "application/json"}` to `model.generate_content`.
   - Never trust the LLM to return naked JSON. Always pass raw output through `extract_and_parse_json()` in `pipeline.py` which trims conversational text and strips markdown formatting wrapper backticks (`` ```json ... ``` ``).
4. **Groq LLM Success:** Groq's `llama-3.3-70b-versatile` serves as a highly reliable fallback for content writing and critic edits when Gemini Pro or OpenRouter fail due to free tier limits.
5. **Pollinations AI Quality & Rate Limits:** The free image generator API (`image.pollinations.ai`) outputs low-quality/sub-par visual renders and frequently rejects consecutive/parallel calls. The system handles this by using a backup Unsplash placeholder. To get high-quality images, configure `HF_API_KEY` in `.env` with a free Hugging Face API token to utilize the FLUX.1-schnell fallback.
