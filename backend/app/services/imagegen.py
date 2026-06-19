import os
import httpx
import base64
import urllib.parse
import logging
from typing import Tuple
from dotenv import load_dotenv

logger = logging.getLogger(__name__)
load_dotenv()

async def generate_image(prompt: str, project_id: int, asset_label: str) -> Tuple[str, str]:
    """
    Generates a cover thumbnail image based on a visual prompt.
    Returns: (web_accessible_path_or_url, model_used)
    
    Fallback chain (ordered by reliability):
      1. Hugging Face SDK (FLUX.1 Schnell - fast, reliable with API key)
      2. Pollinations AI (100% free, no key needed, always works)
      3. Unsplash placeholder (offline last resort)
    
    NOTE: NVIDIA image generation models (stable-diffusion-xl, sdxl-turbo)
    were tested and ALL returned 404. They have been removed from the chain.
    """
    generated_dir = os.getenv("GENERATED_DIR", "./generated")
    project_dir = os.path.join(generated_dir, str(project_id))
    os.makedirs(project_dir, exist_ok=True)
    
    file_name = f"{asset_label}.png"
    file_path = os.path.join(project_dir, file_name)
    web_accessible_path = f"/generated/{project_id}/{file_name}"
    
    # 1. PRIMARY: Hugging Face Serverless Inference (FLUX.1 Schnell) via SDK
    hf_key = os.getenv("HF_API_KEY")
    if hf_key and not hf_key.startswith("your-"):
        try:
            logger.info("Attempting Hugging Face SDK FLUX.1 Schnell...")
            from huggingface_hub import InferenceClient
            import asyncio
            
            client = InferenceClient(token=hf_key)
            
            def run_sdk():
                return client.text_to_image(prompt, model="black-forest-labs/FLUX.1-schnell")
            
            loop = asyncio.get_event_loop()
            image = await loop.run_in_executor(None, run_sdk)
            image.save(file_path)
            
            logger.info(f"Hugging Face FLUX Image saved successfully to {file_path}")
            return web_accessible_path, "black-forest-labs/flux-schnell"
        except Exception as e:
            logger.error("Hugging Face SDK Image generation failed", exc_info=True)

    # 2. FALLBACK: Pollinations AI (100% Free, No-Key Catchall)
    # This works always and produces high-quality images via URL download
    try:
        logger.info("Attempting Pollinations AI zero-key image fallback...")
        encoded_prompt = urllib.parse.quote(prompt)
        # We query the Pollinations Stable Diffusion / Flux wrapper
        pollinations_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=576&nologo=true"
        
        async with httpx.AsyncClient(follow_redirects=True) as client:
            res = await client.get(pollinations_url, timeout=45.0)
            if res.status_code == 200 and len(res.content) > 1000:
                with open(file_path, "wb") as f:
                    f.write(res.content)
                logger.info(f"Pollinations AI Image saved successfully to {file_path}")
                return web_accessible_path, "pollinations/flux"
    except Exception as e:
        logger.error("Pollinations AI Image fallback exception", exc_info=True)

    # 3. LAST RESORT PLACEHOLDER: Returns a high-quality abstract Unsplash placeholder
    # This prevents the app pipeline from crashing if the user is completely offline
    logger.warning("All image generation options failed. Returning high-quality placeholder.")
    placeholder_url = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop"
    return placeholder_url, "unsplash/placeholder"
