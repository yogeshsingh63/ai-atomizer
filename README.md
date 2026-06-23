# Prism AI (AI Atomizer)

Prism AI is a premium content refraction engine that automates content distribution by converting long-form media (YouTube video links, audio/video files, or raw transcripts) into a beautiful spectrum of platform-native text copy:
- **SEO Blog Articles** (detailed, high-quality 700-1000 word deep dives)
- **LinkedIn Updates** (professional, feed-culture formatted posts)
- **X/Twitter Threads** (engaging threads with character constraints under 280 chars)
- **Viral short clip recommendations** (timestamps and copy)
- **Graphic thumbnail/cover assets** (powered by FLUX or fallback gradients)

---

## 🛠️ Architecture & Tech Stack

- **Frontend Client:** Next.js 16 (App Router, TypeScript, React 19, Tailwind CSS, Framer Motion)
- **Backend API:** FastAPI (Python, Uvicorn, SQLAlchemy)
- **Database:** PostgreSQL via Supabase (production) / SQLite (development)
- **AI Core:** NVIDIA NIM, Gemini, Groq, OpenRouter, AssemblyAI, HuggingFace (FLUX)

---

## ⚙️ Repository Structure

```
├── backend/               # FastAPI Backend Service
│   ├── app/               # Main Application Source Code
│   │   ├── main.py        # API Entrypoint
│   │   ├── db.py          # Database Connection Setup & Session Management
│   │   ├── models.py      # SQLAlchemy Models
│   │   └── services/      # Business Logic (Pipeline, Audio, Prompts, Image Gen)
│   ├── requirements.txt   # Python Dependencies
│   └── app.db             # Local SQLite Database (Git ignored)
│
└── client/                # Next.js Frontend Client
    ├── app/               # Next.js App Router Pages (Home, Dashboard, project details)
    ├── components/        # Shared UI Components (Profile dropdown, Premium loader)
    ├── lib/               # Client Helpers & API Client
    └── package.json       # Node Dependencies
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.10+
- Node.js 18+

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables. Copy `.env.example` to `.env` and fill in your API keys (NVIDIA NIM, Supabase, Google Client ID, etc.):
   ```bash
   cp .env.example .env
   ```
5. Run the development server:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
   > ⚠️ **Note:** Avoid running with `--reload` when testing SQLite writes. Uvicorn detects file changes in `app.db` or `uploads/`/`generated/` directories and triggers infinite restarts.

### 3. Frontend Setup
1. Navigate to the client directory:
   ```bash
   cd ../client
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Configure environment variables. Copy `.env.example` to `.env` or `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Build the application for production:
   ```bash
   npm run build
   ```

---

## 🌎 Deployment

- **Database:** Supabase PostgreSQL instance. Use direct mode URL for migrations and transaction pooled URL (`postgresql+asyncpg://...`) for API runtime database access.
- **Backend API:** Deployed to **Render** web service (reads `render.yaml`).
- **Frontend Client:** Deployed to **Vercel** with client environment variable pointing to backend service url: `NEXT_PUBLIC_BACKEND_URL`.
