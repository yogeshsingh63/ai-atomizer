"use client";

import React from "react";
import { FileText, Linkedin, Video, Check, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export type TargetAsset = "blog" | "thread" | "linkedin" | "clip";

interface AssetSelectorProps {
  selected: TargetAsset[];
  onChange: (selected: TargetAsset[]) => void;
  className?: string;
}

const ASSET_OPTIONS: { id: TargetAsset; label: string; icon: React.ReactNode }[] = [
  { id: "blog", label: "Blog", icon: <FileText className="w-3.5 h-3.5" /> },
  { id: "thread", label: "X Thread", icon: <span className="text-[10px] font-black">X</span> },
  { id: "linkedin", label: "LinkedIn", icon: <Linkedin className="w-3.5 h-3.5" /> },
  { id: "clip", label: "Clips", icon: <Video className="w-3.5 h-3.5" /> },
];

export const AssetSelector = ({ selected, onChange, className }: AssetSelectorProps) => {
  const toggle = (id: TargetAsset) => {
    if (selected.includes(id)) {
      // Don't allow deselecting if it's the last one
      if (selected.length === 1) return;
      onChange(selected.filter((a) => a !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const selectAll = () => onChange(["blog", "thread", "linkedin", "clip"]);

  const allSelected = selected.length === 4;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-neutral-400 tracking-wider uppercase">
          Assets to Generate
        </label>
        <button
          type="button"
          onClick={selectAll}
          className={cn(
            "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md transition-all cursor-pointer",
            allSelected
              ? "bg-brand-muted text-brand border border-brand-border"
              : "text-neutral-500 hover:text-brand border border-neutral-800 hover:border-brand-border"
          )}
        >
          All
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {ASSET_OPTIONS.map((opt) => {
          const active = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggle(opt.id)}
              className={cn(
                "flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border text-[11px] font-bold transition-all cursor-pointer active:scale-[0.97]",
                active
                  ? "bg-brand-muted/40 border-brand-border text-brand"
                  : "bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-neutral-300 hover:border-neutral-700"
              )}
            >
              {opt.icon}
              <span>{opt.label}</span>
              {active && <Check className="w-3 h-3 shrink-0" />}
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-neutral-600 leading-relaxed">
        Selecting fewer assets reduces processing time — the pipeline only generates what you need.
      </p>
    </div>
  );
};
