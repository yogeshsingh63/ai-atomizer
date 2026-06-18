# AGENTS.md — System Instructions for AI Coding Assistants

Welcome, AI Agent! This file is a machine-readable specification and set of instructions for building and modifying the AI Content Repurposing Engine (AI Atomizer). Read this file fully before starting any code modifications to ensure architectural consistency.

---

## 1. Project Overview & Tech Stack

This project is a full-stack content repurposing pipeline.
- **Backend:** Python 3.11, FastAPI, SQLAlchemy, SQLite (local development).
  - ORM layer: Must use SQLAlchemy (no direct sqlite3/raw SQL calls) to allow zero-code migrations to PostgreSQL.
  - Background processes: Use FastAPI's standard `BackgroundTasks`. Do not use Celery or Redis for the current MVP.
  - Audio: Download audio with `yt-dlp` (audio-only, smallest file size).
  - Transcription: Local inference with `faster-whisper` (fall back to OpenAI Whisper API if `WHISPER_MODE=api` in `.env`).
- **Frontend:** Next.js 14 (App Router), TypeScript (strict mode), Tailwind CSS, Framer Motion (`motion` package), and Aceternity UI (code-pasted into `components/ui/`, not installed as an npm package).
- **LLM/Image Provider:** OpenRouter. All text and image generations must go through `backend/app/services/openrouter.py`.

---

## 2. Rules of Engagement & Core Boundaries (WHAT NOT TO CHANGE)

### 2.1. OpenRouter Routing & Logging
- **Fallback Chain for Text Gen:** Except for the critic pass, all text generation steps MUST supply a list of zero-price models dynamically fetched from OpenRouter `GET /models` as an array in the `models` parameter (not a single `model` parameter). OpenRouter automatically routes fallback attempts.
- **Critic Pass Paid Model:** The rewrite/critic pass (Step 4.5) MUST always be pinned to a single paid model (defined by `CRITIC_MODEL` env var, e.g. `anthropic/claude-haiku-4.5`). Never route the critic pass to the free model fallback list.
- **Model Used Logging:** You must extract the `model` response field from every OpenRouter completion response and persist it to the DB in the row representing that action (`GeneratedAsset.model_used`, `Job.model_used`). This is critical for debugging and UI badges.
- **Multimodal Image Generation:** Image generation is performed through OpenRouter using the unified chat completions endpoint `/chat/completions` with the parameters:
  - `modalities: ["image", "text"]` (or `["image"]` depending on model capability)
  - Image-capable model ID.

### 2.2. Data Schema Integrity
Never modify or drop columns of the following core models without explicit approval:
- **Project:** `id`, `title`, `source_type`, `source_ref`, `status` (pending | transcribing | extracting | generating | done | failed), `default_model_mode` (auto | pinned), `default_pinned_model`, `created_at`.
- **Transcript:** `id`, `project_id`, `full_text`, `segments` (JSON list containing `start_seconds`, `end_seconds`, `text`).
- **Highlight:** `id`, `project_id`, `start_seconds`, `end_seconds`, `quote`, `reason`.
- **GeneratedAsset:** `id`, `project_id`, `asset_type` (blog | thread | linkedin | clip | thumbnail), `content`, `related_highlight_id`, `model_used`, `status`, `created_at`.
- **Job:** `id`, `project_id`, `stage`, `status`, `error_message`, `model_used`, `updated_at`.

### 2.3. Frontend Design Aesthetics
- **Wow Factor & Accent Polish:** The design must look extremely premium, adopting a sleek dark-mode custom harmonious palette, elegant typography, glassmorphism, and smooth Framer Motion micro-animations.
- **Restraint Rule:** Do not over-animate every single layout element. Choose **one** moment on each page to act as the visual "wow" accent (e.g., submit button gradient on `/new`, Bento Grid hover on `/project/[id]`, copy button moving border on asset detail). Keep utility operations clean and performant.
- **No Tailwind CSS Wildcards:** Use strict HSL tailored colors and semantic layout borders. Avoid plain generic primary colors (e.g. basic `#ff0000`, `#0000ff`).

---

## 3. Key Commands & Operations

### 3.1. Backend Dev Server
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 3.2. Frontend Dev Server
```bash
cd frontend
npm run dev -- -p 3000
```

### 3.3. DB Migrations
If DB modifications are made:
- Rely on SQLAlchemy's auto-creation on lifespan boot.
- If schema updates are non-trivial, verify mapping in `backend/app/models.py`.

---

## 4. Verification Checklists

Before marking any task complete, verify:
1. `GET /health` on the backend returns 200.
2. The `model_used` column is populated on every single successful asset generation.
3. Errors in parsing LLM outputs are caught and run through the Pydantic validator retry logic.
4. Next.js builds successfully in production mode (`npm run build`).
5. OpenRouter endpoints are properly isolated server-side and never exposed to the client.
