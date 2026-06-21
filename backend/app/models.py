from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.db import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=True)
    name = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    is_guest = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    source_type = Column(String, nullable=False)  # youtube_url | upload | article_text
    source_ref = Column(Text, nullable=False)
    status = Column(String, default="pending")  # pending | transcribing | extracting | generating | audio_ready | done | failed
    default_model_mode = Column(String, default="auto")  # auto | pinned
    default_pinned_model = Column(String, nullable=True)
    target_assets = Column(Text, nullable=True)  # JSON array of asset types to generate, e.g. '["blog","thread","linkedin","clip"]'
    puter_user_id = Column(String, nullable=True, index=True)  # Puter.js user UUID (null for guest users)
    pipeline_mode = Column(String, default="backend")  # "backend" (guest pipeline) | "puter" (client-side pipeline)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="projects")
    transcript = relationship("Transcript", back_populates="project", uselist=False, cascade="all, delete-orphan")
    highlights = relationship("Highlight", back_populates="project", cascade="all, delete-orphan")
    assets = relationship("GeneratedAsset", back_populates="project", cascade="all, delete-orphan")
    jobs = relationship("Job", back_populates="project", cascade="all, delete-orphan")

class Transcript(Base):
    __tablename__ = "transcripts"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), unique=True, nullable=False)
    full_text = Column(Text, nullable=False)
    segments = Column(JSON, nullable=False)  # JSON list of {start_seconds, end_seconds, text}

    project = relationship("Project", back_populates="transcript")

class Highlight(Base):
    __tablename__ = "highlights"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    start_seconds = Column(Integer, nullable=False)
    end_seconds = Column(Integer, nullable=False)
    quote = Column(Text, nullable=False)
    reason = Column(Text, nullable=False)

    project = relationship("Project", back_populates="highlights")
    assets = relationship("GeneratedAsset", back_populates="highlight")

class GeneratedAsset(Base):
    __tablename__ = "generated_assets"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    asset_type = Column(String, nullable=False)  # blog | thread | linkedin | clip | thumbnail
    content = Column(Text, nullable=False)  # Text content or image path
    related_highlight_id = Column(Integer, ForeignKey("highlights.id"), nullable=True)
    model_used = Column(String, nullable=False)
    status = Column(String, default="pending")  # pending | done | failed
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="assets")
    highlight = relationship("Highlight", back_populates="assets")

class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    stage = Column(String, nullable=False)  # Transcribing | Extracting | Generating | Critic Pass | Image Gen
    status = Column(String, default="pending")  # pending | running | completed | failed
    error_message = Column(Text, nullable=True)
    model_used = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="jobs")
