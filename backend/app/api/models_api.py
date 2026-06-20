import logging
from typing import List
from fastapi import APIRouter
from app.schemas import ModelResponse, ModelPricing
from app.services.llm import get_all_openrouter_models

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/models", tags=["Models"])

# NVIDIA NIM models verified working on integrate.api.nvidia.com.
# These are NOT in OpenRouter's catalog, so we expose them statically so users
# can explicitly pin them (otherwise NVIDIA is what "auto" actually uses but
# was previously hidden from the picker — a transparency gap).
NVIDIA_MODELS = [
    ModelResponse(
        id="meta/llama-3.3-70b-instruct",
        name="Llama 3.3 70B (NVIDIA NIM)",
        pricing=ModelPricing(prompt="0", completion="0"),
        is_free=True,
        provider="nvidia",
    ),
    ModelResponse(
        id="nvidia/llama-3.3-nemotron-super-49b-v1",
        name="Nemotron Super 49B (NVIDIA NIM)",
        pricing=ModelPricing(prompt="0", completion="0"),
        is_free=True,
        provider="nvidia",
    ),
    ModelResponse(
        id="meta/llama-4-maverick-17b-128e-instruct",
        name="Llama 4 Maverick 17B (NVIDIA NIM)",
        pricing=ModelPricing(prompt="0", completion="0"),
        is_free=True,
        provider="nvidia",
    ),
    ModelResponse(
        id="meta/llama-3.1-70b-instruct",
        name="Llama 3.1 70B (NVIDIA NIM)",
        pricing=ModelPricing(prompt="0", completion="0"),
        is_free=True,
        provider="nvidia",
    ),
    ModelResponse(
        id="meta/llama-3.1-8b-instruct",
        name="Llama 3.1 8B (NVIDIA NIM)",
        pricing=ModelPricing(prompt="0", completion="0"),
        is_free=True,
        provider="nvidia",
    ),
]

# Gemini SDK models (routed via google-genai, not OpenRouter).
GEMINI_MODELS = [
    ModelResponse(
        id="google/gemini-2.5-flash",
        name="Gemini 2.5 Flash",
        pricing=ModelPricing(prompt="0", completion="0"),
        is_free=True,
        provider="gemini",
    ),
    ModelResponse(
        id="google/gemini-2.0-flash-lite",
        name="Gemini 2.0 Flash Lite",
        pricing=ModelPricing(prompt="0", completion="0"),
        is_free=True,
        provider="gemini",
    ),
]


@router.get("", response_model=List[ModelResponse])
async def list_available_models():
    """
    Returns all selectable models grouped by provider so the UI can show what
    will actually run. Merges NVIDIA NIM + Gemini (static, verified) with
    OpenRouter's live catalog (filtered to free + a few notable paid options).
    """
    try:
        # Auto selector first
        models: List[ModelResponse] = [
            ModelResponse(
                id="auto",
                name="Auto (free, fastest)",
                pricing=ModelPricing(prompt="0", completion="0"),
                is_free=True,
                provider="auto",
            )
        ]

        # NVIDIA NIM models (primary auto-chain provider — must be visible)
        models.extend(NVIDIA_MODELS)

        # Gemini SDK models
        models.extend(GEMINI_MODELS)

        # OpenRouter live catalog (free models + a few notable paid ones)
        raw_models = await get_all_openrouter_models()
        if raw_models:
            notable_paid = {
                "anthropic/claude-3.5-sonnet",
                "google/gemini-2.5-pro",
                "deepseek/deepseek-r1",
            }
            seen_ids = {m.id for m in models}
            for m in raw_models:
                slug = m.get("id")
                if not slug or slug in seen_ids:
                    continue
                pricing = m.get("pricing", {})
                prompt_cost = pricing.get("prompt", "0")
                completion_cost = pricing.get("completion", "0")
                is_free = float(prompt_cost) == 0.0 and float(completion_cost) == 0.0

                # Only include free models + a small curated paid set to keep
                # the picker manageable (OpenRouter returns thousands).
                if is_free or slug in notable_paid:
                    name = m.get("name", slug)
                    models.append(
                        ModelResponse(
                            id=slug,
                            name=name,
                            pricing=ModelPricing(
                                prompt=str(prompt_cost),
                                completion=str(completion_cost),
                            ),
                            is_free=is_free,
                            provider="openrouter",
                        )
                    )
                    seen_ids.add(slug)

        return models
    except Exception as e:
        logger.error(f"Failed to list models: {e}")
        return get_fallback_models()


def get_fallback_models() -> List[ModelResponse]:
    """Prepopulated fallback models list if OpenRouter endpoint is offline."""
    return [
        ModelResponse(id="auto", name="Auto (free, fastest)", pricing=ModelPricing(prompt="0", completion="0"), is_free=True, provider="auto"),
        *NVIDIA_MODELS,
        *GEMINI_MODELS,
        ModelResponse(id="deepseek/deepseek-chat:free", name="DeepSeek V3 (Free)", pricing=ModelPricing(prompt="0", completion="0"), is_free=True, provider="openrouter"),
        ModelResponse(id="qwen/qwen-2.5-72b-instruct:free", name="Qwen 2.5 72B (Free)", pricing=ModelPricing(prompt="0", completion="0"), is_free=True, provider="openrouter"),
        ModelResponse(id="anthropic/claude-3.5-sonnet", name="Claude 3.5 Sonnet (Paid)", pricing=ModelPricing(prompt="0.003", completion="0.015"), is_free=False, provider="openrouter"),
        ModelResponse(id="google/gemini-2.5-pro", name="Gemini 2.5 Pro (Paid)", pricing=ModelPricing(prompt="0.00125", completion="0.00375"), is_free=False, provider="openrouter"),
        ModelResponse(id="deepseek/deepseek-r1", name="DeepSeek R1 (Paid)", pricing=ModelPricing(prompt="0.00055", completion="0.00219"), is_free=False, provider="openrouter"),
    ]
