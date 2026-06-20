"use client";

import React, { useState } from "react";
import { RefreshCw, ChevronDown, X, Sparkles } from "lucide-react";
import { ModelSelector } from "@/components/model-selector";
import { AssetType } from "@/lib/api";
import { cn } from "@/lib/utils";

interface CardRegenPanelProps {
  assetType: AssetType;
  onRegenerate: (opts: { prompt?: string | null; model?: string | null; model_mode?: string | null }) => Promise<void>;
  disabled?: boolean;
}

const PLACEHOLDERS: Record<AssetType, string> = {
  blog: "e.g. Make it more technical, add code examples, tighten the intro hook...",
  thread: "e.g. Punchier hooks, add a controversial take, use more line breaks...",
  linkedin: "e.g. More personal first-person narrative, add a specific data point...",
  clip: "e.g. Edgier Gen-Z caption, shorter on-screen text, more curiosity...",
  thumbnail: "e.g. Darker palette, neon cyan accent, more abstract geometric...",
};

const LABELS: Record<AssetType, string> = {
  blog: "Blog",
  thread: "Thread",
  linkedin: "LinkedIn",
  clip: "Clip",
  thumbnail: "Thumbnail",
};

export const CardRegenPanel = ({ assetType, onRegenerate, disabled }: CardRegenPanelProps) => {
  const [expanded, setExpanded] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<"auto" | "pinned">("auto");
  const [model, setModel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegen = async () => {
    setLoading(true);
    try {
      await onRegenerate({
        prompt: prompt.trim() || null,
        model: mode === "pinned" ? model : null,
        model_mode: mode,
      });
      setExpanded(false);
      setPrompt("");
    } catch (e) {
      console.error("Card regen failed:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full" onClick={(e) => e.stopPropagation()}>
      {/* Toggle button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        disabled={disabled || loading}
        className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl border border-neutral-800 hover:border-brand-border bg-neutral-950 hover:bg-neutral-900/60 transition-colors cursor-pointer text-[11px] font-bold text-neutral-300 active:scale-[0.98] duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RefreshCw className={cn("w-3.5 h-3.5 shrink-0", loading && "animate-spin")} />
        <span>{loading ? "Regenerating..." : `Regenerate ${LABELS[assetType]}`}</span>
        <ChevronDown className={cn("w-3 h-3 shrink-0 transition-transform", expanded && "rotate-180")} />
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="mt-2.5 flex flex-col gap-2.5 p-3 rounded-xl bg-neutral-950/80 border border-neutral-900">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              <Sparkles className="w-3 h-3 text-brand" />
              Custom Instructions
            </span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
              className="text-neutral-600 hover:text-neutral-400 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={PLACEHOLDERS[assetType]}
            rows={2}
            className="w-full bg-neutral-900 border border-neutral-800 focus:border-brand-border focus:ring-1 focus:ring-brand/30 rounded-lg px-3 py-2 text-xs text-neutral-200 outline-none transition-all duration-200 resize-none no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          />

          <ModelSelector
            mode={mode}
            pinnedModel={model}
            onChange={(m, mdl) => { setMode(m); setModel(mdl); }}
            size="sm"
            dropup
            className="w-full"
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleRegen(); }}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-brand/15 hover:bg-brand/25 border border-brand-border text-brand text-[11px] font-bold transition-colors cursor-pointer active:scale-[0.98] disabled:opacity-50"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
              {loading ? "Working..." : "Confirm Regenerate"}
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
              className="py-2 px-3 rounded-lg border border-neutral-800 hover:border-neutral-700 text-neutral-400 text-[11px] font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
