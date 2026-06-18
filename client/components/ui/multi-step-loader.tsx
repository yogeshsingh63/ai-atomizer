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

  return (
    <div className="flex flex-col space-y-6 max-w-md w-full mx-auto p-8 rounded-2xl bg-neutral-900 border border-neutral-800/80 backdrop-blur-md">
      <div className="flex flex-col mb-4">
        <h3 className="text-xl font-bold text-neutral-100 flex items-center gap-2">
          Processing Content
          {activeIndex < loadingStates.length && (
            <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
          )}
        </h3>
        <p className="text-xs text-neutral-400 mt-1">
          Converting your raw content into platform-specific outputs.
        </p>
      </div>

      <div className="flex flex-col space-y-4 relative">
        {loadingStates.map((state, index) => {
          const isCompleted = index < activeIndex;
          const isActive = index === activeIndex;
          const isPending = index > activeIndex;

          return (
            <div
              key={state.stage}
              className={cn(
                "flex items-center gap-4 transition-all duration-300",
                isCompleted ? "opacity-100" : "",
                isActive ? "opacity-100 scale-102 font-medium" : "",
                isPending ? "opacity-40" : ""
              )}
            >
              <div className="relative flex items-center justify-center">
                {isCompleted ? (
                  <div className="w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-300">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                ) : isActive ? (
                  <div className="w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-200">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-neutral-900/50 border border-neutral-850 flex items-center justify-center text-neutral-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                  </div>
                )}
              </div>

              <div className="flex flex-col">
                <span className={cn(
                  "text-sm",
                  isActive ? "text-neutral-200 font-semibold" : "text-neutral-400"
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
