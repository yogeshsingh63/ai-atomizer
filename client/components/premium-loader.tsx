"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Cpu, ShieldCheck, Terminal } from "lucide-react";
import { PrismLogo } from "@/components/ui/prism-logo";

const TERMINAL_LOGS = [
  "system: init_handshake() called",
  "gateway: ping request timed out (cold start)",
  "gateway: sending wake-up signal to render host",
  "host: container allocation in progress",
  "host: mounting app engine workspace",
  "database: validating pooler connection (session 5432)",
  "system: checking environment tokens",
  "system: synchronizing model routing matrix",
  "pipeline: warming up groq whisper api handler",
  "pipeline: loading critic prompts & templates",
  "system: system_online() status resolved",
  "gateway: connection established successfully"
];

export const PremiumLoader = ({ onComplete }: { onComplete?: () => void }) => {
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>(["$ prism-ai --init-handshake"]);

  // Simulate terminal logs output
  useEffect(() => {
    let logIdx = 0;
    
    const interval = setInterval(() => {
      if (logIdx < TERMINAL_LOGS.length) {
        setLogs((prev) => [...prev, `> ${TERMINAL_LOGS[logIdx]}`].slice(-5));
        logIdx++;
      } else {
        setLogs((prev) => [...prev, `> Re-verifying handshake status...`].slice(-5));
        logIdx = 0;
      }
    }, 2400);

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
        const increment = prev < 50 ? 4 : prev < 80 ? 2 : 1;
        return prev + increment;
      });
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-md bg-transparent border-none flex flex-col items-center text-center gap-6 relative overflow-hidden animate-fade-in-up select-none">
      
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

      <div className="flex flex-col gap-1.5 w-full">
        <div className="flex items-center justify-center gap-1.5 px-3 py-1 rounded-full brand-badge text-[10px] font-bold uppercase tracking-wider w-fit mx-auto mb-2">
          <Cpu className="w-3.5 h-3.5 text-brand" />
          Refracting Assets
        </div>
        <h2 className="text-sm font-bold text-neutral-200 truncate flex items-center justify-center gap-1.5 font-mono">
          <Terminal className="w-4 h-4 text-brand animate-pulse" />
          connecting_to_host...
        </h2>
      </div>

      {/* Terminal Log Console */}
      <div className="w-full bg-[#070709] border border-neutral-900 rounded-xl p-4 font-mono text-[10px] text-left text-neutral-400 flex flex-col gap-1 shadow-inner h-36 relative group">
        {/* Console Header */}
        <div className="flex items-center justify-between border-b border-neutral-900/60 pb-2 mb-1.5">
          <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold font-mono">system_boot.log</span>
          <div className="flex gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-800 group-hover:bg-red-500/50 transition-colors duration-300" />
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-800 group-hover:bg-yellow-500/50 transition-colors duration-300" />
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-800 group-hover:bg-green-500/50 transition-colors duration-300" />
          </div>
        </div>
        
        {/* Logs list */}
        <div className="flex-1 flex flex-col gap-1 justify-end font-mono leading-relaxed">
          {logs.map((log, index) => {
            let textColor = "text-neutral-500";
            if (log.startsWith("$")) {
              textColor = "text-brand font-bold";
            } else if (log.includes("success") || log.includes("resolved")) {
              textColor = "text-emerald-400/90";
            } else if (log.includes("timed out") || log.includes("cold start")) {
              textColor = "text-amber-500/90";
            } else if (log.startsWith(">")) {
              textColor = "text-neutral-400";
            }
            return (
              <p key={index} className={`${textColor} truncate font-mono`}>
                {log}
              </p>
            );
          })}
          {/* Prompter cursor */}
          <p className="text-brand font-bold mt-0.5 font-mono">
            $ <span className="inline-block w-1.5 h-3 bg-brand/80 animate-pulse align-middle" />
          </p>
        </div>
      </div>

      {/* Crawling Progress Bar */}
      <div className="w-full flex flex-col gap-2 mt-1">
        <div className="flex justify-between items-center text-[10px] text-neutral-500 font-mono font-bold px-1">
          <span className="flex items-center gap-1 font-mono">
            <Sparkles className="w-3 h-3 text-brand animate-pulse" /> booting_server
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
      <div className="text-[10px] text-neutral-600 flex items-center justify-center gap-1.5 border-t border-neutral-900 pt-4 w-full font-mono">
        <ShieldCheck className="w-3.5 h-3.5 text-neutral-600" />
        <span>secure_handshake_enabled</span>
      </div>
    </div>
  );
};
