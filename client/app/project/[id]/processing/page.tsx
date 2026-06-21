"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MultiStepLoader, LoaderStep } from "@/components/ui/multi-step-loader";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { subscribeToEvents, getProject, saveClientPipelineResults, resolveImageUrl } from "@/lib/api";
import { runPuterPipeline } from "@/lib/puter-pipeline";

const STEPS: LoaderStep[] = [
  { text: "Downloading and Transcribing Audio", stage: "Transcribing Audio" },
  { text: "Extracting Key Highlights", stage: "Extracting Highlights" },
  { text: "Writing Articles and Social Assets", stage: "Generating Assets" },
  { text: "Optimizing with Critic Model Pass", stage: "Running Critic Review" },
];

const PUTER_DEFAULT_MODEL = "gpt-5.4-mini";
const PUTER_DEFAULT_CRITIC = "claude-sonnet-4";
const PUTER_DEFAULT_IMAGE = "gpt-image-1-mini";

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

    // Mount-time status check + pipeline mode routing
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

        if (p.pipeline_mode === "puter") {
          // Puter.js mode: run the pipeline in the browser.
          await runPuterMode(p);
          return;
        }
      } catch (e) {
        // ignore — fall through to SSE subscription
        console.warn("Initial project fetch failed:", e);
      }

      if (cancelled) return;

      // Backend mode: subscribe to live SSE events
      unsubscribe = subscribeToEvents(
        projectId,
        (event) => {
          if (cancelled) return;
          if (event.stage) setCurrentStage(event.stage);
          if (event.status) setCurrentStatus(event.status);
          if (event.error_message) setErrorMsg(event.error_message);
        },
        () => {
          if (cancelled) return;
          setErrorMsg("Pipeline run failed. Please check backend logs.");
        },
        () => {
          if (cancelled) return;
          router.replace(`/project/${projectId}`);
          router.refresh();
        }
      );
    })();

    /**
     * Run the Puter.js client-side pipeline.
     * For YouTube: poll until the backend has downloaded the audio.
     * For uploads: the audio is already saved by the create endpoint.
     * For article_text: use sourceRef directly.
     */
    async function runPuterMode(project: Awaited<ReturnType<typeof getProject>>) {
      try {
        // Wait for audio to be ready (for youtube_url the backend downloads in background)
        if (project.source_type === "youtube_url") {
          setCurrentStage("Transcribing Audio");
          setCurrentStatus("running");
          // Poll until status is "audio_ready" or "failed"
          const audioReady = await waitForStatus(projectId, ["audio_ready", "failed"], cancelled);
          if (cancelled) return;
          if (!audioReady) {
            setErrorMsg("Audio download failed. Please check the YouTube URL.");
            return;
          }
        }

        // Resolve the audio URL for Puter transcription
        let audioUrl: string | undefined;
        if (project.source_type !== "article_text") {
          audioUrl = resolveImageUrl(`/uploads/${projectId}/audio.mp3`);
        }

        // Resolve model config from project defaults
        const model =
          project.default_pinned_model || PUTER_DEFAULT_MODEL;
        const criticModel = PUTER_DEFAULT_CRITIC;
        const imageModel = PUTER_DEFAULT_IMAGE;

        // Resolve target assets
        let targetAssets: ("blog" | "thread" | "linkedin" | "clip")[] = [
          "blog",
          "thread",
          "linkedin",
          "clip",
        ];
        if (project.target_assets) {
          try {
            const parsed = JSON.parse(project.target_assets);
            if (Array.isArray(parsed) && parsed.length > 0) {
              targetAssets = parsed.filter((a) =>
                ["blog", "thread", "linkedin", "clip"].includes(a)
              );
            }
          } catch {
            // ignore parse error — use defaults
          }
        }

        // Run the full Puter pipeline in the browser
        const result = await runPuterPipeline({
          model,
          criticModel,
          imageModel,
          modelMode: "pinned",
          targetAssets,
          title: project.title,
          sourceType: project.source_type,
          sourceRef: project.source_ref,
          audioUrl,
          onProgress: (stage, status) => {
            if (cancelled) return;
            setCurrentStage(stage);
            setCurrentStatus(status);
          },
        });

        if (cancelled) return;

        // Save results to backend
        setCurrentStatus("saving");
        await saveClientPipelineResults(projectId, {
          transcript: result.transcript,
          highlights: result.highlights,
          assets: result.assets,
          puter_user_id: project.puter_user_id,
        });

        if (cancelled) return;

        // Redirect to dashboard
        router.replace(`/project/${projectId}`);
        router.refresh();
      } catch (e: any) {
        console.error("Puter pipeline error:", e);
        if (!cancelled) {
          setErrorMsg(
            e?.message ||
              "Puter.js pipeline failed. Your Puter account may have insufficient credits. Try Guest mode."
          );
        }
      }
    }

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [projectId, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-neutral-950 relative overflow-hidden">
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

/**
 * Poll getProject() every 2s until the project reaches one of the target
 * statuses, or the cancelled flag becomes true.
 */
async function waitForStatus(
  projectId: number,
  targets: string[],
  cancelled: boolean
): Promise<boolean> {
  const start = Date.now();
  const TIMEOUT_MS = 5 * 60 * 1000; // 5 min max for audio download
  while (!cancelled && Date.now() - start < TIMEOUT_MS) {
    try {
      const p = await getProject(projectId);
      if (targets.includes(p.status)) {
        return p.status !== "failed";
      }
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}
