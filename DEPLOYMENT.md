# Prism AI — Deployment Guide

This guide describes how to configure, set up, and deploy Prism AI to **Supabase** (PostgreSQL) and **Render** (API hosting and Next.js frontend).

---

## 1. Google OAuth Credentials Setup

To enable user authentication via Google:

1. Visit the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Search for **OAuth consent screen** in the top bar:
   - Choose **External** user type.
   - Fill out the app name (e.g., `Prism AI`), support email, and developer contact details.
   - Click **Save and Continue** (no scopes needed to be added manually, as the application will request `openid`, `email`, and `profile` dynamically).
4. Go to the **Credentials** page:
   - Click **+ Create Credentials** > **OAuth client ID**.
   - Select **Web application** as the application type.
   - **Authorized JavaScript origins**:
     - Local dev: `http://localhost:3000`
     - Production: `https://<your-frontend-domain>.vercel.app` (or your Render frontend domain)
   - **Authorized redirect URIs** (the callback endpoint on the backend):
     - Local dev: `http://localhost:8000/api/auth/google/callback`
     - Production: `https://<your-backend-domain>.onrender.com/api/auth/google/callback`
5. Copy the generated **Client ID** and **Client Secret**.

---

## 2. Database Setup (Supabase)

Prism AI uses PostgreSQL in production. 

1. Create a free account on [Supabase](https://supabase.com/).
2. Create a new project, select a database password, and choose your preferred hosting region.
3. **IMPORTANT FOR RENDER DEPLOYMENTS:** Render does not support outbound IPv6 connections. The direct Supabase connection URL uses IPv6 and will crash with `OSError: [Errno 101] Network is unreachable`. You **must** use the **Connection Pooler** endpoint instead, which is IPv4-compatible:
   - Go to **Project Settings** > **Database** in the Supabase Dashboard.
   - Scroll down to the **Connection pooler** section.
   - Ensure the Mode is set to **Session** (or **Transaction** if you use a serverless setup, though **Session** is recommended on Port 5432 for persistent web services like FastAPI on Render).
   - Copy the pooler connection string.
   - Replace the username with `postgres.[your-project-ref]` and insert your database password.
   - Example Pooler URI format:
     `postgresql://postgres.oopurjqspujanllnqgin:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres`
   - *Note: Our backend dynamically rewrites this string to use the required async driver (`postgresql+asyncpg://`), so you can copy this pooler URI directly without editing the scheme.*

---

## 3. Backend Deployment (Render)

Deploy the FastAPI server to Render:

1. Log in to [Render](https://render.com/).
2. Click **New** > **Web Service**.
3. Connect your Git repository.
4. Configure the Web Service settings:
   - **Name**: `prism-ai-backend`
   - **Root Directory**: `backend` (if you keep backend and frontend in the same repo, specify `backend` as root)
   - **Language**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add the following **Environment Variables** in the Render dashboard:

| Variable | Description | Example (Render / Supabase Connection Pooler) |
|---|---|---|
| `DATABASE_URL` | Supabase Connection Pooler URI (IPv4 Compatible) | `postgresql://postgres.oopurjqspujanllnqgin:your-password@aws-0-ap-south-1.pooler.supabase.com:5432/postgres` |
| `JWT_SECRET` | Secure key to sign user sessions | `generate-a-long-random-string-here` |
| `CLIENT_REDIRECT_URI` | The root URL of your frontend | `http://localhost:3000` (Local) / Vercel Domain (Prod) |
| `GOOGLE_CLIENT_ID` | OAuth Client ID from Google Cloud Console | `123456-example.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | OAuth Client Secret from Google Cloud Console | `GOCSPX-example_secret_key` |
| `GOOGLE_REDIRECT_URI` | Redirect URI matching Google Console callback | `http://localhost:8000/api/auth/google/callback` |
| `NVIDIA_API_KEY` | Optional. Key for NVIDIA NIM models | `nvapi-...` |
| `GEMINI_API_KEY` | Optional. Key for Gemini fallback | `AIzaSy...` |
| `OPENROUTER_API_KEY` | Optional. Key for OpenRouter models | `sk-or-...` |
| `GROQ_API_KEY` | Optional. Key for Groq Whisper transcription | `gsk_...` |
| `HF_API_KEY` | Optional. Key for Hugging Face endpoints | `hf_...` |
| `ASSEMBLYAI_API_KEY`| Optional. Key for AssemblyAI Whisper transcription| `9743...` |

---

## 4. Frontend Deployment (Render or Vercel)

Deploy the Next.js client app:

### Option A: Vercel (Recommended)
1. Import the repository in [Vercel](https://vercel.com/).
2. Configure settings:
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
3. Add the following **Environment Variable**:

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | The URL of your Render backend service | `https://prism-ai-backend.onrender.com` |

---

### Option B: Render Static Site
1. Click **New** > **Static Site** on Render.
2. Connect your Git repository.
3. Configure static site settings:
   - **Name**: `prism-ai-client`
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Publish Directory**: `out` (Note: If using static HTML exports. For full SSR features, deploy Next.js as a Web Service or use Vercel).
4. Add the `NEXT_PUBLIC_BACKEND_URL` environment variable.
