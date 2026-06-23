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

- **Frontend Client:** Next.js 16 (TypeScript, React 19, Tailwind v4, Framer Motion) running on port `3000`.
- **Backend API:** FastAPI (Python) running on port `8000`.
- **Database:** SQLite (`backend/app.db`) for local dev, PostgreSQL via Supabase for production.
- **Deployment:** Backend → Render (Web Service with disk mount for uploads); Frontend → Vercel; DB → Supabase.
- **Local Dev Server Execution Warning:** Avoid running uvicorn with `--reload` when testing SQLite writes. Uvicorn detects file changes in `app.db` or `uploads/`/`generated/` and triggers infinite restarts.

### Ingestion & Generation Pipeline
Prism AI runs the full pipeline (transcribe → highlights → blog/thread/linkedin/clips → critic → cover thumbnail) on the backend using the app's free API key fallback chain (NVIDIA NIM primary, Gemini, Groq, OpenRouter).

---

## ⚙️ Workflow & Integration Configurations

### 1. Unified Project Creation Payload
- **Mouthpiece (Client to Backend):** The backend project router expects form fields (`Form(...)` / `File(...)`) to handle file uploads.
- **Client implementation:** All project creations in [api.ts](client/lib/api.ts) must be submitted using `FormData` (even if no file is uploaded and raw text/URL is sent). Do NOT set a manual `Content-Type` header (let the browser auto-calculate the multipart boundary) to avoid `422 Unprocessable Entity` validation errors.


### 2. Status-Aware Dashboard Redirects & Anti-Caching Guards
- **Dashboard Guard:** The frontend project dashboard (`/project/[id]`) checks the project's database status on mount. If the status is not `"done"`, it redirects to `/project/[id]/processing` using `router.replace()`.
- **Mount-Time Status Check:** The processing page first calls `getProject(id)` on mount — if the project is already `"done"`, it redirects immediately without waiting for SSE events.
- **Termination State & SSE Sync:** The pipeline ends at the **`Running Critic Review`** stage (blog cover thumbnail generation runs in parallel with the critic pass, not as a separate stage). The SSE events generator stops streaming once this stage is complete, and the client SSE listener (`subscribeToEvents`) closes the connection.
- **SSE Polling Fallback:** `subscribeToEvents` runs a 3s safety poll **alongside** SSE (not just on error). If `getProject(id).status === "done"`, it calls `onComplete`. This handles server restarts mid-pipeline and missed events gracefully.

- **Race Condition Prevention:** The backend commits `project.status = "done"` to the database **before** broadcasting the final completed stage event. This prevents the client from fetching a stale state.
- **Cache-Busting & Refreshing:** To prevent next.js and browsers from rendering stale layout states after completion, the API client (`client/lib/api.ts`) appends a cache-busting timestamp `?t=${Date.now()}` to all GET requests for projects, assets, and highlights. The processing page also calls `router.refresh()` on redirect to force segment layout re-validation.

### 3. Dashboard Cards & Per-Card Regeneration
- **Dynamic Bento Headers:** Bento Grid cards dynamically render actual generated content previews inside their header elements (first tweet from parsed thread for X/Twitter, generated copy for LinkedIn, real highlight timestamps for clips) instead of using hardcoded mock messages.
- **Premium Card Aesthetic:** Solid `bg-[#0a0a0d]` base with `border-[#1a1a20]`, gradient accent line on top that lights up on hover, refined hover lift (`-translate-y-1`), and platform-specific avatar gradients (X/LinkedIn). **No glassmorphism.**
- **Per-Card Regeneration Panel:** Each social asset card (blog, X thread, LinkedIn, clip, thumbnail) has an inline `CardRegenPanel` beneath it with a custom-prompt textarea (asset-specific placeholder), a `ModelSelector`, and a confirm button. Clicks inside the panel are isolated (`stopPropagation`) so they don't trigger the card's drawer-open `onClick`.
- **Regeneration Routing:** `handleRegenerate()` and `handleCardRegen()` check `project.pipeline_mode`:
  - Calls `regenerateAsset()` (backend AI chain).
- **Custom Prompt Backend:** The backend regenerate endpoint `POST /api/projects/{id}/assets/{assetId}/regenerate` accepts `{ model, prompt, model_mode }`. When `prompt` is provided, it's injected as "Additional user instructions" at the top of the generation message and appended to the critic message.
- **Highlights Card:** A 6th bento card shows extracted key moments (timestamps + quotes), filling the previous trailing grid gap on desktop. Opens a dedicated drawer view.
- **Character Constraint:** Each tweet in an X thread must remain strictly **under 280 characters** (free tier post limit). This is enforced in the prompt, the Critic pass instructions, AND a programmatic validation re-roll in `pipeline.py` (`_thread_is_valid`).
- **Split-Copy Cards:** The dashboard details modal parses the thread by tweet index and renders multiple copyable cards with individual `"Copy Tweet"` actions and character counters instead of a single long text block.

