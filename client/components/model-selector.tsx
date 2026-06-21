"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Pin, ChevronDown, Check } from "lucide-react";
import { Model, getModels } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ModelSelectorProps {
  mode: "auto" | "pinned";
  pinnedModel: string | null;
  onChange: (mode: "auto" | "pinned", pinnedModel: string | null) => void;
  className?: string;
  size?: "sm" | "md";
  dropup?: boolean;
  /** When true, Puter.js models are shown at the top (curated, user-pays). */
  puterAuthed?: boolean;
}

const PROVIDER_LABELS: Record<string, string> = {
  nvidia: "NVIDIA NIM",
  gemini: "Gemini",
  openrouter: "OpenRouter",
  groq: "Groq",
  puter: "Puter.js (Your Account)",
};

export const ModelSelector = ({
  mode,
  pinnedModel,
  onChange,
  className,
  size = "md",
  dropup = false,
  puterAuthed = false,
}: ModelSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoDropup, setAutoDropup] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadModels() {
      setLoading(true);
      try {
        const data = await getModels();
        setModels(data);
        // If there's no pinned model select the first non-auto model as default pinned
        if (!pinnedModel && data.length > 0) {
          const firstRealModel = data.find(m => m.id !== 'auto') || data[0];
          onChange(mode, firstRealModel.id);
        }
      } catch (e) {
        console.error("Failed to load models:", e);
      } finally {
        setLoading(false);
      }
    }
    loadModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Outside-click + Escape to close the dropdown
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  const handleModeChange = (newMode: "auto" | "pinned") => {
    if (newMode === "auto") {
      onChange("auto", null);
    } else {
      const defaultPin = pinnedModel || models.find(m => m.id !== 'auto')?.id || null;
      onChange("pinned", defaultPin);
    }
  };

  const handleModelSelect = (modelId: string) => {
    onChange("pinned", modelId);
    setIsOpen(false);
  };

  // When opening, auto-detect if the button is in the bottom half of the
  // viewport — if so, flip the dropdown to open upward so it never
  // overflows the screen edge.
  const handleToggle = () => {
    if (!isOpen && !dropup && typeof window !== "undefined" && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setAutoDropup(spaceBelow < 280);
    }
    setIsOpen(!isOpen);
  };

  const effectiveDropup = dropup || autoDropup;

  const selectedModel = models.find(m => m.id === pinnedModel) || models[0];

  // Group non-auto models by provider for the dropdown
  const selectableModels = models.filter(m => m.id !== 'auto');
  const grouped = selectableModels.reduce<Record<string, Model[]>>((acc, m) => {
    const p = m.provider || 'openrouter';
    (acc[p] = acc[p] || []).push(m);
    return acc;
  }, {});
  const providerOrder = puterAuthed
    ? ['puter', 'nvidia', 'gemini', 'openrouter', 'groq']
    : ['nvidia', 'gemini', 'openrouter', 'groq'];

  return (
    <div className={cn("flex flex-col gap-2 relative", className)} ref={containerRef}>
      <label className="text-xs font-semibold text-neutral-400 tracking-wider uppercase">
        Generation Model Setting
      </label>
      
      <div className="flex bg-neutral-900 border border-neutral-800 rounded-xl p-0.5 gap-0.5 w-full max-w-sm">
        {/* Auto Tab */}
        <button
          type="button"
          onClick={() => handleModeChange("auto")}
          className={cn(
            "flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold flex-1 transition-all cursor-pointer",
            mode === "auto"
              ? "bg-neutral-800 text-neutral-200 border border-neutral-700"
              : "text-neutral-500 hover:text-neutral-300 border border-transparent"
          )}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Auto (Free)
        </button>

        {/* Pinned Tab */}
        <button
          type="button"
          onClick={() => handleModeChange("pinned")}
          className={cn(
            "flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold flex-1 transition-all cursor-pointer",
            mode === "pinned"
              ? "bg-neutral-800 text-neutral-200 border border-neutral-700"
              : "text-neutral-500 hover:text-neutral-300 border border-transparent"
          )}
        >
          <Pin className="w-3.5 h-3.5" />
          Pin a Model
        </button>
      </div>

      {mode === "pinned" && (
        <div className="relative mt-1">
          <button
            ref={buttonRef}
            type="button"
            onClick={handleToggle}
            className={cn(
              "flex items-center justify-between gap-2 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all rounded-xl w-full max-w-sm text-left text-xs text-neutral-300 cursor-pointer",
              size === "sm" ? "px-3 py-2" : "px-4 py-2.5"
            )}
          >
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-neutral-200 truncate">
                {selectedModel?.name || "Loading..."}
              </span>
              <span className="text-[10px] text-neutral-500">
                {selectedModel?.is_free
                  ? `Free · ${PROVIDER_LABELS[selectedModel?.provider] || 'OpenRouter'}`
                  : `Paid: Prompt $${selectedModel?.pricing?.prompt || '0'} / Completion $${selectedModel?.pricing?.completion || '0'}`}
              </span>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-neutral-500 shrink-0 transition-transform", isOpen && "rotate-180")} />
          </button>

          {isOpen && (
            <div className={cn(
              "absolute left-0 z-50 w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-1.5 max-h-72 overflow-y-auto",
              effectiveDropup ? "bottom-full mb-1.5" : "top-full mt-1.5"
            )}>
              {loading ? (
                <div className="text-center py-4 text-xs text-neutral-500">Loading models...</div>
              ) : (
                providerOrder.map((provider) => {
                  const group = grouped[provider];
                  if (!group || group.length === 0) return null;
                  return (
                    <div key={provider} className="mb-1">
                      <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-neutral-600">
                        {PROVIDER_LABELS[provider] || provider}
                      </div>
                      {group.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleModelSelect(m.id)}
                          className={cn(
                            "flex items-center justify-between text-left px-3 py-2 rounded-xl text-xs w-full transition-colors cursor-pointer",
                            pinnedModel === m.id
                              ? "bg-neutral-800/80 text-neutral-200"
                              : "text-neutral-400 hover:bg-neutral-950 hover:text-neutral-200"
                          )}
                        >
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium truncate">{m.name}</span>
                            <span className="text-[9px] text-neutral-500">
                              {m.is_free ? "Free" : `Prompt $${m.pricing?.prompt} / Completion $${m.pricing?.completion}`}
                            </span>
                          </div>
                          {pinnedModel === m.id && <Check className="w-3.5 h-3.5 text-neutral-300 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
