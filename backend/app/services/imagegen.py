import os
import io
import httpx
import urllib.parse
import logging
from typing import Optional, Tuple
from dotenv import load_dotenv

logger = logging.getLogger(__name__)
load_dotenv()


def _is_valid_image_bytes(data: bytes) -> bool:
    """Verifies the byte stream is a real decodable image (not an error page/broken render)."""
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(data))
        img.verify()
        return True
    except Exception:
        return False


def _generate_gradient_placeholder(project_id: int, file_path: str, title: str = "") -> None:
    """
    Generates a branded dark-mode gradient PNG with the project title as a
    last-resort placeholder. Replaces the single hardcoded Unsplash URL so
    every project gets a unique, on-brand fallback instead of the same photo.
    """
    from PIL import Image, ImageDraw, ImageFont

    width, height = 1024, 576
    img = Image.new("RGB", (width, height), (10, 10, 14))
    draw = ImageDraw.Draw(img)

    # Diagonal brand gradient (slate -> deep cyan)
    for y in range(height):
        t = y / height
        r = int(10 + (20 - 10) * t)
        g = int(10 + (60 - 10) * t)
        b = int(14 + (90 - 14) * t)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # Accent refracted light band
    for x in range(width):
        t = x / width
        a = int(40 * (1 - abs(t - 0.5) * 2))
        draw.line([(x, 0), (x, height)], fill=(30, 90, 120), width=1) if a > 0 else None

    # Title text (best-effort font; falls back to default if none available)
    label = (title or "Prism AI")[:60]
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 48)
    except Exception:
        font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), label, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((width - tw) / 2, (height - th) / 2), label, fill=(220, 230, 240), font=font)

    img.save(file_path, "PNG")


async def generate_image(
    prompt: str,
    project_id: int,
    asset_label: str,
    quality: str = "fast",
    title: str = "",
) -> Tuple[str, str]:
    """
    Generates a cover thumbnail image based on a visual prompt.
    Returns: (web_accessible_path_or_url, model_used)

    Provider chain (all free, ordered by quality then reliability):
      1. Hugging Face FLUX.1-dev   (quality mode) — best visual quality
      2. Hugging Face FLUX.1-schnell (fast mode)   — fast, reliable
      3. Pollinations AI            — no-key catchall
      4. Generated gradient placeholder — on-brand SVG/PNG, never fails

    quality="fast" skips FLUX.1-dev and goes straight to schnell (used in the
    main pipeline to keep wall-clock time low).
    """
    import asyncio

    generated_dir = os.getenv("GENERATED_DIR", "./generated")
    project_dir = os.path.join(generated_dir, str(project_id))
    os.makedirs(project_dir, exist_ok=True)

    file_name = f"{asset_label}.png"
    file_path = os.path.join(project_dir, file_name)
    web_accessible_path = f"/generated/{project_id}/{file_name}"

    hf_key = os.getenv("HF_API_KEY")
    has_hf = hf_key and not hf_key.startswith("your-")

    # Build the HF model attempt order based on quality preference
    if quality == "quality" and has_hf:
        hf_models = ["black-forest-labs/FLUX.1-dev", "black-forest-labs/FLUX.1-schnell"]
    elif has_hf:
        hf_models = ["black-forest-labs/FLUX.1-schnell"]
    else:
        hf_models = []

    # 1-2. Hugging Face Serverless Inference (FLUX.1)
    for model_id in hf_models:
        try:
            logger.info(f"Attempting Hugging Face {model_id}...")
            from huggingface_hub import InferenceClient

            client = InferenceClient(token=hf_key)

            def run_sdk():
                return client.text_to_image(prompt, model=model_id)

            image = await asyncio.to_thread(run_sdk)
            buf = io.BytesIO()
            image.save(buf, format="PNG")
            data = buf.getvalue()

            if _is_valid_image_bytes(data):
                with open(file_path, "wb") as f:
                    f.write(data)
                logger.info(f"HF {model_id} image saved ({len(data)} bytes) to {file_path}")
                return web_accessible_path, model_id.split("/")[-1].lower().replace(".", "-")
            else:
                logger.warning(f"HF {model_id} returned invalid image data.")
        except Exception as e:
            logger.warning(f"HF {model_id} failed: {type(e).__name__}: {str(e)[:150]}")

    # 3. Pollinations AI (no-key catchall)
    try:
        logger.info("Attempting Pollinations AI zero-key image fallback...")
        encoded_prompt = urllib.parse.quote(prompt)
        pollinations_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=576&nologo=true&model=flux"

        async with httpx.AsyncClient(follow_redirects=True) as client:
            res = await client.get(pollinations_url, timeout=45.0)
            if res.status_code == 200 and _is_valid_image_bytes(res.content):
                with open(file_path, "wb") as f:
                    f.write(res.content)
                logger.info(f"Pollinations AI image saved to {file_path}")
                return web_accessible_path, "pollinations/flux"
            else:
                logger.warning(f"Pollinations returned status {res.status_code} or invalid image.")
    except Exception as e:
        logger.warning(f"Pollinations AI fallback failed: {type(e).__name__}: {str(e)[:150]}")

    # 4. LAST RESORT: generated gradient placeholder (on-brand, never fails)
    logger.warning("All image generation providers failed. Generating gradient placeholder.")
    try:
        _generate_gradient_placeholder(project_id, file_path, title)
        return web_accessible_path, "placeholder/gradient"
    except Exception as e:
        logger.error(f"Gradient placeholder generation failed: {e}")
        # Absolute final fallback: external Unsplash URL
        placeholder_url = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop"
        return placeholder_url, "unsplash/placeholder"
