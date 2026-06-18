import logging
from typing import List
from fastapi import APIRouter
from app.schemas import ModelResponse, ModelPricing
from app.services.llm import get_all_openrouter_models

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/models", tags=["Models"])

@router.get("", response_model=List[ModelResponse])
async def list_available_models():
    """
    Proxies and formats OpenRouter model lists.
    Merges OpenRouter data with metadata attributes (e.g., human-readable names and free flags).
    """
    try:
        raw_models = await get_all_openrouter_models()
        
        # If OpenRouter didn't return models, fallback to standard mock models
        if not raw_models:
            return get_fallback_models()
            
        formatted_models = []
        # Expose a default 'auto' selector
        formatted_models.append(
            ModelResponse(
                id="auto",
                name="Auto (free, fastest)",
                pricing=ModelPricing(prompt="0", completion="0"),
                is_free=True
            )
        )
        
        for m in raw_models:
            slug = m.get("id")
            name = m.get("name", slug)
            pricing = m.get("pricing", {})
            prompt_cost = pricing.get("prompt", "0")
            completion_cost = pricing.get("completion", "0")
            
            is_free = float(prompt_cost) == 0.0 and float(completion_cost) == 0.0
            
            # Format and append
            formatted_models.append(
                ModelResponse(
                    id=slug,
                    name=name,
                    pricing=ModelPricing(
                        prompt=str(prompt_cost),
                        completion=str(completion_cost)
                    ),
                    is_free=is_free
                )
            )
            
        return formatted_models
    except Exception as e:
        logger.error(f"Failed to list models: {e}")
        return get_fallback_models()

def get_fallback_models() -> List[ModelResponse]:
    """Prepopulated fallback models list if OpenRouter endpoint is offline."""
    return [
        ModelResponse(id="auto", name="Auto (free, fastest)", pricing=ModelPricing(prompt="0", completion="0"), is_free=True),
        ModelResponse(id="google/gemini-2.5-flash", name="Gemini 2.5 Flash", pricing=ModelPricing(prompt="0", completion="0"), is_free=True),
        ModelResponse(id="meta-llama/llama-3.3-70b-instruct:free", name="Llama 3.3 70B (Free)", pricing=ModelPricing(prompt="0", completion="0"), is_free=True),
        ModelResponse(id="deepseek/deepseek-chat:free", name="DeepSeek V3 (Free)", pricing=ModelPricing(prompt="0", completion="0"), is_free=True),
        ModelResponse(id="qwen/qwen-2.5-72b-instruct:free", name="Qwen 2.5 72B (Free)", pricing=ModelPricing(prompt="0", completion="0"), is_free=True),
        ModelResponse(id="anthropic/claude-3.5-sonnet", name="Claude 3.5 Sonnet (Paid)", pricing=ModelPricing(prompt="0.003", completion="0.015"), is_free=False),
        ModelResponse(id="google/gemini-2.5-pro", name="Gemini 2.5 Pro (Paid)", pricing=ModelPricing(prompt="0.00125", completion="0.00375"), is_free=False),
        ModelResponse(id="deepseek/deepseek-r1", name="DeepSeek R1 (Paid)", pricing=ModelPricing(prompt="0.00055", completion="0.00219"), is_free=False),
    ]
