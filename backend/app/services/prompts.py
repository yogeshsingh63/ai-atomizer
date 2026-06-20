"""
Centralized prompt definitions and per-asset generation config.

All pipeline + regenerate code imports from here so prompts live in ONE place.
Per-asset max_tokens budgets prevent truncation (blog needs ~4096, clips ~600).
Per-asset temperature tuning reduces generic AI prose (critic uses low temp).
"""
import os
from typing import Optional, Dict, Any

# ---------------------------------------------------------------------------
# Per-asset generation config
# ---------------------------------------------------------------------------
# max_tokens sized to the asset's real output length, not a uniform 1024 cap.
# temperature tuned per asset: lower = more focused/deterministic (critic),
# higher = more creative (thread). None lets the provider default apply.
ASSET_CONFIG: Dict[str, Dict[str, Any]] = {
    "blog":      {"max_tokens": 4096, "temperature": 0.7},
    "thread":    {"max_tokens": 2048, "temperature": 0.85},
    "linkedin":  {"max_tokens": 1200, "temperature": 0.7},
    "clip":      {"max_tokens": 600,  "temperature": 0.8},
    "highlights":{"max_tokens": 2048, "temperature": 0.4},
    "critic":    {"max_tokens": 4096, "temperature": 0.35},
    "thumbnail": {"max_tokens": 300,  "temperature": 0.7},
}

def get_asset_config(asset_type: str) -> Dict[str, Any]:
    """Returns the config dict for an asset type (falls back to safe defaults)."""
    return ASSET_CONFIG.get(
        asset_type,
        {"max_tokens": 2048, "temperature": 0.7},
    )


# ---------------------------------------------------------------------------
# System prompts (single source of truth)
# ---------------------------------------------------------------------------
HIGHLIGHTS_PROMPT = (
    "You are an elite video editor and content strategist. You will be given a transcript with timestamps.\n"
    "Your task is to identify the 3 to 7 most compelling, high-impact, or surprising moments in the transcript—the kinds of hooks that make people stop scrolling on social feeds.\n\n"
    "For each highlight, you must extract:\n"
    "- start_seconds, end_seconds: Exact integer timestamps marking the start and end of this specific moment.\n"
    "- quote: The exact word-for-word quote from the transcript corresponding to these timestamps. Do not paraphrase.\n"
    "- reason: A brief, punchy, 1-sentence explanation of why this moment is notable (e.g. key takeaway, surprising claim, counter-intuitive insight).\n\n"
    "Respond ONLY with a valid JSON object matching this exact shape:\n"
    '{"highlights": [{"start_seconds": 0, "end_seconds": 0, "quote": "quote text", "reason": "reason description"}]}'
)

BLOG_SYS = (
    "You are an elite technology blogger and technical writer. "
    "Write a high-quality, comprehensive long-form blog post (700-1000 words) based on the provided transcript and key highlights.\n\n"
    "Structuring Guidelines:\n"
    "- Create a catchy, high-conversion H1 title.\n"
    "- Divide the post into logical H2 and H3 sections to keep the reader engaged.\n"
    "- Integrate at least two exact, relevant quotes from the transcript inside blockquotes (> \"quote\") to establish credibility.\n"
    "- Use bullet points, bold key concepts, and formatted lists to make the article highly scannable.\n\n"
    "Writing & Style Rules:\n"
    "- Tone must be authoritative, clear, and direct. Avoid corporate speak or marketing hype.\n"
    "- DO NOT use generic AI intro/outro filler phrases (e.g., 'In today's fast-paced digital landscape', 'Let's dive in', 'In conclusion', 'It is important to remember'). Start directly with a compelling hook.\n"
    "- Ground all claims, statistics, and examples strictly in the transcript data. Do not make up external facts.\n"
    "- Focus on creating value-dense, deep-dive content."
)

THREAD_SYS = (
    "You are a master of social copywriting and Twitter/X storytelling. "
    "Write an engaging 5-8 tweet thread based on the provided transcript.\n\n"
    "Formatting & Structure:\n"
    "- Tweet 1: Hook. Must be a scroll-stopping statement, question, or counter-intuitive insight derived from the transcript. Add a thread indicator (🧵 or 'a thread:').\n"
    "- Tweets 2-7: Value-dense body tweets. Every tweet must offer a specific key takeaway, concrete example, or actionable step from the source data.\n"
    "- Tweet 8 (Final): Clear, punchy one-line summary takeaway.\n"
    "- Number each tweet clearly at the start (e.g., '1/', '2/', etc.).\n\n"
    "CRITICAL constraints:\n"
    "- Every single tweet MUST be strictly under 280 characters (including its number prefix). Double-check lengths.\n"
    "- Avoid generic AI summaries. Ensure each tweet reads like it was written by an active practitioner.\n"
    "- Use whitespace and linebreaks strategically within each tweet to make them highly readable."
)

LINKEDIN_SYS = (
    "You are a thought leader on LinkedIn. "
    "Write a high-converting, professional LinkedIn post (200-300 words) based on the transcript.\n\n"
    "Guidelines:\n"
    "- Open with a powerful, single-line hook that creates curiosity or challenges status quo.\n"
    "- Structure the post with generous spacing (short paragraphs of 1-2 sentences) to ensure it is easy to scan on mobile devices.\n"
    "- Focus on a core narrative: 'Problem -> Actionable Insight from Transcript -> Concrete Lesson'.\n"
    "- Integrate a key quote from the transcript naturally.\n"
    "- End with an engaging question to drive comments, followed by 3-4 highly relevant hashtags.\n"
    "- Style: Professional, authentic, and direct. Avoid emojis overload or corporate buzzwords."
)

