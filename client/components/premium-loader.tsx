"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Cpu, ShieldCheck } from "lucide-react";
import { PrismLogo } from "@/components/ui/prism-logo";

const ENGAGEMENT_MESSAGES = [
  "Waking up server...",
  "Loading files...",
  "Connecting to database...",
  "Starting server processes...",
  "Checking configuration...",
  "Almost ready..."
];

export const PremiumLoader = ({ onComplete }: { onComplete?: () => void }) => {
  const [msgIndex, setMsgIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  // Rotate engagement bait status messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % ENGAGEMENT_MESSAGES.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  // Crawl progress from 0% to 98% over ~35 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 98) {
          clearInterval(interval);
          return 98;
        }
        // Slower increases as we approach 98%
        const increment = prev < 50 ? 4 : prev < 80 ? 2 : 1;
        return prev + increment;
      });
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-8 flex flex-col items-center text-center gap-6 shadow-2xl relative overflow-hidden animate-fade-in-up">
      {/* Glow highlight */}
      <div className="absolute -inset-px bg-gradient-to-r from-brand-border/10 to-brand/10 rounded-2xl -z-10 opacity-70" />

      {/* Orbit/Spinning Loader Animation */}
      <div className="relative w-20 h-20 flex items-center justify-center mt-2">
        {/* Outer glowing pulsing ring */}
        <div className="absolute inset-0 rounded-full border border-brand/20 animate-ping opacity-30" />
        {/* Middle rotating dash ring */}
        <div className="absolute inset-1 rounded-full border-2 border-dashed border-brand/60 animate-spin" style={{ animationDuration: "12s" }} />
        {/* Inner spinning segment */}
        <div className="absolute inset-2 rounded-full border-t-2 border-brand animate-spin" style={{ animationDuration: "1.5s" }} />
        
        <div className="relative z-10 shrink-0">
          <PrismLogo size={36} className="animate-pulse" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5 mt-2 w-full">
        <div className="flex items-center justify-center gap-1.5 px-3 py-1 rounded-full brand-badge text-[10px] font-bold uppercase tracking-wider w-fit mx-auto mb-2">
          <Cpu className="w-3.5 h-3.5 text-brand" />
          Refracting Assets
        </div>
        <h2 className="text-sm font-bold text-neutral-200 truncate">
          Connecting to Service Engine
        </h2>
        
        {/* Smooth status transitions */}
        <p className="text-xs text-neutral-400 min-h-8 leading-relaxed px-4 transition-all duration-300">
          {ENGAGEMENT_MESSAGES[msgIndex]}
        </p>
      </div>

      {/* Crawling Progress Bar */}
      <div className="w-full flex flex-col gap-2 mt-1">
        <div className="flex justify-between items-center text-[10px] text-neutral-500 font-mono font-bold px-1">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-brand animate-pulse" /> Running initialization
          </span>
          <span>{progress}%</span>
        </div>
        
        <div className="w-full bg-neutral-950 h-1.5 rounded-full overflow-hidden border border-neutral-900 p-0.5">
          <div 
            className="bg-brand h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Sub footer */}
      <div className="text-[10px] text-neutral-500 flex items-center justify-center gap-1.5 border-t border-neutral-850 pt-4 w-full">
        <ShieldCheck className="w-3.5 h-3.5 text-neutral-500" />
        <span>Initializing pipeline models securely</span>
      </div>
    </div>
  );
};