### 4. Prompts & Per-Asset Generation Config
- **Centralized Prompts:** All backend system prompts live in `backend/app/services/prompts.py` (single source of truth — imported by both `pipeline.py` and `assets.py`). Never duplicate prompt strings across files.
- **Per-Asset Token Budgets:** `ASSET_CONFIG` in `prompts.py` defines `max_tokens` + `temperature` per asset type. These are threaded through `chat_completion()` into every provider (NVIDIA, Gemini, OpenRouter, Groq, Ollama). The blog budget is 4096 tokens (prevents truncation of 700-1000 word posts).
- **Critic Model Resolution:** `resolve_critic_model()` in `prompts.py` validates the `CRITIC_MODEL` env var against a blocklist of known-invalid slugs (e.g., `google/gemini-3.1-flash-lite`) and falls back to `meta/llama-3.3-70b-instruct`. The critic always runs in `pinned` mode with low temperature (0.35).
- **Content Validation Re-Roll:** After generation, `pipeline.py` validates blog word count (≥400 words) and thread tweet lengths (≤280 chars each). If validation fails, a single re-roll is attempted with a correction instruction.
- **Asset Selector:** Users can choose which assets to generate via `target_assets` (JSON array: `["blog","thread","linkedin","clip"]`). Pipeline skips unselected assets. Highlights extraction is also skipped when clips aren't selected.

### 5. Image & Audio Path Resolution
- **Cross-Origin Issue:** Backend stores thumbnail and audio paths as relative URLs (`/generated/{project_id}/blog_cover.png` or `/uploads/{project_id}/audio.mp3`) served from port 8000. The frontend uses `resolveImageUrl()` (in `client/lib/api.ts`) to prepend `BACKEND_BASE` (`http://localhost:8000`) so the browser resolves against the correct origin. Without this, browsers load from `http://localhost:3000/generated/...` which 404s.

### 6. Mock Data — Explicit Demo Mode Only
- **No Silent Fallback:** All API functions in `api.ts` throw clear errors when the backend is unreachable. Mock data is **never** silently injected into the real UI.
- **Explicit Demo Mode:** Mock data is only active when the URL has `?demo=1`. This is intended for the homepage simulator only, not the dashboard.
- **Retry Helper:** `fetchWithRetry()` in `api.ts` retries up to 2 times with 500-1000ms backoff to absorb transient backend drops (e.g. uvicorn --reload restarts).



### 8. Deployment
- **Backend → Render:** `render.yaml` defines the web service. Uses `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Persistent disk at `/data` for uploads and generated images. All env vars set in Render dashboard.
- **Frontend → Vercel:** Set `NEXT_PUBLIC_BACKEND_URL` to the Render backend URL. No build config needed (Next.js 16 + Turbopack auto-detected).
- **Database → Supabase:** Use the pooled connection string (PgBouncer-compatible). Set as `DATABASE_URL=postgresql+asyncpg://...` in Render. `asyncpg` is in `requirements.txt`. `create_all` + idempotent migrations (`ALTER TABLE ADD COLUMN ...`) create the schema on first boot.
- **CORS:** The backend reads `ALLOWED_ORIGINS` env var (comma-separated) and `CLIENT_REDIRECT_URI` to build the allow_origins list. Set `ALLOWED_ORIGINS=https://prism-ai.vercel.app` in production.

---

## 🔍 Fallback Matrix & API Findings

When working on text, transcription, or image generations, the backend relies on a **High-Reliability Fallback Matrix** to ensure system availability even during rate limits (429) or token balance issues (402).

| Service | Primary Provider | Fallback 1 | Fallback 2 | Fallback 3 | Fallback 4 (No-Key Catchall) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Text LLM (guest)** | **NVIDIA NIM** *(Llama 3.3 70B — Free)* | **Gemini API** *(2.5 Flash)* | **OpenRouter** *(Free model array)* | **Groq API** *(Llama 3.3)* / **Ollama** *(Local)* | *RuntimeError* |
| **Audio transcription (guest)** | **Local `faster-whisper`** *(if `WHISPER_PROVIDER=local`)* | **AssemblyAI** | **Groq Whisper API** | **OpenAI Whisper API** | *Mock Fallback* |
| **Image Generation (guest)** | **HuggingFace FLUX.1-dev** *(quality mode)* | **HuggingFace FLUX.1-schnell** *(fast mode)* | **Pollinations AI** | **Generated Gradient Placeholder** *(on-brand PNG)* | *Unsplash URL* |


