import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

# Load env variables first
load_dotenv()

# Prepend local bin directory to PATH if it exists (for portable ffmpeg/ffprobe)
bin_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "bin")
if os.path.exists(bin_path):
    os.environ["PATH"] = bin_path + os.path.pathsep + os.environ["PATH"]

from app.db import engine, Base
# Import models to ensure they register on Base metadata
from app import models
from app.api import auth, projects, assets, models_api

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

GENERATED_DIR = os.getenv("GENERATED_DIR", "./generated")
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")

# Ensure static directories exist
os.makedirs(GENERATED_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handles startup DB table initialization and clean shutdowns."""
    logger.info("Initializing database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # create_all only creates missing tables, not columns. Add the
        # target_assets column to existing projects tables (idempotent).
        try:
            await conn.execute(
                __import__("sqlalchemy").text(
                    "ALTER TABLE projects ADD COLUMN target_assets TEXT"
                )
            )
            logger.info("Added target_assets column to projects table.")
        except Exception:
            # Column already exists — expected on subsequent boots.
            pass
        # Same idempotent migration for puter_user_id
        try:
            await conn.execute(
                __import__("sqlalchemy").text(
                    "ALTER TABLE projects ADD COLUMN puter_user_id VARCHAR"
                )
            )
            await conn.execute(
                __import__("sqlalchemy").text(
                    "CREATE INDEX IF NOT EXISTS ix_projects_puter_user_id ON projects (puter_user_id)"
                )
            )
            logger.info("Added puter_user_id column to projects table.")
        except Exception:
            pass
        # Same idempotent migration for pipeline_mode
        try:
            await conn.execute(
                __import__("sqlalchemy").text(
                    "ALTER TABLE projects ADD COLUMN pipeline_mode VARCHAR DEFAULT 'backend'"
                )
            )
            logger.info("Added pipeline_mode column to projects table.")
        except Exception:
            pass
    logger.info("Database initialized successfully.")
    yield
    logger.info("Disposing database connections...")
    await engine.dispose()

app = FastAPI(
    title="Prism AI Backend API",
    description="Content Repurposing Pipeline and Fallback AI Engine",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configurations
# Allowing client localhost default, Vercel deployments, and all request types
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://ai-atomizer.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(assets.router, prefix="/api")
app.include_router(models_api.router, prefix="/api")

# Mount static generated thumbnails directory
app.mount("/generated", StaticFiles(directory=GENERATED_DIR), name="generated")
# Mount static uploads directory (Puter.js users fetch audio from here for transcription)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.get("/health", tags=["Health"])
async def health_check():
    """Simple backend online status check."""
    return {"status": "ok"}
