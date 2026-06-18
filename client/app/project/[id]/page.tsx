"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  FileText, Twitter, Linkedin, Video, Image as ImageIcon, 
  Copy, Download, RefreshCw, ArrowLeft, Check, Sparkles, Pin, Clock, AlertCircle
} from "lucide-react";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { Button as MovingBorderButton } from "@/components/ui/moving-border";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { ModelSelector } from "@/components/model-selector";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { 
  Project, GeneratedAsset, Highlight, 
  getProject, getAssets, getHighlights, regenerateAsset 
} from "@/lib/api";

export default function ProjectDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = Number(params.id);

  const [project, setProject] = useState<Project | null>(null);
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<GeneratedAsset | null>(null);
  const [loading, setLoading] = useState(true);

  // Asset copy/download state
  const [copied, setCopied] = useState(false);

  // Asset specific model regeneration settings
  const [regenMode, setRegenMode] = useState<"auto" | "pinned">("auto");
  const [regenModel, setRegenModel] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (!projectId) return;

    async function loadData() {
      try {
        const [p, a, h] = await Promise.all([
          getProject(projectId),
          getAssets(projectId),
          getHighlights(projectId),
        ]);
        setProject(p);
        setAssets(a);
        setHighlights(h);
      } catch (e) {
        console.error("Failed to load project details:", e);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [projectId]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = (asset: GeneratedAsset) => {
    const filename = `${project?.title || "repurposed"}-${asset.asset_type}.txt`;
    const blob = new Blob([asset.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRegenerate = async () => {
    if (!selectedAsset) return;
    setRegenerating(true);
    try {
      const updated = await regenerateAsset(
        projectId, 
        selectedAsset.id, 
        regenMode === "pinned" ? regenModel : null
      );
      
      // Update lists
      const nextAssets = assets.map(a => a.id === selectedAsset.id ? updated : a);
      setAssets(nextAssets);
      setSelectedAsset(updated);
    } catch (e) {
      console.error(e);
      alert("Failed to regenerate asset.");
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950 text-neutral-400 relative">
        <BackgroundBeams />
        <div className="flex flex-col items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-full border-t-2 border-violet-500 animate-spin" />
          <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">Loading Dashboard...</span>
        </div>
      </div>
    );
  }

  // Helper selectors
  const blogAsset = assets.find(a => a.asset_type === "blog");
  const threadAsset = assets.find(a => a.asset_type === "thread");
  const linkedinAsset = assets.find(a => a.asset_type === "linkedin");
  const clipAssets = assets.filter(a => a.asset_type === "clip");
  const thumbnailAssets = assets.filter(a => a.asset_type === "thumbnail");

  // Bento structures
  const bentoItems = [
    {
      type: "blog",
      title: "Blog Post Article",
      description: blogAsset?.content || "Generates a fully structured long-form blog post.",
      icon: <FileText className="w-5 h-5 text-violet-400" />,
      asset: blogAsset,
      className: "md:col-span-2 row-span-2",
      header: (
        <div className="h-44 bg-neutral-900/60 rounded-2xl flex flex-col justify-between p-6 border border-neutral-800/80 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-violet-600/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase font-bold text-violet-400 tracking-wider">Draft Generation</span>
            <span className="text-[10px] text-neutral-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-violet-400" />
              {blogAsset?.model_used ? blogAsset.model_used.split("/").pop() : "Auto"}
            </span>
          </div>
          <div className="flex flex-col gap-1.5 mt-auto">
            <h4 className="text-base font-extrabold text-neutral-200 truncate group-hover:text-violet-400 transition-colors duration-200">
              {project?.title || "Repurposed Blog Article"}
            </h4>
            <p className="text-xs text-neutral-500 line-clamp-2">
              Ready-to-publish long-form post structured with headers, quotes, and actionable sections.
            </p>
          </div>
        </div>
      )
    },
    {
      type: "thread",
      title: "Twitter/X Thread",
      description: threadAsset?.content || "Writes a multi-tweet thread layout.",
      icon: <Twitter className="w-5 h-5 text-sky-400" />,
      asset: threadAsset,
      className: "md:col-span-1",
      header: (
        <div className="h-32 bg-neutral-900/60 rounded-2xl flex items-center justify-center p-6 border border-neutral-800/80 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-sky-600/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <Twitter className="w-10 h-10 text-sky-500/20 group-hover:text-sky-500/30 group-hover:scale-105 transition-all duration-300" />
        </div>
      )
    },
    {
      type: "linkedin",
      title: "LinkedIn Post",
      description: linkedinAsset?.content || "Creates a professional LinkedIn post update.",
      icon: <Linkedin className="w-5 h-5 text-blue-400" />,
      asset: linkedinAsset,
      className: "md:col-span-1",
      header: (
        <div className="h-32 bg-neutral-900/60 rounded-2xl flex items-center justify-center p-6 border border-neutral-800/80 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <Linkedin className="w-10 h-10 text-blue-500/20 group-hover:text-blue-500/30 group-hover:scale-105 transition-all duration-300" />
        </div>
      )
    },
    {
      type: "clip",
      title: "Short Clip Suggestions",
      description: `${clipAssets.length} clip suggestions generated with captions and timestamps.`,
      icon: <Video className="w-5 h-5 text-rose-400" />,
      asset: clipAssets[0],
      className: "md:col-span-1",
      header: (
        <div className="h-32 bg-neutral-900/60 rounded-2xl flex flex-col justify-between p-6 border border-neutral-800/80 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-rose-600/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="text-3xl font-black text-rose-500 tracking-tight">{clipAssets.length}</div>
          <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Timestamp Suggestions</span>
        </div>
      )
    },
    {
      type: "thumbnail",
      title: "AI Thumbnail Images",
      description: `${thumbnailAssets.length} image thumbnails created for cover layouts.`,
      icon: <ImageIcon className="w-5 h-5 text-emerald-400" />,
      asset: thumbnailAssets[0],
      className: "md:col-span-1",
      header: (
        <div className="h-32 bg-neutral-900/60 rounded-2xl overflow-hidden border border-neutral-800/80 relative group">
          {thumbnailAssets[0]?.content ? (
            <>
              <img 
                src={thumbnailAssets[0].content} 
                alt="Thumbnail" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
              />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-300" />
            </>
          ) : (
            <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-neutral-700" />
            </div>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-neutral-950 p-6 md:p-10 relative overflow-x-hidden">
      {/* Visual background beams */}
      <BackgroundBeams className="opacity-20" />

      {/* Header Bar */}
      <div className="max-w-7xl mx-auto w-full flex flex-col gap-6 mb-10 relative z-10">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-neutral-300 transition-colors w-fit cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-neutral-900 pb-8">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5">
              <h1 className="text-3xl font-extrabold text-neutral-100 sm:text-4xl tracking-tight bg-gradient-to-r from-neutral-100 via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
                {project?.title}
              </h1>
            </div>
            <p className="text-xs text-neutral-500 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>Source:</span>
              <span className="text-neutral-300 font-medium truncate max-w-xs md:max-w-md">{project?.source_ref}</span>
              <span className="text-neutral-700">•</span>
              <span>Input:</span>
              <span className="text-neutral-300 font-medium uppercase">{project?.source_type.replace('_', ' ')}</span>
              <span className="text-neutral-700">•</span>
              <span>Model Mode:</span>
              <span className="text-neutral-300 font-medium uppercase">{project?.default_model_mode}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 bg-violet-600/10 border border-violet-500/20 px-4 py-2 rounded-2xl w-fit">
            <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-xs font-semibold text-violet-300">All Outputs Generated</span>
          </div>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="flex-1 w-full max-w-7xl mx-auto relative z-10">
        <BentoGrid>
          {bentoItems.map((item, idx) => (
            <BentoGridItem
              key={idx}
              title={item.title}
              description={item.description}
              header={item.header}
              className={item.className}
              icon={item.icon}
              onClick={() => {
                if (item.type === "clip") {
                  setSelectedAsset(clipAssets[0] || null);
                } else if (item.type === "thumbnail") {
                  setSelectedAsset(thumbnailAssets[0] || null);
                } else {
                  setSelectedAsset(item.asset || null);
                }
              }}
            />
          ))}
        </BentoGrid>
      </div>

      {/* Drawer Overlay for single asset details */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div 
            className="w-full max-w-2xl h-full max-h-[95vh] bg-neutral-900 border border-neutral-800/80 rounded-[32px] shadow-2xl flex flex-col overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-6 border-b border-neutral-800/80 flex items-center justify-between bg-neutral-950/20">
              <div className="flex items-center gap-3.5">
                <span className="p-2.5 rounded-2xl bg-neutral-950 border border-neutral-800">
                  {selectedAsset.asset_type === "blog" && <FileText className="w-5 h-5 text-violet-400" />}
                  {selectedAsset.asset_type === "thread" && <Twitter className="w-5 h-5 text-sky-400" />}
                  {selectedAsset.asset_type === "linkedin" && <Linkedin className="w-5 h-5 text-blue-400" />}
                  {selectedAsset.asset_type === "clip" && <Video className="w-5 h-5 text-rose-400" />}
                  {selectedAsset.asset_type === "thumbnail" && <ImageIcon className="w-5 h-5 text-emerald-400" />}
                </span>
                <div className="flex flex-col gap-0.5">
                  <h3 className="text-base font-extrabold text-neutral-100 capitalize">
                    {selectedAsset.asset_type} Output
                  </h3>
                  <span className="text-[10px] text-neutral-500 flex items-center gap-1.5 font-medium">
                    <Sparkles className="w-3 h-3 text-violet-400" />
                    Model Used: <span className="text-neutral-400">{selectedAsset.model_used}</span>
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedAsset(null)}
                className="text-neutral-400 hover:text-neutral-200 text-xs font-bold bg-neutral-900 border border-neutral-800/80 px-3 py-1.5 rounded-xl hover:border-neutral-700 transition-colors cursor-pointer"
              >
                Close View
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 no-scrollbar bg-gradient-to-b from-neutral-900 via-neutral-900/50 to-neutral-950/20">
              {selectedAsset.asset_type === "thumbnail" ? (
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-2 p-4 rounded-2xl bg-violet-600/5 border border-violet-500/10 text-neutral-400 text-xs leading-relaxed">
                    <AlertCircle className="w-5 h-5 text-violet-400 shrink-0" />
                    These images are automatically generated by the multimodal model using detailed composition descriptions derived from your key moments.
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {thumbnailAssets.map((thumb, idx) => (
                      <div key={thumb.id} className="flex flex-col gap-3 rounded-2xl bg-neutral-950 border border-neutral-800/80 p-4 hover:border-neutral-700 transition-colors">
                        <div className="aspect-video w-full rounded-xl overflow-hidden border border-neutral-800 relative group">
                          <img 
                            src={thumb.content} 
                            alt="Cover thumbnail" 
                            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-neutral-500">
                          <span className="font-semibold text-neutral-400">
                            {thumb.related_highlight_id ? `Clip Suggestion #${thumb.related_highlight_id}` : "Blog Cover Image"}
                          </span>
                          <span className="font-mono text-[9px] bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">{thumb.model_used.split("/").pop()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : selectedAsset.asset_type === "clip" ? (
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-2 p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 text-neutral-400 text-xs leading-relaxed mb-2">
                    <Clock className="w-5 h-5 text-rose-400 shrink-0" />
                    Viral clip suggestions mapped with exact timestamps, captions, and visual composition overlay instructions.
                  </div>
                  {clipAssets.map((clip, idx) => {
                    const matchHighlight = highlights.find(h => h.id === clip.related_highlight_id);
                    return (
                      <div key={clip.id} className="p-6 rounded-3xl bg-neutral-950 border border-neutral-800/80 hover:border-neutral-700/80 transition-colors flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-900 pb-3">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-extrabold text-rose-400">Clip Suggestion #{idx + 1}</h4>
                            <span className="text-[10px] bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded-lg text-rose-300 font-semibold tracking-wide">
                              {matchHighlight ? `${matchHighlight.start_seconds}s - ${matchHighlight.end_seconds}s` : "Suggestion"}
                            </span>
                          </div>
                        </div>

                        {matchHighlight && (
                          <div className="p-3.5 rounded-xl bg-neutral-900/50 border border-neutral-800/60 text-xs italic text-neutral-400 leading-relaxed">
                            Quote: "{matchHighlight.quote}"
                          </div>
                        )}

                        <div className="text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed">
                          {clip.content}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="whitespace-pre-wrap leading-relaxed px-2">
                  <TextGenerateEffect words={selectedAsset.content} />
                </div>
              )}
            </div>

            {/* Footer Options & Actions */}
            <div className="p-6 border-t border-neutral-800/80 bg-neutral-950/20 flex flex-col gap-4">
              {/* Inline Model Selection for Regeneration */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 p-4 rounded-2xl border border-neutral-800/80 bg-neutral-950/40">
                <ModelSelector
                  mode={regenMode}
                  pinnedModel={regenModel}
                  onChange={(mode, model) => {
                    setRegenMode(mode);
                    setRegenModel(model);
                  }}
                  className="flex-1"
                  size="sm"
                />
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-neutral-800 hover:border-neutral-700 bg-neutral-900 hover:bg-neutral-900/60 transition-colors cursor-pointer text-xs font-semibold text-neutral-200 shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? "animate-spin" : ""}`} />
                  {regenerating ? "Regenerating..." : "Regenerate"}
                </button>
              </div>

              {/* Copy/Export Buttons */}
              {selectedAsset.asset_type !== "thumbnail" && (
                <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
                  <MovingBorderButton
                    borderRadius="1rem"
                    onClick={() => handleCopy(selectedAsset.content)}
                    className="flex items-center justify-center gap-2 w-full"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Asset Text
                      </>
                    )}
                  </MovingBorderButton>

                  <button
                    onClick={() => handleExport(selectedAsset)}
                    className="flex items-center justify-center gap-2 py-3 px-6 rounded-xl border border-neutral-800 hover:border-neutral-700 bg-neutral-900 hover:bg-neutral-900/60 transition-colors w-full cursor-pointer text-sm font-semibold text-neutral-200"
                  >
                    <Download className="w-4 h-4" />
                    Download (.txt)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
