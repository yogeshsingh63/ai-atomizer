"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MultiStepLoader, LoaderStep } from "@/components/ui/multi-step-loader";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { subscribeToEvents, getProject } from "@/lib/api";

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

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    // Mount-time status check: if the project is already done, redirect
    // immediately instead of waiting for an SSE event that already fired.
    (async () => {
      try {
        const p = await getProject(projectId);
        if (cancelled) return;
        if (p.status === "done") {
          router.replace(`/project/${projectId}`);
          router.refresh();
          return;
        }
        if (p.status === "failed") {
          setErrorMsg("Pipeline run failed. Please check backend logs.");
          return;
        }
      } catch {
        // ignore — fall through to SSE subscription
      }

      if (cancelled) return;

      // Subscribe to live SSE events (with always-on safety polling).
      unsubscribe = subscribeToEvents(
        projectId,
        (event) => {
          if (cancelled) return;
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
          if (cancelled) return;
          setErrorMsg("Pipeline run failed. Please check backend logs.");
        },
        () => {
          if (cancelled) return;
          // Redirect immediately — the DB is committed before the event fires.
          router.replace(`/project/${projectId}`);
          router.refresh();
        }
      );
    })();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
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
