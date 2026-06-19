"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MultiStepLoader, LoaderStep } from "@/components/ui/multi-step-loader";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { subscribeToEvents } from "@/lib/api";

const STEPS: LoaderStep[] = [
  { text: "Downloading and Transcribing Audio", stage: "Transcribing Audio" },
  { text: "Extracting Key Highlights", stage: "Extracting Highlights" },
  { text: "Writing Articles and Social Assets", stage: "Generating Assets" },
  { text: "Optimizing with Critic Model Pass", stage: "Running Critic Review" },
];

export default function ProcessingPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = Number(params.id);

  const [currentStage, setCurrentStage] = useState<string>("Transcribing Audio");
  const [currentStatus, setCurrentStatus] = useState<string>("running");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const unsubscribe = subscribeToEvents(
      projectId,
      (event) => {
        if (event.stage) {
          setCurrentStage(event.stage);
        }
        if (event.status) {
          setCurrentStatus(event.status);
        }
        if (event.error_message) {
          setErrorMsg(event.error_message);
        }
      },
      () => {
        // Error handler
        setErrorMsg("Pipeline run failed. Please check backend logs.");
      },
      () => {
        // Completion handler: Redirect to dashboard with replacement and route refresh to prevent stale cache
        setTimeout(() => {
          router.replace(`/project/${projectId}`);
          router.refresh();
        }, 1000);
      }
    );

    return () => unsubscribe();
  }, [projectId, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-neutral-950 relative overflow-hidden">
      {/* Visual background beams */}
      <BackgroundBeams />

      <div className="w-full max-w-md flex flex-col gap-6 relative z-10">
        <MultiStepLoader
          loadingStates={STEPS}
          currentStage={currentStage}
          currentStatus={currentStatus}
        />

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-center text-xs font-semibold">
            {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
}
