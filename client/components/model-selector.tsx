"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Pin, ChevronDown, Check } from "lucide-react";
import { Model, getModels } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ModelSelectorProps {
  mode: "auto" | "pinned";
  pinnedModel: string | null;
  onChange: (mode: "auto" | "pinned", pinnedModel: string | null) => void;
  className?: string;
  size?: "sm" | "md";
}

export const ModelSelector = ({
  mode,
  pinnedModel,
  onChange,
  className,
  size = "md",
}: ModelSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);

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
  }, []);

  const handleModeChange = (newMode: "auto" | "pinned") => {
    if (newMode === "auto") {
      onChange("auto", null);
    } else {
      // Pick first non-auto model if pinnedModel is null
      const defaultPin = pinnedModel || models.find(m => m.id !== 'auto')?.id || null;
      onChange("pinned", defaultPin);
    }
  };

  const handleModelSelect = (modelId: string) => {
    onChange("pinned", modelId);
    setIsOpen(false);
  };

  const selectedModel = models.find(m => m.id === pinnedModel) || models[0];

  return (
    <div className={cn("flex flex-col gap-2 relative", className)}>
      <label className="text-xs font-semibold text-neutral-400 tracking-wider uppercase">
        Generation Model Setting
      </label>
      
      <div className="flex bg-neutral-900 border border-neutral-800 rounded-xl p-0.5 gap-0.5 w-full max-w-sm">
        {/* Auto Tab */}
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
            type="button"
            onClick={() => setIsOpen(!isOpen)}
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
                {selectedModel?.is_free ? "Free Model" : `Paid: Prompt $${selectedModel?.pricing?.prompt || '0'} / Completion $${selectedModel?.pricing?.completion || '0'}`}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-neutral-500 shrink-0" />
          </button>

          {isOpen && (
            <div className="absolute top-full left-0 z-50 w-full max-w-sm mt-1.5 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-1.5 max-h-60 overflow-y-auto no-scrollbar">
              {loading ? (
                <div className="text-center py-4 text-xs text-neutral-500">Loading models...</div>
              ) : (
                models
                  .filter(m => m.id !== 'auto')
                  .map((m) => (
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
                      {pinnedModel === m.id && <Check className="w-3.5 h-3.5 text-neutral-300" />}
                    </button>
                  ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
