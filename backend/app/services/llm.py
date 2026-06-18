import os
import time
import httpx
import logging
from typing import List, Dict, Any, Optional, Tuple
from dotenv import load_dotenv

# Import google generative AI if installed
try:
    import google.generativeai as genai
except ImportError:
    genai = None

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

# Cache for OpenRouter models list
_models_cache: Dict[str, Any] = {"models": [], "expires_at": 0}

async def get_all_openrouter_models() -> List[Dict[str, Any]]:
    """Fetches list of all models from OpenRouter and caches for 1 hour."""
    now = time.time()
    if _models_cache["models"] and _models_cache["expires_at"] > now:
        return _models_cache["models"]

    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        logger.warning("OPENROUTER_API_KEY is not configured.")
        return []

    try:
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {api_key}",
                "HTTP-Referer": "https://ai-atomizer.vercel.app",
                "X-Title": "Prism AI",
            }
            res = await client.get("https://openrouter.ai/api/v1/models", headers=headers, timeout=5.0)
            if res.status_code == 200:
                data = res.json()
                models = data.get("data", [])
                _models_cache["models"] = models
                _models_cache["expires_at"] = now + 3600  # 1 hour cache
                return models
    except Exception as e:
        logger.error(f"Failed to fetch OpenRouter models: {e}")
    return _models_cache["models"] or []

async def get_free_openrouter_models() -> List[str]:
    """Retrieves list of free model slugs from OpenRouter."""
    models = await get_all_openrouter_models()
    free_slugs = []
    for m in models:
        pricing = m.get("pricing", {})
        # Filter for models where prompt and completion prices are 0
        prompt_cost = float(pricing.get("prompt", 0))
        completion_cost = float(pricing.get("completion", 0))
        if prompt_cost == 0.0 and completion_cost == 0.0:
            free_slugs.append(m.get("id"))
    
    # Defaults in case of API failure or rate limit
    if not free_slugs:
        free_slugs = [
            "google/gemini-2.5-flash",
            "meta-llama/llama-3.3-70b-instruct:free",
            "deepseek/deepseek-chat:free",
            "qwen/qwen-2.5-72b-instruct:free"
        ]
    return free_slugs

async def chat_completion(
    messages: List[Dict[str, str]],
    system_prompt: Optional[str] = None,
    model_mode: str = "auto",
    pinned_model: Optional[str] = None,
    json_mode: bool = False
) -> Tuple[str, str]:
    """
    Main LLM completion router with fallback mechanics.
    Returns: (generated_text, model_used)
    """
    # 1. Prepare messages list
    formatted_messages = []
    if system_prompt:
        formatted_messages.append({"role": "system", "content": system_prompt})
    formatted_messages.extend(messages)

    # 1. PRIMARY PROVIDER: OpenRouter
    api_key = os.getenv("OPENROUTER_API_KEY")
    if api_key and not api_key.startswith("your-"):
        try:
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://ai-atomizer.vercel.app",
                "X-Title": "Prism AI",
            }
            
            payload: Dict[str, Any] = {
                "messages": formatted_messages,
                "max_tokens": 1000
            }
            if json_mode:
                payload["response_format"] = {"type": "json_object"}
            
            if model_mode == "auto":
                # Use the free model fallback chain
                free_models = await get_free_openrouter_models()
                payload["models"] = free_models[:3]
            else:
                payload["model"] = pinned_model or "google/gemini-2.5-flash"

            logger.info(f"Attempting OpenRouter completion (mode: {model_mode})...")
            async with httpx.AsyncClient() as client:
                res = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=30.0
                )
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"]
                    model_used = data.get("model", pinned_model or "openrouter-unknown")
                    logger.info(f"OpenRouter success. Model used: {model_used}")
                    return content, model_used
                else:
                    logger.warning(f"OpenRouter returned error {res.status_code}: {res.text}")
        except Exception as e:
            logger.error(f"OpenRouter exception: {e}")

    # 2. FALLBACK 1: Google Gemini (Google AI Studio)
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key and not gemini_key.startswith("your-") and genai:
        try:
            logger.info("Attempting Gemini API Fallback...")
            genai.configure(api_key=gemini_key)
            
            # Dynamically map the requested or fallback models to direct Gemini SDK names
            model_name = "gemini-2.5-flash"
            if model_mode == "pinned" and pinned_model:
                if "gemini-2.5-pro" in pinned_model:
                    model_name = "gemini-2.5-pro"
                elif "gemini-2.5-flash" in pinned_model:
                    model_name = "gemini-2.5-flash"
                elif "gemini-1.5-pro" in pinned_model:
                    model_name = "gemini-1.5-pro"
                elif "gemini-1.5-flash" in pinned_model:
                    model_name = "gemini-1.5-flash"
                elif "pro" in pinned_model:
                    model_name = "gemini-2.5-pro"
            
            # Map prompt formats
            contents = []
            if system_prompt:
                contents.append(f"System instructions:\n{system_prompt}\n")
            for m in messages:
                contents.append(f"{m['role'].capitalize()}: {m['content']}")
            
            # Request generation
            model = genai.GenerativeModel(model_name)
            response = model.generate_content("\n\n".join(contents))
            if response.text:
                logger.info(f"Gemini fallback success. Model: {model_name}")
                return response.text, f"gemini/{model_name}"
        except Exception as e:
            logger.error(f"Gemini Fallback exception: {e}")

    # 3. FALLBACK 2: Groq API
    groq_key = os.getenv("GROQ_API_KEY")
    if groq_key and not groq_key.startswith("your-"):
        try:
            logger.info("Attempting Groq API Fallback...")
            headers = {
                "Authorization": f"Bearer {groq_key}",
                "Content-Type": "application/json"
            }
            model_slug = "llama-3.3-70b-versatile"
            if model_mode == "pinned" and pinned_model:
                model_slug = "llama-3.3-70b-versatile"
            
            payload = {
                "messages": formatted_messages,
                "model": model_slug
            }
            if json_mode:
                payload["response_format"] = {"type": "json_object"}

            async with httpx.AsyncClient() as client:
                res = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=20.0
                )
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"]
                    logger.info(f"Groq fallback success. Model: {model_slug}")
                    return content, f"groq/{model_slug}"
                else:
                    logger.warning(f"Groq returned error {res.status_code}: {res.text}")
        except Exception as e:
            logger.error(f"Groq Fallback exception: {e}")

    # 4. FALLBACK 3: Local Ollama (Local offline inference)
    ollama_host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    try:
        logger.info(f"Attempting Ollama local Fallback ({ollama_host})...")
        payload = {
            "model": "llama3",
            "messages": formatted_messages,
            "stream": False
        }
        if json_mode:
            payload["format"] = "json"

        async with httpx.AsyncClient() as client:
            res = await client.post(
                f"{ollama_host}/api/chat",
                json=payload,
                timeout=30.0
            )
            if res.status_code == 200:
                data = res.json()
                content = data["message"]["content"]
                logger.info("Ollama local fallback success. Model: llama3")
                return content, "ollama/llama3"
    except Exception as e:
        logger.error(f"Ollama Fallback exception: {e}")

    raise RuntimeError("All LLM providers in the fallback chain failed to generate completions.")