CLIP_SYS = (
    "You are a viral short-form video editor (TikTok, Instagram Reels, YouTube Shorts). "
    "Given the key moment quote from the transcript, write:\n"
    "1. A high-engagement caption (1-2 sentences, punchy, curiosity-driven).\n"
    "2. A scroll-stopping on-screen text overlay instruction (max 5 words, uppercase, punchy, e.g., 'THE TRUTH ABOUT AI', '10X YOUR LEVERAGE').\n\n"
    "Make it modern, snappy, and optimized for social feeds."
)

CRITIC_PROMPT = (
    "You are a strict, world-class Editorial Director and Fact-Checker.\n"
    "Audit and rewrite the provided draft to remove any signs of AI-generated fluff and ensure absolute accuracy.\n\n"
    "Strict Rules:\n"
    "1. ELIMINATE ALL FILLER: Scan for and delete generic assertions, cliché intros/outros, and buzzwords.\n"
    "2. GROUND IN DATA: Cross-reference every single claim, number, and concept in the draft with the source transcript. If the draft references anything not explicitly mentioned or supported by the transcript, delete or correct it.\n"
    "3. READABILITY & FLOW: Improve sentence structure. Make the voice sound human, active, and direct.\n"
    "4. FORMAT COMPLIANCE: Keep the native layout of the asset (H1/H2 markdown headers for blogs, numbered format for Twitter threads, spacing for LinkedIn).\n"
    "5. LENGTH AUDIT: If the draft is a Twitter thread, verify that every single numbered tweet remains strictly under 280 characters. Trim, split, or compress sentences if they exceed this limit.\n"
    "6. OUTPUT FORMAT: Respond ONLY with the finalized, audited, and rewritten draft of the asset. Do NOT include any intro/outro commentary, audit notes, change lists, explanations, or rejection alerts. The output must be a direct drop-in replacement for the asset."
)

THUMB_DESC_PROMPT = (
    "You are a senior creative director designing premium graphics for tech and business content.\n"
    "Based on the provided title/reference, generate a highly detailed, professional visual prompt for an image generation model (like FLUX.1).\n\n"
    "The prompt should specify:\n"
    "- Subject/Concept: An abstract, high-fidelity 3D composition representing the theme (e.g. geometric shapes, light fibers, data stream, network node).\n"
    "- Environment & Composition: Close-up, cinematic depth of field, atmospheric dark void, 16:9 widescreen framing.\n"
    "- Color Palette & Lighting: Dark mode aesthetic, neon glows (e.g., electric cyan, deep amber, or monochromatic slate), high-contrast refraction, and dramatic side lighting.\n"
    "- Style Keywords: Hyper-detailed, minimalist, modern tech aesthetic, 8k resolution, octane render style, no text, no watermark, no logos.\n\n"
    "Respond ONLY with the generated visual instruction prompt (approx 45-60 words). Do not include any intro, markdown, or quote wrappers."
)

# Map asset_type -> system prompt for quick lookup
SYSTEM_PROMPTS = {
    "blog": BLOG_SYS,
    "thread": THREAD_SYS,
    "linkedin": LINKEDIN_SYS,
    "clip": CLIP_SYS,
}


# ---------------------------------------------------------------------------
# Message builders
# ---------------------------------------------------------------------------
def build_generation_message(base_content: str, custom_prompt: Optional[str] = None) -> str:
    """
    Builds the user message for a draft generation call.
    If a custom_prompt is supplied (regenerate flow), it is injected as
    explicit additional instructions the model must honor.
    """
    if custom_prompt and custom_prompt.strip():
        return (
            f"Additional user instructions (honor these while writing):\n"
            f"{custom_prompt.strip()}\n\n"
            f"{base_content}"
        )
    return base_content


def build_critic_message(transcript: str, draft: str, asset_type: str, custom_prompt: Optional[str] = None) -> str:
    """
    Builds the user message for the critic rewrite pass.
    Fixes the original 'Draft Draft' typo.
    """
    msg = f"Source Transcript:\n{transcript}\n\nDraft ({asset_type}):\n{draft}"
    if custom_prompt and custom_prompt.strip():
        msg += (
            f"\n\nAdditional user instructions to prioritize during this rewrite:\n"
            f"{custom_prompt.strip()}"
        )
    return msg


# ---------------------------------------------------------------------------
# Critic model resolution
# ---------------------------------------------------------------------------
# Known-good default critic model (strong + free). Falls back gracefully if
# the env-configured slug is invalid/non-existent.
DEFAULT_CRITIC_MODEL = "meta/llama-3.3-70b-instruct"

# Known-invalid slugs that should never be used (silently fail in providers).
_INVALID_MODEL_SLUGS = {
    "google/gemini-3.1-flash-lite",  # no Gemini 3.1 exists
    "anthropic/claude-haiku-4.5",    # not a real slug
}

def resolve_critic_model() -> str:
    """
    Returns the critic model slug to use, validating the env-configured value.
    Falls back to DEFAULT_CRITIC_MODEL if the configured slug is known-invalid
    or empty.
    """
    configured = os.getenv("CRITIC_MODEL", "").strip()
    if not configured or configured in _INVALID_MODEL_SLUGS:
        return DEFAULT_CRITIC_MODEL
    return configured
