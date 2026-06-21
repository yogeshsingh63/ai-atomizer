from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

# Config standard configuration for Pydantic V2
class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

# User Schemas
class UserBase(ORMModel):
    email: Optional[str] = None
    name: str
    avatar_url: Optional[str] = None
    is_guest: bool = False

class UserResponse(UserBase):
    id: int
    created_at: datetime

# Auth Schemas
class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# Project Schemas
class ProjectCreate(BaseModel):
    title: Optional[str] = None
    source_type: str  # youtube_url | upload | article_text
    source_ref: str
    default_model_mode: str = "auto"  # auto | pinned
    default_pinned_model: Optional[str] = None
    target_assets: Optional[str] = None  # JSON array string of asset types to generate
    puter_user_id: Optional[str] = None  # Puter.js user UUID (links project to Puter account)

class ProjectResponse(ORMModel):
    id: int
    title: str
    source_type: str
    source_ref: str
    status: str
    default_model_mode: str
    default_pinned_model: Optional[str]
    target_assets: Optional[str] = None
    puter_user_id: Optional[str] = None
    user_id: int
    created_at: datetime

# Transcript Schemas
class TranscriptSegmentSchema(BaseModel):
    start_seconds: float
    end_seconds: float
    text: str

class TranscriptResponse(ORMModel):
    id: int
    project_id: int
    full_text: str
    segments: List[TranscriptSegmentSchema]

# Highlight Schemas
class HighlightResponse(ORMModel):
    id: int
    project_id: int
    start_seconds: int
    end_seconds: int
    quote: str
    reason: str

# Generated Asset Schemas
class GeneratedAssetResponse(ORMModel):
    id: int
    project_id: int
    asset_type: str
    content: str
    related_highlight_id: Optional[int] = None
    model_used: str
    status: str
    created_at: datetime

class AssetRegenerateRequest(BaseModel):
    model: Optional[str] = None  # Specific pinned model slug to regenerate with
    prompt: Optional[str] = None  # Custom user instructions to steer regeneration
    model_mode: Optional[str] = None  # "auto" | "pinned" (defaults based on model)

# Job Schemas
class JobResponse(ORMModel):
    id: int
    project_id: int
    stage: str
    status: str
    error_message: Optional[str] = None
    model_used: Optional[str] = None
    updated_at: datetime

# Model Selector Schemas
class ModelPricing(BaseModel):
    prompt: str
    completion: str

class ModelResponse(BaseModel):
    id: str
    name: str
    pricing: ModelPricing
    is_free: bool
    provider: str = "openrouter"  # nvidia | gemini | openrouter | groq | auto
