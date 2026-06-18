"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";

export interface LoaderStep {
  text: string;
  stage: string;
}

export const MultiStepLoader = ({
  loadingStates,
  currentStage,
  currentStatus,
}: {
  loadingStates: LoaderStep[];
  currentStage: string;
  currentStatus: string;
}) => {
  // Find current active index
  let activeIndex = 0;
  for (let i = 0; i < loadingStates.length; i++) {
    if (loadingStates[i].stage === currentStage || currentStage.toLowerCase().includes(loadingStates[i].stage.toLowerCase())) {
      activeIndex = i;
      break;
    }
  }

  // If status is completed on the last item, treat it as fully done
  if (currentStage === 'done' || currentStatus === 'completed' && activeIndex === loadingStates.length - 1) {
    activeIndex = loadingStates.length; // all complete
  }

  const overallProgress = (activeIndex / loadingStates.length) * 100;

  return (
    <div className="flex flex-col space-y-6 max-w-md w-full mx-auto p-8 rounded-2xl bg-[#121215] border border-neutral-900 shadow-xl relative overflow-hidden">
      {/* Top Brand Highlight Strip */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-brand/30" />

      <div className="flex flex-col">
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-sm font-extrabold text-neutral-100 flex items-center gap-2 tracking-wide uppercase">
            Repurposing Content
          </h3>
          {activeIndex < loadingStates.length ? (
            <span className="text-[10px] font-mono text-brand font-bold bg-brand-muted border border-brand-border px-2 py-0.5 rounded-full animate-pulse">
              Processing
            </span>
          ) : (
            <span className="text-[10px] font-mono text-emerald-500 font-bold bg-emerald-950/40 border border-emerald-900/30 px-2 py-0.5 rounded-full">
              Completed
            </span>
          )}
        </div>
        <p className="text-[11px] text-neutral-450 leading-relaxed">
          Converting your raw content into platform-optimized text structures.
        </p>
      </div>

      {/* Horizontal Overall Progress Bar */}
      <div className="w-full bg-neutral-950 border border-neutral-900/60 h-1.5 rounded-full overflow-hidden">
        <div 
          className="bg-brand h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${overallProgress}%` }}
        />
      </div>

      <div className="flex flex-col space-y-6 relative pl-1 pt-2">
        {/* Continuous Vertical Connector Line */}
        <div className="absolute left-[11px] top-3 bottom-3 w-[2px] bg-neutral-900" />
        <div 
          className="absolute left-[11px] top-3 w-[2px] bg-brand transition-all duration-500 ease-out" 
          style={{ 
            height: `${activeIndex === 0 ? 0 : activeIndex >= loadingStates.length ? "calc(100% - 24px)" : `${(activeIndex / (loadingStates.length - 1)) * 100}%`}` 
          }}
        />

        {loadingStates.map((state, index) => {
          const isCompleted = index < activeIndex;
          const isActive = index === activeIndex;
          const isPending = index > activeIndex;

          return (
            <div
              key={state.stage}
              className={cn(
                "flex items-center gap-4 transition-all duration-300 relative z-10",
                isCompleted ? "opacity-100" : "",
                isActive ? "opacity-100 scale-[1.01] font-semibold" : "",
                isPending ? "opacity-35" : ""
              )}
            >
              <div className="relative flex items-center justify-center shrink-0">
                {isCompleted ? (
                  <div className="w-6 h-6 rounded-full bg-brand-muted border border-brand-border flex items-center justify-center text-brand">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                ) : isActive ? (
                  <div className="w-6 h-6 rounded-full bg-neutral-950 border border-brand flex items-center justify-center text-brand">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-neutral-950 border border-neutral-900 flex items-center justify-center text-neutral-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-neutral-700" />
                  </div>
                )}
              </div>

              <div className="flex flex-col min-w-0">
                <span className={cn(
                  "text-[12.5px] tracking-wide truncate",
                  isActive ? "text-neutral-100 font-bold" : "text-neutral-400 font-medium"
                )}>
                  {state.text}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
