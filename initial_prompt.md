# AI Content Repurposing Engine — Initial Prompt

This document contains the initial prompt and specifications for the project.

---

## 1. What this product does

A user gives the system one long-form piece of source content — a YouTube URL, an uploaded video/audio file, or a pasted article/transcript. The system automatically produces a set of repurposed outputs from it:

- A long-form blog post
- A Twitter/X thread
- A LinkedIn post
- 3–7 short-clip suggestions (timestamp range + caption + on-screen text), if the source is video/audio
- An AI-generated thumbnail image for the blog post and for each clip suggestion

Core flow: **submit source → pipeline runs (transcribe → extract highlights → generate content → generate images) → user lands on a results dashboard with all outputs, can regenerate any single piece, and can copy/export each one.**

---

## 2. Tech stack

**Backend:** Python 3.11, FastAPI, SQLAlchemy, SQLite for local dev (swap to Postgres via `DATABASE_URL` later with zero code change — use SQLAlchemy, not raw SQLite calls). `yt-dlp` for YouTube downloads. `faster-whisper` for local transcription (fall back to OpenAI's Whisper API if `WHISPER_MODE=api`). **OpenRouter as the single provider for both text generation and image generation** — one API key, one OpenAI-compatible endpoint, model choice is just a string. See Section 3 for exactly how this should be wired up — it's the most important integration in this app, don't improvise it.

**Frontend:** Next.js 14 (App Router), TypeScript in strict mode, Tailwind CSS, Framer Motion (the `motion` package), and Aceternity UI components (copy-pasted into `components/ui/`, not installed as an npm package — that's how Aceternity is meant to be used).

**Background processing:** For MVP, use FastAPI's `BackgroundTasks` with an in-memory/DB-backed stage tracker — do not reach for Celery/Redis yet. Note in your README that Celery+Redis is the natural upgrade path if this needs to handle concurrent users, but don't build it now.

**Storage:** Local disk under `/uploads` and `/generated` for MVP. Structure file paths so swapping to S3 later only touches one storage module.

---

## 3. LLM & image provider setup (OpenRouter) — build this carefully, everything else calls into it

Create one module, `services/openrouter.py`, that every other service (`extract.py`, `generate.py`, `imagegen.py`) calls into. Nothing else should construct an OpenRouter request directly.

**Free model fallback chain.** On startup (or behind a short-lived cache), call OpenRouter's `GET /models` endpoint filtered to zero-price models, and store the resulting slugs as an ordered list. For every text generation call in the pipeline EXCEPT the critic/rewrite pass, pass this whole list as the `models` array (not a single `model` field) in priority order. OpenRouter automatically falls through to the next model in the list if the current one is rate-limited, errored, or down — this is what lets you use "all the free models" without writing your own retry/rotation logic. Each free model has its own separate rate limit (roughly 20 req/min, 200/day), so chaining them gives you a much larger effective free quota than any single one.

**Exception — the critic/rewrite pass.** The pass that rewrites a first-draft generation to cut AI-slop phrasing and verify it's grounded in the transcript (see Section 5, Step 4) should always pin one specific paid model rather than ride the free fallback chain. This is the one step where model quality has the most leverage on whether the output is actually postable — don't let it land on a weak free model by chance.

**Logging which model actually answered.** Every OpenRouter response includes a `model` field naming which model in the chain actually served that request — this may not be the first one in your list, if it fell back. Persist this every single time on the row that triggered the call (`GeneratedAsset.model_used`, `Job.model_used` — see updated data models below). Don't skip this: it's how you'll debug "why did this particular thread come out worse than usual," and it's also the exact data the model-selector UI surfaces to the user.

**Image generation also goes through OpenRouter.** It is not a separate `/images` endpoint — send a normal chat completions request with `modalities: ["image", "text"]` and an image-capable model slug (e.g. a Gemini image model or a FLUX model). Same logging requirement: store `model_used` on the thumbnail asset too.

**Model selector (user-facing).** Build a simple two-mode control, not a flat dropdown of 30 models:
- **Auto (free, fastest)** — uses the fallback chain described above. This is the default.
- **Pin a model** — a dropdown of named models (populated from `/models`, free and paid) for when the user wants to deliberately choose one, e.g. after seeing a weak free-model result.

Expose this control in two places: as a default setting on the new-project page, and as an option on the per-asset "regenerate" action — so a single mediocre output can be redone with a specific pinned model without changing the global setting for the rest of the project.

---

## 4. Data models

```python
Project:
  id, title, source_type (youtube_url | upload | article_text),
  source_ref (url or file path or raw text),
  status (pending | transcribing | extracting | generating | done | failed),
  default_model_mode (auto | pinned), default_pinned_model (nullable),
  created_at

Transcript:
  id, project_id, full_text,
  segments: JSON list of {start_seconds, end_seconds, text}

Highlight:
  id, project_id, start_seconds, end_seconds,
  quote, reason   # why this moment was chosen

GeneratedAsset:
  id, project_id, asset_type (blog | thread | linkedin | clip | thumbnail),
  content (text or image path),
  related_highlight_id (nullable, for clip/thumbnail assets tied to a highlight),
  model_used (string, set from the response's `model` field — never left null on success),
  status (pending | done | failed), created_at

Job:
  id, project_id, stage, status, error_message, model_used (nullable), updated_at
```

---

## 5. The pipeline — this is the actual product, build it carefully

### Step 1 — Ingest
- `youtube_url`: download audio with `yt-dlp` (audio-only, smallest format).
- `upload`: accept `.mp4/.mp3/.wav`, save to `/uploads/{project_id}/`.
- `article_text`: skip straight to Step 3 with the pasted text as the "transcript."

### Step 2 — Transcribe (skip if `article_text`)
Run `faster-whisper` on the audio, producing segments with start/end timestamps. Store the full concatenated text and the segment list on the `Transcript` row.

### Step 3 — Extract highlights (LLM call #1, via the free fallback chain by default)
This is a structured-output call — validate the response against a Pydantic schema and retry once if it fails to parse.

Example system prompt to use:
```
You are an expert content editor. You will be given a transcript with
timestamps. Identify the 3 to 7 most compelling, quotable, or
surprising moments in it — the kind of moments that would make someone
stop scrolling.

For each moment, return:
- start_seconds, end_seconds (from the transcript timestamps)
- quote: the exact or lightly cleaned-up quote from that moment
- reason: one sentence on why this moment is notable (surprising claim,
  emotional peak, concrete actionable advice, etc.)

Respond ONLY with valid JSON matching this shape:
{"highlights": [{"start_seconds": 0, "end_seconds": 0, "quote": "", "reason": ""}]}
```

### Step 4 — Generate content (LLM calls #2–4, one per asset type, run in parallel, via the free fallback chain by default)
Use a distinct system prompt per type so each output actually reads like its platform, not like the same paragraph reformatted three times.

Blog post prompt (sketch):
```
Write a long-form blog post (600-900 words) based on this transcript
and these highlighted moments: {highlights}. Use the highlights as
section anchors. Write in a direct, no-fluff tone. Include an H1 title
and H2 section headers. Do not use generic filler phrases like
"in today's world" or "let's dive in."
```

Twitter/X thread prompt (sketch):
```
Write a 5-8 tweet thread based on this transcript. Tweet 1 must be a
hook that creates curiosity without giving away the punchline. Each
subsequent tweet builds on the last. End with a one-line takeaway, not
a generic "thanks for reading." Number each tweet (1/, 2/, etc.).
```

LinkedIn post prompt (sketch):
```
Write a LinkedIn post (150-250 words) based on this transcript. Open
with a one-line hook grounded in a specific detail from the transcript
(not a generic question). Professional but not corporate-speak tone.
End with one concrete takeaway, no engagement-bait question.
```

Clip suggestion generation: for each `Highlight`, generate a caption (1 short sentence, platform-style) and an on-screen text overlay (max 6 words, punchy).

### Step 4.5 — Critic/rewrite pass (LLM call, ALWAYS pinned to one specific paid model, never the free fallback chain)
Feed each Step 4 draft back in with a prompt like: "Rewrite this, cutting any sentence that could apply to literally any topic, and any claim not actually said in the source transcript." This is the single highest-leverage step for output quality — see Section 3 for why it's excluded from the free chain.

### Step 5 — Generate thumbnails (image gen calls via OpenRouter, one per blog post + one per clip)
First, ask the LLM for a concrete image description (not the raw quote — a visual description of a scene/composition), then pass that description to an image-capable OpenRouter model with `modalities: ["image", "text"]`. Store the resulting image under `/generated/{project_id}/`.

### Step 6 — Mark complete
Set `Project.status = done` once all `GeneratedAsset` rows for the project are in a terminal state.

---

## 6. API endpoints

```
POST   /projects                        create project, kicks off pipeline async, returns {project_id}
GET    /projects/{id}                   status + metadata
GET    /projects/{id}/transcript
GET    /projects/{id}/highlights
GET    /projects/{id}/assets            list all generated assets (includes model_used per asset)
GET    /projects/{id}/assets/{asset_id}
POST   /projects/{id}/assets/{asset_id}/regenerate   accepts optional {model: "pinned-slug"} in body
GET    /projects/{id}/events            Server-Sent Events stream of pipeline stage updates,
                                         used to drive the live progress UI
GET    /models                          proxies OpenRouter's model list, used to populate the model selector
```

---

## 7. Frontend pages and Aceternity component mapping

Be deliberate here — pick ONE moment on each page to be the visual "wow," keep the rest restrained. Stacking heavy animation on every single element will read as generated rather than designed.

**New project page (`/new`)**
- Tabs component to switch between "YouTube URL" / "Upload file" / "Paste text" input modes.
- Animated drag-and-drop dropzone for the upload mode.
- A Hover Border Gradient or Moving Border button for the submit action — this is the one accent moment on this page.
- A simple two-mode model selector (Auto / Pin a model) near the submit button — keep it visually quiet, it's a control, not the page's signature moment.

**Processing page (`/project/[id]/processing`)**
- Step Loader component mapped directly to your pipeline stages (Transcribing → Finding highlights → Writing content → Critic pass → Generating thumbnails) — this component exists specifically for this use case, use it as-is rather than building a custom progress bar.
- A subtle Background Beams or grid-dots background behind it so the page doesn't feel dead while waiting; keep it quiet, this is not the page's signature moment.

**Results dashboard (`/project/[id]`)**
- Bento Grid layout, one cell per asset type (blog / thread / linkedin / clips / thumbnails) — this is your signature moment for the whole app, lean into it here.
- 3D Card or Focus Cards effect on hover within the grid.
- A text-reveal effect (the gibberish/decode-style reveal) the first time content loads in, signaling "this was just generated" — use once, not on every re-render.
- A small, quiet badge on each card showing `model_used` (e.g. "Generated with deepseek/deepseek-r1") — this is informational, not decorative, keep it understated.

**Individual asset detail**
- A Moving Border "Copy" button and a plain, unstyled export action — don't over-animate utility actions, per the restraint principle.
- A "Regenerate with a different model" action that opens the pin-a-model dropdown scoped to just this one asset.

---

## 8. Folder structure

```
backend/
  app/
    main.py
    db.py
    models.py
    schemas.py
    api/
      projects.py
      assets.py
      models.py        # proxies GET /models to the frontend
    services/
      transcribe.py
      extract.py
      generate.py
      imagegen.py
      openrouter.py     # single module wrapping all OpenRouter calls — fallback chain, model_used logging
    pipeline.py          # orchestrates steps 1-6, called from BackgroundTasks
  requirements.txt

frontend/
  app/
    new/page.tsx
    project/[id]/page.tsx
    project/[id]/processing/page.tsx
  components/
    ui/              # aceternity components copied in here
    dropzone.tsx
    bento-results-grid.tsx
    model-selector.tsx
  lib/
    api.ts           # typed fetch wrappers for the backend API
```

---

## 9. Environment variables

```
OPENROUTER_API_KEY=
CRITIC_MODEL=                # the one paid model pinned for Step 4.5, e.g. anthropic/claude-haiku-4.5
WHISPER_MODE=local | api
DATABASE_URL=sqlite:///./app.db
UPLOAD_DIR=./uploads
GENERATED_DIR=./generated
```

One key covers both text and image generation — there is no separate image provider key. Never expose `OPENROUTER_API_KEY` to the frontend; it is only ever read server-side.

---

## 10. Build order — follow this sequence, do not skip ahead

1. Backend skeleton: DB models, FastAPI app boots, `/health` returns 200.
2. `services/openrouter.py`: get a single free-model call working end to end before anything else — fetch the free model list, send a request with the `models` array, confirm you can read back `model_used` from the response. This is the riskiest integration, prove it works in isolation first.
3. Ingestion: `POST /projects` accepts a pasted-text source and stores it. Get this fully working before touching audio at all.
4. Add YouTube/upload ingestion + transcription on top of the working text path.
5. Highlight extraction (Step 3) — get structured JSON parsing solid with retries before moving on.
6. Content generation (Step 4) for all three text types, then the critic pass (Step 4.5) pinned to your chosen paid model.
7. Image generation (Step 5).
8. SSE progress endpoint, `GET /models` proxy endpoint.
9. Frontend scaffold: Next.js + Tailwind installed, Aceternity components you need copied into `components/ui/`.
10. Wire the new-project page to `POST /projects` (including the model selector), build the processing page against the SSE stream, build the results dashboard against `GET /assets` (including `model_used` badges).
11. Regenerate-single-asset action (with per-asset model pin), copy/export actions, error states.

---

## 11. MVP cut, if time is short

Ship with: pasted-text input only (skip audio/YouTube entirely), blog + thread + linkedin generation only (skip clips + thumbnails), Auto mode only (skip the pin-a-model UI, keep it in the backend). That alone is a complete, demoable generative pipeline with the free-fallback-chain mechanism already proven. Add transcription, clips, thumbnails, and the pin-a-model UI as a second pass — they're additive, not blocking.