### Key API Discoveries:
1. **NVIDIA NIM is the Primary LLM (backend):** `NVIDIA_API_KEY` is set and active, so all "auto" mode text generation hits NVIDIA Build API (`integrate.api.nvidia.com`) first with 5 verified models. NVIDIA NIM models are now exposed in `GET /api/models` grouped by provider so users can explicitly pin them. The `model_used` returned is the slug as-is (e.g., `meta/llama-3.3-70b-instruct`), NOT double-prefixed.
2. **OpenRouter Rate Limits:** Free-tier keys frequently encounter `429 Too Many Requests` (daily limits) and `402 Payment Required` (credits block). OpenRouter is now a deep fallback (position 3), not primary. The matrix handles 429 with a 1s backoff and 402 with an immediate skip.
3. **Gemini Image Models are Paid/Quota-Limited:** `imagen-4.0-*` requires a paid plan (400 error). `gemini-2.5-flash-image` / `gemini-3.1-flash-image` return 429 (quota exhausted on free tier). Image generation therefore uses HuggingFace FLUX models (free, verified working) as primary.
4. **HuggingFace FLUX.1-dev + FLUX.1-schnell:** Both verified working with `HF_API_KEY`. FLUX.1-dev produces higher quality; FLUX.1-schnell is faster (used in the main pipeline with `quality="fast"`). Regenerate uses `quality="quality"` (FLUX.1-dev).
5. **Generated Gradient Placeholder:** When all image providers fail, `imagegen.py` generates an on-brand dark-gradient PNG with the project title using Pillow (replaces the previous single hardcoded Unsplash URL — every project gets a unique fallback).
6. **Blog Cover Thumbnail Re-enabled:** The pipeline now generates one blog cover thumbnail in parallel with the critic pass (via `asyncio.gather`), adding near-zero wall-clock time. Per-clip thumbnails remain manual-regenerate only.
7. **Clips Parallelized + Highlights Skipped When Unselected:** Clip draft generation and clip critic passes run via `asyncio.gather`. When `target_assets` doesn't include `"clip"`, the highlights extraction step is skipped entirely, saving ~5-10s per project.
8. **Gemini Direct SDK JSON Constraints:**
   - Enforce native JSON response structures in the direct Gemini API fallback by passing `config={"response_mime_type": "application/json"}` to `model.models.generate_content`.
   - Never trust the LLM to return naked JSON. Always pass raw output through `extract_and_parse_json()` in `pipeline.py` which trims conversational text and strips markdown formatting wrapper backticks (`` ```json ... ``` ``).
9. **Groq Whisper (Transcription):** Groq's `/v1/audio/transcriptions` endpoint has a strict **25 MB file upload limit**. Audio >4MB is compressed via ffmpeg (mono 32kbps) before cloud upload.
10. **Image Validity Check:** `imagegen.py` uses `PIL.Image.verify()` to validate generated image bytes (replaces the crude `len > 1000` check that could pass tiny error images).
11. **Render Database URL Cleaning:** To prevent database name connection failures (like `database "postgres\n"` catalog errors) from copy-pasting carriage returns in Render, `backend/app/db.py` defensively strips trailing whitespace and newlines from `DATABASE_URL` on startup.
12. **Header Dropdown Overlay Stacking:** The header container on `/new`, `/dashboard`, and `/project/[id]` routes must use `relative z-40` (or greater) to stay on top of main content elements (`relative z-10`), ensuring absolute dropdown overlays are clickable.
13. **Navigation Transition Prefetching:** Avoid click-based programmatic `router.push()` for static transitions. Use Next.js `<Link>` components to leverage built-in prefetching and avoid transition lag.
14. **Production Console Stripping:** Configured `client/next.config.ts` SWC compiler `removeConsole: { exclude: ["error"] }` in production to remove diagnostic verbose logging while retaining error reporting.
15. **YouTube Bot-Block Bypassing:** YouTube downloads on cloud hosts like Render will trigger bot-verification errors. To bypass this, `yt-dlp` reads cookies from `YOUTUBE_COOKIES_FILE`, `/data/cookies.txt`, or local roots if a Netscape format `cookies.txt` is exported from a real browser session.

