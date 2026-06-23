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

# Ensure static directories exist with resilient fallback
try:
    os.makedirs(GENERATED_DIR, exist_ok=True)
except PermissionError:
    logger.warning(f"Permission denied creating GENERATED_DIR at {GENERATED_DIR}. Falling back to local './generated'.")
    GENERATED_DIR = "./generated"
    os.makedirs(GENERATED_DIR, exist_ok=True)

try:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
except PermissionError:
    logger.warning(f"Permission denied creating UPLOAD_DIR at {UPLOAD_DIR}. Falling back to local './uploads'.")
    UPLOAD_DIR = "./uploads"
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
# Default origins: localhost:3000 (dev) + the configured CLIENT_REDIRECT_URI (Vercel).
# Override via ALLOWED_ORIGINS env var (comma-separated) for additional domains.
_default_origins = [
    "http://localhost:3000",
    os.getenv("CLIENT_REDIRECT_URI", "http://localhost:3000"),
]
_extra = os.getenv("ALLOWED_ORIGINS", "")
if _extra:
    _default_origins += [o.strip() for o in _extra.split(",") if o.strip()]
# Dedup
allow_origins = list(dict.fromkeys(_default_origins))
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
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
# Mount static uploads directory
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.get("/", tags=["Health"])
async def root_check():
    """Root health check for deployment platform uptime probes."""
    return {"status": "ok", "service": "prism-ai-backend"}

@app.get("/health", tags=["Health"])
async def health_check():
    """Simple backend online status check."""
    return {"status": "ok"}
