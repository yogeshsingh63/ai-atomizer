"use client";

import puter from "@heyputer/puter.js";

/**
 * Extracts plain text from a Puter.js chat response, which can be a string,
 * a ChatResponse object, or an async iterable (when stream:true).
 */
function extractText(resp: any): string {
  if (typeof resp === "string") return resp;
  if (resp?.message?.content) {
    const c = resp.message.content;
    if (typeof c === "string") return c;
    if (Array.isArray(c)) {
      return c
        .filter((p: any) => typeof p === "string" || p?.text)
        .map((p: any) => (typeof p === "string" ? p : p.text))
        .join("");
    }
  }
  if (resp?.text) return resp.text;
  return String(resp || "");
}

// Pipeline asset type → Puter system prompt
// These mirror the prompts in backend/app/services/prompts.py

const PROMPTS = {
  blog: `You are an elite technology blogger and technical writer. Write a high-quality, comprehensive long-form blog post (700-1000 words) based on the provided transcript and key highlights.

Structuring Guidelines:
- Create a catchy, high-conversion H1 title.
- Divide the post into logical H2 and H3 sections to keep the reader engaged.
- Integrate at least two exact, relevant quotes from the transcript inside blockquotes (> "quote") to establish credibility.
- Use bullet points, bold key concepts, and formatted lists to make the article highly scannable.

Writing & Style Rules:
- Tone must be authoritative, clear, and direct. Avoid corporate speak or marketing hype.
- DO NOT use generic AI intro/outro filler phrases. Start directly with a compelling hook.
- Ground all claims, statistics, and examples strictly in the transcript data. Do not make up external facts.
- Focus on creating value-dense, deep-dive content.

Respond ONLY with the final blog post markdown. No intro/outro commentary.`,
  thread: `You are a master of social copywriting and Twitter/X storytelling. Write an engaging 5-8 tweet thread based on the provided transcript.

Formatting & Structure:
- Tweet 1: Hook. Must be a scroll-stopping statement, question, or counter-intuitive insight. Add a thread indicator (🧵 or 'a thread:').
- Tweets 2-7: Value-dense body tweets. Every tweet must offer a specific key takeaway, concrete example, or actionable step from the source data.
- Tweet 8 (Final): Clear, punchy one-line summary takeaway.
- Number each tweet clearly at the start (e.g., '1/', '2/', etc.).

CRITICAL constraints:
- Every single tweet MUST be strictly under 280 characters (including its number prefix). Double-check lengths.
- Avoid generic AI summaries. Ensure each tweet reads like it was written by an active practitioner.

Respond ONLY with the thread. No intro/outro.`,
  linkedin: `You are a thought leader on LinkedIn. Write a high-converting, professional LinkedIn post (200-300 words) based on the transcript.

Guidelines:
- Open with a powerful, single-line hook that creates curiosity or challenges status quo.
- Structure the post with generous spacing (short paragraphs of 1-2 sentences) to ensure it is easy to scan on mobile devices.
- Focus on a core narrative: 'Problem -> Actionable Insight from Transcript -> Concrete Lesson'.
- Integrate a key quote from the transcript naturally.
- End with an engaging question to drive comments, followed by 3-4 highly relevant hashtags.

Respond ONLY with the LinkedIn post. No intro/outro.`,
  clip: `You are a viral short-form video editor (TikTok, Instagram Reels, YouTube Shorts). Given the key moment quote from the transcript, write:
1. A high-engagement caption (1-2 sentences, punchy, curiosity-driven).
2. A scroll-stopping on-screen text overlay instruction (max 5 words, uppercase, punchy, e.g., 'THE TRUTH ABOUT AI', '10X YOUR LEVERAGE').

Make it modern, snappy, and optimized for social feeds. Respond ONLY with the caption and overlay.`,
  highlights: `You are an elite video editor and content strategist. You will be given a transcript with timestamps. Identify the 3 to 7 most compelling, high-impact, or surprising moments — the kinds of hooks that make people stop scrolling on social feeds.

For each highlight, extract:
- start_seconds, end_seconds: Exact integer timestamps marking the start and end.
- quote: The exact word-for-word quote from the transcript. Do not paraphrase.
- reason: A brief, punchy, 1-sentence explanation of why this moment is notable.

Respond ONLY with a valid JSON object: {"highlights": [{"start_seconds": 0, "end_seconds": 0, "quote": "", "reason": ""}]}`,
  critic: `You are a strict, world-class Editorial Director and Fact-Checker. Audit and rewrite the provided draft to remove any signs of AI-generated fluff and ensure absolute accuracy.

Strict Rules:
1. ELIMINATE ALL FILLER: Scan for and delete generic assertions, cliché intros/outros, and buzzwords.
2. GROUND IN DATA: Cross-reference every single claim with the source transcript. If the draft references anything not explicitly mentioned or supported by the transcript, delete or correct it.
3. READABILITY & FLOW: Improve sentence structure. Make the voice sound human, active, and direct.
4. FORMAT COMPLIANCE: Keep the native layout of the asset (H1/H2 markdown headers for blogs, numbered format for Twitter threads, spacing for LinkedIn).
5. LENGTH AUDIT: If the draft is a Twitter thread, verify that every single numbered tweet remains strictly under 280 characters. Trim, split, or compress sentences if they exceed this limit.
6. OUTPUT FORMAT: Respond ONLY with the finalized, audited, and rewritten draft. Do NOT include any intro/outro commentary, audit notes, change lists, explanations, or rejection alerts. The output must be a direct drop-in replacement for the asset.`,
  thumbDesc: `You are a senior creative director designing premium graphics for tech and business content. Based on the provided title/reference, generate a highly detailed, professional visual prompt for an image generation model (like FLUX.1).

The prompt should specify:
- Subject/Concept: An abstract, high-fidelity 3D composition representing the theme (e.g. geometric shapes, light fibers, data stream, network node).
- Environment & Composition: Close-up, cinematic depth of field, atmospheric dark void, 16:9 widescreen framing.
- Color Palette & Lighting: Dark mode aesthetic, neon glows (electric cyan, deep amber, or monochromatic slate), high-contrast refraction, dramatic side lighting.
- Style Keywords: Hyper-detailed, minimalist, modern tech aesthetic, 8k resolution, octane render style, no text, no watermark, no logos.

Respond ONLY with the generated visual instruction prompt (approx 45-60 words). No intro, markdown, or quote wrappers.`,
};

