"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  FileText, Twitter, Linkedin, Video, Image as ImageIcon, 
  Copy, Download, RefreshCw, ArrowLeft, Check, Sparkles, Pin 
} from "lucide-react";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { Button as MovingBorderButton } from "@/components/ui/moving-border";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { ModelSelector } from "@/components/model-selector";
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

  // Asset copy state
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
      <div className="flex items-center justify-center min-h-screen bg-neutral-950 text-neutral-400">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          <span className="text-xs">Loading Dashboard...</span>
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
      description: blogAsset?.content || "Generates a fully structured blog post.",
      icon: <FileText className="w-5 h-5 text-violet-400" />,
      asset: blogAsset,
      className: "md:col-span-2",
      header: (
        <div className="h-32 bg-neutral-900 rounded-2xl flex flex-col justify-center p-6 border border-neutral-800">
          <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Asset Generation</span>
          <h4 className="text-sm font-bold text-neutral-200 mt-1 truncate">
            {project?.title || "Draft Article"}
          </h4>
          <span className="text-[10px] text-neutral-500 mt-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-violet-400" />
            {blogAsset?.model_used || "Auto"}
          </span>
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
        <div className="h-32 bg-neutral-900 rounded-2xl flex items-center justify-center p-6 border border-neutral-800">
          <Twitter className="w-12 h-12 text-sky-500/25" />
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
        <div className="h-32 bg-neutral-900 rounded-2xl flex items-center justify-center p-6 border border-neutral-800">
          <Linkedin className="w-12 h-12 text-blue-500/25" />
        </div>
      )
    },
    {
      type: "clip",
      title: "Short Clip Suggestions",
      description: `${clipAssets.length} clips suggestions generated with captions and timestamps.`,
      icon: <Video className="w-5 h-5 text-rose-400" />,
      asset: clipAssets[0], // Open details wrapper on click
      className: "md:col-span-1",
      header: (
        <div className="h-32 bg-neutral-900 rounded-2xl flex flex-col justify-center px-6 border border-neutral-800">
          <div className="text-2xl font-bold text-rose-500">{clipAssets.length}</div>
          <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Timestamp Suggestions</span>
        </div>
      )
    },
    {
      type: "thumbnail",
      title: "AI Thumbnail Images",
      description: `${thumbnailAssets.length} image thumbnails created for cover layouts.`,
      icon: <ImageIcon className="w-5 h-5 text-emerald-400" />,
      asset: thumbnailAssets[0], // Open details
      className: "md:col-span-1",
      header: (
        <div className="h-32 bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800 relative group">
          {thumbnailAssets[0]?.content ? (
            <img 
              src={thumbnailAssets[0].content} 
              alt="Thumbnail" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
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
    <div className="flex flex-col min-h-screen bg-neutral-950 p-6 md:p-10 relative">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.03)_0%,transparent_70%)] pointer-events-none -z-10" />

      {/* Header bar */}
      <div className="max-w-7xl mx-auto w-full flex flex-col gap-6 mb-10">
        <button
          onClick={() => router.push("/new")}
          className="flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-neutral-300 transition-colors w-fit cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Create New Project
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-900 pb-6">
          <div className="flex flex-col">
            <h1 className="text-2xl font-extrabold text-neutral-100 sm:text-3xl tracking-tight">
              {project?.title}
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Source: <span className="text-neutral-400 font-medium">{project?.source_ref}</span> • Mode: <span className="text-neutral-400 font-medium uppercase">{project?.default_model_mode}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 bg-neutral-900/40 border border-neutral-800/80 px-4 py-2 rounded-2xl w-fit">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-neutral-300">Outputs Ready</span>
          </div>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="flex-1 w-full max-w-7xl mx-auto">
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
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm p-4">
          <div 
            className="w-full max-w-2xl h-full max-h-[95vh] bg-neutral-900 border border-neutral-800 rounded-[32px] shadow-2xl flex flex-col overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-neutral-950 border border-neutral-800">
                  {selectedAsset.asset_type === "blog" && <FileText className="w-5 h-5 text-violet-400" />}
                  {selectedAsset.asset_type === "thread" && <Twitter className="w-5 h-5 text-sky-400" />}
                  {selectedAsset.asset_type === "linkedin" && <Linkedin className="w-5 h-5 text-blue-400" />}
                  {selectedAsset.asset_type === "clip" && <Video className="w-5 h-5 text-rose-400" />}
                  {selectedAsset.asset_type === "thumbnail" && <ImageIcon className="w-5 h-5 text-emerald-400" />}
                </span>
                <div className="flex flex-col">
                  <h3 className="text-base font-bold text-neutral-100 capitalize">
                    {selectedAsset.asset_type} Output
                  </h3>
                  <span className="text-[10px] text-neutral-500 flex items-center gap-1 mt-0.5">
                    <Sparkles className="w-3 h-3 text-violet-400" />
                    Model: {selectedAsset.model_used}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedAsset(null)}
                className="text-neutral-400 hover:text-neutral-200 text-sm font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 no-scrollbar">
              {selectedAsset.asset_type === "thumbnail" ? (
                <div className="flex flex-col gap-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {thumbnailAssets.map((thumb) => (
                      <div key={thumb.id} className="flex flex-col gap-2 rounded-2xl bg-neutral-950 border border-neutral-800 p-3">
                        <img 
                          src={thumb.content} 
                          alt="Thumbnail preview" 
                          className="w-full h-36 object-cover rounded-xl border border-neutral-800"
                        />
                        <div className="flex items-center justify-between text-[10px] text-neutral-500 mt-1">
                          <span>{thumb.related_highlight_id ? `Clip Suggestion ${thumb.related_highlight_id}` : "Blog Cover Cover"}</span>
                          <span>{thumb.model_used}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : selectedAsset.asset_type === "clip" ? (
                <div className="flex flex-col gap-6">
                  {clipAssets.map((clip, idx) => (
                    <div key={clip.id} className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800/80 flex flex-col gap-3">
                      <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
                        <h4 className="text-sm font-bold text-neutral-200">Clip Suggestion #{idx + 1}</h4>
                        <span className="text-[10px] bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded text-neutral-400 font-semibold uppercase">Suggestion</span>
                      </div>
                      <div className="text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed mt-1">
                        {clip.content}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="whitespace-pre-wrap leading-relaxed">
                  <TextGenerateEffect words={selectedAsset.content} />
                </div>
              )}
            </div>

            {/* Footer Options & Actions */}
            <div className="p-6 border-t border-neutral-800 bg-neutral-950/40 flex flex-col gap-4">
              {/* Inline Model Selection for Regeneration */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 p-4 rounded-2xl border border-neutral-800 bg-neutral-950/80">
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
                  {regenerating ? "Regenerating..." : "Regenerate Single Asset"}
                </button>
              </div>

              {/* Copy/Export buttons */}
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
                      Copy Asset
                    </>
                  )}
                </MovingBorderButton>

                <button
                  onClick={() => handleExport(selectedAsset)}
                  className="flex items-center justify-center gap-2 py-3 px-6 rounded-xl border border-neutral-800 hover:border-neutral-700 bg-neutral-900 hover:bg-neutral-900/60 transition-colors w-full cursor-pointer text-sm font-semibold text-neutral-200"
                >
                  <Download className="w-4 h-4" />
                  Download File (.txt)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
