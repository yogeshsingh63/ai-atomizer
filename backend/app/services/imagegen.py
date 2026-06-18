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
    Returns: (image_content_string, model_used)
    
    The image is saved to static storage or returned as base64/url depending on configuration.
    To match the GeneratedAsset model, we return the local path or URL to the image file.
    """
    generated_dir = os.getenv("GENERATED_DIR", "./generated")
    project_dir = os.path.join(generated_dir, str(project_id))
    os.makedirs(project_dir, exist_ok=True)
    
    file_name = f"{asset_label}.png"
    file_path = os.path.join(project_dir, file_name)
    web_accessible_path = f"/generated/{project_id}/{file_name}"
    
    # 1. PRIMARY: OpenRouter Image Generation
    api_key = os.getenv("OPENROUTER_API_KEY")
    if api_key and not api_key.startswith("your-"):
        try:
            logger.info("Attempting OpenRouter Image Generation...")
            url = "https://openrouter.ai/api/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
            # We use stabilityai/sdxl or standard image generators on OpenRouter
            payload = {
                "model": "stabilityai/stable-diffusion-xl",
                "prompt": prompt,
                "response_format": {"type": "json_object"}  # Some models output base64 JSON
            }
            
            async with httpx.AsyncClient() as client:
                res = await client.post(url, headers=headers, json=payload, timeout=30.0)
                if res.status_code == 200:
                    data = res.json()
                    # OpenRouter image models return image data, often as base64 in choices
                    choices = data.get("choices", [])
                    if choices:
                        image_data_b64 = choices[0].get("message", {}).get("content", "")
                        if "base64" in image_data_b64:
                            # Clean prefix if it is data:image/png;base64,...
                            if "," in image_data_b64:
                                image_data_b64 = image_data_b64.split(",")[1]
                            image_bytes = base64.b64decode(image_data_b64)
                            with open(file_path, "wb") as f:
                                f.write(image_bytes)
                            logger.info(f"OpenRouter Image saved successfully to {file_path}")
                            return web_accessible_path, "stabilityai/stable-diffusion-xl"
        except Exception as e:
            logger.error(f"OpenRouter Image Generation failed: {e}")

    # 2. FALLBACK 1: Hugging Face Serverless Inference (FLUX.1 Schnell)
    hf_key = os.getenv("HF_API_KEY")
    if hf_key and not hf_key.startswith("your-"):
        try:
            logger.info("Attempting Hugging Face FLUX.1 image fallback...")
            url = "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell"
            headers = {"Authorization": f"Bearer {hf_key}"}
            payload = {"inputs": prompt}
            
            async with httpx.AsyncClient() as client:
                res = await client.post(url, headers=headers, json=payload, timeout=40.0)
                if res.status_code == 200 and len(res.content) > 1000:
                    with open(file_path, "wb") as f:
                        f.write(res.content)
                    logger.info(f"Hugging Face FLUX Image saved successfully to {file_path}")
                    return web_accessible_path, "black-forest-labs/flux-schnell"
                else:
                    logger.warning(f"Hugging Face Image returned status {res.status_code}: {res.text}")
        except Exception as e:
            logger.error(f"Hugging Face Image fallback exception: {e}")

    # 3. FALLBACK 2: Pollinations AI (100% Free, No-Key Catchall)
    # This works always and produces high-quality images via URL download
    try:
        logger.info("Attempting Pollinations AI zero-key image fallback...")
        encoded_prompt = urllib.parse.quote(prompt)
        # We query the Pollinations Stable Diffusion / Flux wrapper
        pollinations_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=576&nologo=true"
        
        async with httpx.AsyncClient() as client:
            res = await client.get(pollinations_url, timeout=30.0)
            if res.status_code == 200 and len(res.content) > 1000:
                with open(file_path, "wb") as f:
                    f.write(res.content)
                logger.info(f"Pollinations AI Image saved successfully to {file_path}")
                return web_accessible_path, "pollinations/flux"
    except Exception as e:
        logger.error(f"Pollinations AI Image fallback exception: {e}")

    # 4. LAST RESORT PLACEHOLDER: Returns a high-quality abstract Unsplash placeholder
    # This prevents the app pipeline from crashing if the user is completely offline
    logger.warning("All image generation options failed. Returning high-quality placeholder.")
    placeholder_url = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop"
    return placeholder_url, "unsplash/placeholder"