export type PuterAssetType = "blog" | "thread" | "linkedin" | "clip";

export interface PuterHighlight {
  start_seconds: number;
  end_seconds: number;
  quote: string;
  reason: string;
}

export interface PuterTranscript {
  full_text: string;
  segments: Array<{ start_seconds: number; end_seconds: number; text: string }>;
}

export interface PuterPipelineResult {
  transcript: PuterTranscript;
  highlights: PuterHighlight[];
  assets: Array<{
    asset_type: PuterAssetType | "thumbnail";
    content: string;
    related_highlight_id: number | null;
    model_used: string;
  }>;
}

export interface PuterPipelineOptions {
  model: string;        // e.g. "gpt-5-nano", "claude-sonnet-4-5"
  modelMode: "auto" | "pinned";
  targetAssets: PuterAssetType[];
  title: string;
  sourceType: "youtube_url" | "upload" | "article_text";
  sourceRef: string;
  file?: File;
  onProgress?: (stage: string, status: string) => void;
}

/**
 * Run the full content repurposing pipeline in the browser using Puter.js.
 * LLM costs are billed to the user's Puter account (user-pays model).
 */
export async function runPuterPipeline(
  opts: PuterPipelineOptions
): Promise<PuterPipelineResult> {
  const { model, targetAssets, title, sourceType, sourceRef, file, onProgress } = opts;

  const emit = (stage: string, status: string) => {
    onProgress?.(stage, status);
  };

  // --- Step 1: Transcription ---
  emit("Transcribing", "running");
  let transcript: PuterTranscript;
  if (sourceType === "article_text") {
    transcript = {
      full_text: sourceRef,
      segments: [{ start_seconds: 0, end_seconds: 0, text: sourceRef }],
    };
  } else {
    // For YouTube URLs and uploads, transcribe the audio via Puter.
    // For YouTube: caller should have already provided a file or we download via backend first.
    // For uploads: pass the file directly to speech2txt.
    if (!file) {
      throw new Error("Audio file required for transcription");
    }
    const result: any = await puter.ai.speech2txt(file);
    const text = typeof result === "string" ? result : extractText(result) || result?.text || "";
    transcript = {
      full_text: text,
      segments: [{ start_seconds: 0, end_seconds: 0, text }],
    };
  }
  emit("Transcribing", "completed");

  // --- Step 2: Highlights extraction (only if clips selected) ---
  let highlights: PuterHighlight[] = [];
  if (targetAssets.includes("clip")) {
    emit("Extracting Highlights", "running");
    const transcriptInput = transcript.segments
      .map((s) => `[${s.start_seconds}s - ${s.end_seconds}s]: ${s.text}`)
      .join("\n");
    const highlightsRaw = await puter.ai.chat(
      [
        { role: "system", content: PROMPTS.highlights, images: [] },
        { role: "user", content: `Transcript:\n${transcriptInput}`, images: [] },
      ],
      { model, temperature: 0.4, max_tokens: 2048 }
    );
    const highlightsText = extractText(highlightsRaw);
    try {
      const parsed = JSON.parse(highlightsText);
      highlights = (parsed.highlights || []).map((h: any, i: number) => ({
        id: i + 1,
        start_seconds: Math.floor(h.start_seconds || 0),
        end_seconds: Math.floor(h.end_seconds || 0),
        quote: h.quote || "",
        reason: h.reason || "",
      }));
    } catch {
      highlights = [];
    }
    emit("Extracting Highlights", "completed");
  }

  // --- Step 3: Content generation (all assets in parallel) ---
  emit("Generating Assets", "running");
  const highlightsSummary = highlights
    .map((h) => `- Quote: "${h.quote}" (Reason: ${h.reason})`)
    .join("\n");
  const userContent = `Source Transcript:\n${transcript.full_text}\n\nKey Highlights to cover:\n${highlightsSummary}`;

  // Helper to call Puter chat and return plain text. System prompt is
  // prepended to the messages array (Puter's ChatOptions doesn't support a
  // separate 'system' field for the messages-array overload).
  const callPuter = (sysPrompt: string, content: string, maxTokens: number, temp: number) =>
    puter.ai
      .chat(
        [
          { role: "system", content: sysPrompt, images: [] },
          { role: "user", content, images: [] },
        ],
        { model, max_tokens: maxTokens, temperature: temp }
      )
      .then(extractText);

  // Build parallel generation tasks
  const draftTasks: Array<Promise<{ type: PuterAssetType; text: string }>> = [];
  if (targetAssets.includes("blog")) {
    draftTasks.push(
      callPuter(PROMPTS.blog, userContent, 4096, 0.7).then((text) => ({ type: "blog" as const, text }))
    );
  }
  if (targetAssets.includes("thread")) {
    draftTasks.push(
      callPuter(PROMPTS.thread, userContent, 2048, 0.85).then((text) => ({ type: "thread" as const, text }))
    );
  }
  if (targetAssets.includes("linkedin")) {
    draftTasks.push(
      callPuter(PROMPTS.linkedin, userContent, 1200, 0.7).then((text) => ({ type: "linkedin" as const, text }))
    );
  }

  const drafts = await Promise.all(draftTasks);

  // Clip captions: one per highlight, in parallel
  let clipResults: Array<{ highlightIndex: number; text: string }> = [];
  if (targetAssets.includes("clip") && highlights.length > 0) {
    clipResults = await Promise.all(
      highlights.map(async (h, i) => ({
        highlightIndex: i,
        text: await callPuter(PROMPTS.clip, `Moment Quote: "${h.quote}"`, 600, 0.8),
      }))
    );
  }

  // --- Step 4: Critic pass (parallel) ---
  emit("Running Critic Review", "running");
  const criticTasks = drafts.map(async (d) => {
    const criticMsg = `Source Transcript:\n${transcript.full_text}\n\nDraft (${d.type}):\n${d.text}`;
    const text = await callPuter(PROMPTS.critic, criticMsg, 4096, 0.35);
    return { type: d.type, text };
  });
  const clipCriticTasks = clipResults.map(async (c) => {
    const criticMsg = `Source Transcript:\n${transcript.full_text}\n\nDraft (clip suggestion):\n${c.text}`;
    const text = await callPuter(PROMPTS.critic, criticMsg, 600, 0.35);
    return { highlightIndex: c.highlightIndex, text };
  });
  const [criticResults, clipCriticResults] = await Promise.all([
    Promise.all(criticTasks),
    Promise.all(clipCriticTasks),
  ]);

  // --- Step 5: Image gen (blog cover, only if blog selected) ---
  let thumbnailContent: string | null = null;
  let thumbnailModel = "";
  if (targetAssets.includes("blog")) {
    try {
      const desc = await callPuter(PROMPTS.thumbDesc, `Reference: ${title}`, 300, 0.7);
      const img: any = await puter.ai.txt2img(desc, {
        model: "openai-image-generation",
        quality: "medium",
      });
      thumbnailContent = img?.src || img?.image_url || null;
      thumbnailModel = "puter/gpt-image-1-mini";
    } catch (e) {
      thumbnailContent = null;
    }
  }

  emit("Running Critic Review", "completed");

  // --- Assemble result ---
  const assets: PuterPipelineResult["assets"] = [];
  for (const c of criticResults) {
    assets.push({
      asset_type: c.type,
      content: c.text,
      related_highlight_id: null,
      model_used: model,
    });
  }
  for (const c of clipCriticResults) {
    assets.push({
      asset_type: "clip",
      content: c.text,
      related_highlight_id: c.highlightIndex + 1,
      model_used: model,
    });
  }
  if (thumbnailContent) {
    assets.push({
      asset_type: "thumbnail",
      content: thumbnailContent,
      related_highlight_id: null,
      model_used: thumbnailModel,
    });
  }

  return { transcript, highlights, assets };
}
