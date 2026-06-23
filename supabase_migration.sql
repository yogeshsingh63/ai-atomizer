-- Supabase PostgreSQL Migration Script
-- Run this in the Supabase SQL Editor to initialize all necessary tables and indexes.

-- 1. Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    is_guest BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Create Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    source_type VARCHAR(50) NOT NULL,  -- youtube_url | upload | article_text
    source_ref TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',  -- pending | transcribing | extracting | generating | done | failed
    default_model_mode VARCHAR(20) DEFAULT 'auto',  -- auto | pinned
    default_pinned_model VARCHAR(255),
    target_assets TEXT,  -- JSON list stored as text (e.g. '["blog", "thread"]')
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. Create Transcripts Table
CREATE TABLE IF NOT EXISTS transcripts (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE UNIQUE NOT NULL,
    full_text TEXT NOT NULL,
    segments JSONB NOT NULL  -- JSON list of {start_seconds, end_seconds, text}
);

-- 4. Create Highlights Table
CREATE TABLE IF NOT EXISTS highlights (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    start_seconds INTEGER NOT NULL,
    end_seconds INTEGER NOT NULL,
    quote TEXT NOT NULL,
    reason TEXT NOT NULL
);

-- 5. Create Generated Assets Table
CREATE TABLE IF NOT EXISTS generated_assets (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    asset_type VARCHAR(50) NOT NULL,  -- blog | thread | linkedin | clip | thumbnail
    content TEXT NOT NULL,  -- Text content or cover image relative path
    related_highlight_id INTEGER REFERENCES highlights(id) ON DELETE SET NULL,
    model_used VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',  -- pending | done | failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 6. Create Jobs Table
CREATE TABLE IF NOT EXISTS jobs (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    stage VARCHAR(100) NOT NULL,  -- Transcribing | Extracting | Generating | Critic Pass | Image Gen
    status VARCHAR(50) DEFAULT 'pending',  -- pending | running | completed | failed
    error_message TEXT,
    model_used VARCHAR(255),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Add Indexes for Performance optimization
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_highlights_project_id ON highlights(project_id);
CREATE INDEX IF NOT EXISTS idx_generated_assets_project_id ON generated_assets(project_id);
CREATE INDEX IF NOT EXISTS idx_jobs_project_id ON jobs(project_id);
