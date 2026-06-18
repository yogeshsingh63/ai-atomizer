"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  FileText, Twitter, Linkedin, Video, Image as ImageIcon, 
  Copy, Download, RefreshCw, ArrowLeft, Check, Sparkles, Pin, Clock, AlertCircle, Eye, EyeOff,
  MessageCircle, Repeat2, Heart, X
} from "lucide-react";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { Button as MovingBorderButton } from "@/components/ui/moving-border";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { ModelSelector } from "@/components/model-selector";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { TwitterPreview, LinkedInPreview, BlogPreview } from "@/components/post-preview";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Project, GeneratedAsset, Highlight, 
  getProject, getAssets, getHighlights, regenerateAsset 
} from "@/lib/api";
import { cn } from "@/lib/utils";

export default function ProjectDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = Number(params.id);

  const [project, setProject] = useState<Project | null>(null);
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<GeneratedAsset | null>(null);
  const [loading, setLoading] = useState(true);

  // Preview options tab in details drawer
  const [previewTab, setPreviewTab] = useState<"preview" | "raw">("preview");

  // Asset copy/download state
  const [copied, setCopied] = useState(false);

  // Asset specific model regeneration settings
  const [regenMode, setRegenMode] = useState<"auto" | "pinned">("auto");
  const [regenModel, setRegenModel] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [showRegen, setShowRegen] = useState(false);

  useEffect(() => {
    setShowRegen(false);
  }, [selectedAsset]);

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
          <div className="w-8 h-8 rounded-full border-t-2 border-neutral-400 animate-spin" />
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
      icon: <FileText className="w-4 h-4 text-brand" />,
      asset: blogAsset,
      className: "md:col-span-2 row-span-2",
      header: (
        <div className="h-44 bg-neutral-950 rounded-xl flex flex-col justify-between p-5 border border-neutral-900 relative overflow-hidden group/header">
          {/* Subtle brand background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-brand-muted/20 via-transparent to-transparent opacity-50 group-hover/header:opacity-80 transition-opacity" />
          
          <div className="flex justify-between items-start relative z-10">
            <span className="text-[9px] uppercase font-bold text-brand tracking-widest brand-badge px-2.5 py-0.5 rounded-full">Editorial Article</span>
            <span className="text-[10px] text-neutral-400 flex items-center gap-1 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-brand" />
              {blogAsset?.model_used ? blogAsset.model_used.split("/").pop() : "Auto"}
            </span>
          </div>
          
          {/* Styled Document Lines */}
          <div className="flex flex-col gap-2 mt-4 relative z-10 grow justify-center">
            <div className="w-3/4 h-2 bg-brand-border/80 rounded-full" />
            <div className="w-full h-1.5 bg-neutral-900 rounded-full" />
            <div className="w-5/6 h-1.5 bg-neutral-900 rounded-full" />
            <div className="w-2/3 h-1.5 bg-neutral-900 rounded-full" />
          </div>

          <div className="flex flex-col gap-1.5 mt-auto relative z-10">
            <h4 className="text-sm font-bold text-neutral-200 truncate group-hover/header:text-brand transition-colors">
              {project?.title || "Repurposed Blog Article"}
            </h4>
            <p className="text-[11px] text-neutral-500 line-clamp-1">
              Ready-to-publish long-form post structured with headers, quotes, and highlights.
            </p>
          </div>
        </div>
      )
    },
    {
      type: "thread",
      title: "Twitter/X Thread",
      description: threadAsset?.content || "Writes a multi-tweet thread layout.",
      icon: <Twitter className="w-4 h-4 text-[#1d9bf0]" />,
      asset: threadAsset,
      className: "md:col-span-1",
      header: (
        <div className="h-32 bg-neutral-950 rounded-xl flex flex-col p-4 border border-neutral-900 relative overflow-hidden text-left justify-center select-none text-[11px] text-[#71767b]">
          <div className="flex gap-2 items-start">
            <div className="w-6 h-6 rounded-full bg-neutral-800 border border-[#2f3336] shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="font-bold text-[#e7e9ea] text-[10.5px]">Puneet</span>
                <span className="truncate">@system</span>
              </div>
              <p className="text-[#e7e9ea] leading-tight line-clamp-2 mt-0.5">
                1/ We built the world's fastest database by breaking assumption...
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[9px] text-[#71767b] mt-3 pl-8">
            <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" /> 12</span>
            <span className="flex items-center gap-0.5"><Repeat2 className="w-3 h-3" /> 8</span>
            <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" /> 42</span>
          </div>
        </div>
      )
    },
    {
      type: "linkedin",
      title: "LinkedIn Post",
      description: linkedinAsset?.content || "Creates a professional LinkedIn post update.",
      icon: <Linkedin className="w-4 h-4 text-[#0a66c2]" />,
      asset: linkedinAsset,
      className: "md:col-span-1",
      header: (
        <div className="h-32 bg-neutral-950 rounded-xl flex flex-col p-4 border border-neutral-900 relative overflow-hidden text-left justify-center select-none text-[11px] text-neutral-450">
          <div className="flex gap-2 items-center">
            <div className="w-6 h-6 rounded-full bg-neutral-800 border border-neutral-900 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-neutral-200 text-[10.5px]">Puneet Patwari</span>
              <span className="text-[9px] text-[#71767b] truncate">Systems Engineer</span>
            </div>
          </div>
          <p className="text-neutral-300 leading-tight line-clamp-2 mt-2">
            Building a high-throughput system isn't about hardware. It's about designing...
          </p>
        </div>
      )
    },
    {
      type: "clip",
      title: "Short Clip Suggestions",
      description: `${clipAssets.length} clip suggestions generated with captions and timestamps.`,
      icon: <Video className="w-4 h-4 text-brand" />,
      asset: clipAssets[0],
      className: "md:col-span-1",
      header: (
        <div className="h-32 bg-neutral-950 rounded-xl flex flex-col justify-between p-5 border border-neutral-900 relative overflow-hidden">
          <div className="flex justify-between items-center">
            <span className="text-[9px] uppercase font-bold text-neutral-450 tracking-wider">TIMESTAMPS</span>
            <span className="brand-badge text-[9px] font-bold px-2 py-0.5 rounded-full">{clipAssets.length} Clips</span>
          </div>
          
          <div className="flex gap-1.5 items-center my-2">
            <span className="text-[10px] font-mono bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded text-neutral-400">00:45</span>
            <span className="text-neutral-700">&rarr;</span>
            <span className="text-[10px] font-mono bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded text-neutral-400">03:10</span>
          </div>

          <div className="w-full bg-neutral-900 h-1 rounded-full overflow-hidden">
            <div className="bg-brand h-full w-[65%]" />
          </div>
        </div>
      )
    },
    {
      type: "thumbnail",
      title: "AI Thumbnail Images",
      description: `${thumbnailAssets.length} image thumbnails created for cover layouts.`,
      icon: <ImageIcon className="w-4 h-4 text-brand" />,
      asset: thumbnailAssets[0],
      className: "md:col-span-1",
      header: (
        <div className="h-32 bg-neutral-950 rounded-xl overflow-hidden border border-neutral-900 relative group/thumb">
          {thumbnailAssets[0]?.content ? (
            <>
              <img 
                src={thumbnailAssets[0].content} 
                alt="Thumbnail" 
                className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-neutral-950/40 group-hover/thumb:bg-neutral-950/20 transition-colors" />
            </>
          ) : (
            <div className="w-full h-full bg-neutral-950 flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-neutral-700" />
            </div>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-neutral-950 p-4 sm:p-6 md:p-10 relative overflow-x-hidden">
      {/* Grid Pattern */}
      <BackgroundBeams />

      {/* Header Bar */}
      <div className="max-w-7xl mx-auto w-full flex flex-col gap-6 mb-10 relative z-10">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-brand transition-all w-fit cursor-pointer group active:scale-95 duration-150"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Home
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-neutral-900 pb-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-extrabold text-neutral-100 sm:text-3xl tracking-tight">
              {project?.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-2 mt-1">
              <span className="text-[10px] text-neutral-550 uppercase font-semibold">Source Ref:</span>
              <span className="text-xs text-neutral-300 font-mono bg-[#121215] border border-neutral-850 px-2 py-0.5 rounded-lg inline-block truncate max-w-[140px] sm:max-w-xs md:max-w-md align-bottom">{project?.source_ref}</span>
              <span className="text-neutral-800">•</span>
              
              <span className="text-[10px] text-neutral-550 uppercase font-semibold">Input:</span>
              <span className="brand-badge text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">{project?.source_type.replace('_', ' ')}</span>
              <span className="text-neutral-800">•</span>
              
              <span className="text-[10px] text-neutral-550 uppercase font-semibold">Model Routing:</span>
              <span className="brand-badge text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">{project?.default_model_mode}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-brand-muted/30 border border-brand-border px-4 py-2 rounded-xl text-brand text-xs font-bold shadow-sm w-fit">
            <Check className="w-4 h-4 text-brand shrink-0 animate-pulse" />
            <span>Pipeline Complete</span>
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
                setPreviewTab("preview"); // Reset tab on click
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
      <AnimatePresence>
        {selectedAsset && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-6"
            onClick={() => setSelectedAsset(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="w-full max-w-2xl h-full sm:h-auto sm:max-h-[90vh] bg-[#121215] border-0 sm:border border-neutral-900 rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden relative border-brand-border/20"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Absolute Close Button */}
              <button
                onClick={() => setSelectedAsset(null)}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 text-neutral-400 hover:text-neutral-200 transition-all cursor-pointer z-50 p-1.5 hover:bg-neutral-900 rounded-lg border border-transparent hover:border-neutral-800"
                title="Close View"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Modal Header */}
              <div className="p-3.5 sm:p-4 pr-12 border-b border-neutral-850 flex items-center justify-between gap-4 bg-neutral-950/10">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="p-2 sm:p-2.5 rounded-xl bg-neutral-950 border border-neutral-850 shrink-0 hidden sm:flex">
                    {selectedAsset.asset_type === "blog" && <FileText className="w-4 h-4 text-brand" />}
                    {selectedAsset.asset_type === "thread" && <Twitter className="w-4 h-4 text-[#1d9bf0]" />}
                    {selectedAsset.asset_type === "linkedin" && <Linkedin className="w-4 h-4 text-[#0a66c2]" />}
                    {selectedAsset.asset_type === "clip" && <Video className="w-4 h-4 text-brand" />}
                    {selectedAsset.asset_type === "thumbnail" && <ImageIcon className="w-4 h-4 text-brand" />}
                  </span>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <h3 className="text-sm font-bold text-neutral-100 capitalize truncate">
                      {selectedAsset.asset_type} Output
                    </h3>
                    <span className="text-[10px] text-neutral-500 flex items-center gap-1.5 font-medium truncate">
                      <Sparkles className="w-3 h-3 text-brand shrink-0" />
                      <span className="truncate">Model: {selectedAsset.model_used.split("/").pop()}</span>
                    </span>
                  </div>
                </div>
                
                {/* Platform Preview Toggle */}
                {["blog", "thread", "linkedin"].includes(selectedAsset.asset_type) && (
                  <div className="flex bg-neutral-950 border border-neutral-850 rounded-lg p-0.5 shrink-0 mr-4 sm:mr-0">
                    <button
                      onClick={() => setPreviewTab("preview")}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1 sm:px-2.5 sm:py-1 rounded-md text-[10px] font-bold cursor-pointer transition-all",
                        previewTab === "preview" 
                          ? "bg-neutral-800 text-neutral-200" 
                          : "text-neutral-500 hover:text-neutral-350"
                      )}
                    >
                      <Eye className="w-3 h-3" />
                      Preview
                    </button>
                    <button
                      onClick={() => setPreviewTab("raw")}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1 sm:px-2.5 sm:py-1 rounded-md text-[10px] font-bold cursor-pointer transition-all",
                        previewTab === "raw" 
                          ? "bg-neutral-800 text-neutral-200" 
                          : "text-neutral-500 hover:text-neutral-350"
                      )}
                    >
                      <EyeOff className="w-3 h-3" />
                      Raw
                    </button>
                  </div>
                )}
              </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-8 no-scrollbar bg-neutral-900/10">
              {selectedAsset.asset_type === "thumbnail" ? (
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-2 p-4 rounded-xl bg-neutral-955 border border-neutral-850 text-neutral-400 text-[11px] leading-relaxed">
                    <AlertCircle className="w-4 h-4 text-neutral-400 shrink-0" />
                    These images are automatically generated by the multimodal model using detailed composition descriptions derived from your key moments.
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {thumbnailAssets.map((thumb) => (
                      <div key={thumb.id} className="flex flex-col gap-3 rounded-xl bg-neutral-950 border border-neutral-850 p-4 hover:border-neutral-700 transition-colors">
                        <div className="aspect-video w-full rounded-lg overflow-hidden border border-neutral-900 relative">
                          <img 
                            src={thumb.content} 
                            alt="Cover thumbnail" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-neutral-500">
                          <span className="font-semibold text-neutral-400">
                            {thumb.related_highlight_id ? `Clip Suggestion #${thumb.related_highlight_id}` : "Blog Cover Image"}
                          </span>
                          <span className="font-mono text-[9px] bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-850">{thumb.model_used.split("/").pop()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : selectedAsset.asset_type === "clip" ? (
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-2 p-4 rounded-xl bg-neutral-950 border border-neutral-850 text-neutral-400 text-[11px] leading-relaxed mb-2">
                    <Clock className="w-4 h-4 text-neutral-400 shrink-0" />
                    Viral clip suggestions mapped with exact timestamps, captions, and visual composition overlay instructions.
                  </div>
                  {clipAssets.map((clip, idx) => {
                    const matchHighlight = highlights.find(h => h.id === clip.related_highlight_id);
                    return (
                      <div key={clip.id} className="p-6 rounded-2xl bg-neutral-950 border border-neutral-850 hover:border-neutral-750 transition-colors flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-900 pb-2 sm:pb-3">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-neutral-200">Clip Suggestion #{idx + 1}</h4>
                            <span className="text-[10px] bg-neutral-900 border border-neutral-850 px-2 py-0.5 rounded text-neutral-300 font-semibold tracking-wide">
                              {matchHighlight ? `${matchHighlight.start_seconds}s - ${matchHighlight.end_seconds}s` : "Suggestion"}
                            </span>
                          </div>
                        </div>

                        {matchHighlight && (
                          <div className="p-3.5 rounded-lg bg-neutral-900/50 border border-neutral-850 text-xs italic text-neutral-500 leading-relaxed">
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
                <div className="px-2">
                  {previewTab === "preview" ? (
                    <>
                      {selectedAsset.asset_type === "blog" && (
                        <BlogPreview 
                          content={selectedAsset.content} 
                          title={project?.title} 
                          coverUrl={thumbnailAssets[0]?.content}
                        />
                      )}
                      {selectedAsset.asset_type === "thread" && (
                        <TwitterPreview content={selectedAsset.content} />
                      )}
                      {selectedAsset.asset_type === "linkedin" && (
                        <LinkedInPreview content={selectedAsset.content} />
                      )}
                    </>
                  ) : (
                    <div className="whitespace-pre-wrap leading-relaxed text-sm text-neutral-350 bg-neutral-950 border border-neutral-850 rounded-2xl p-6 font-mono text-xs">
                      <TextGenerateEffect words={selectedAsset.content} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Options & Actions */}
            <div className="p-3 sm:p-6 border-t border-neutral-850 bg-neutral-950/20 flex flex-col gap-3">
              
              {/* Collapsible Model Selection & Regeneration Panel */}
              {(selectedAsset.asset_type === "thumbnail" || showRegen) && (
                <div className="flex flex-col gap-3 p-3 sm:p-4 rounded-xl border border-[#1f1f23] bg-[#121215] transition-all">
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
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-neutral-800 hover:border-neutral-700 bg-neutral-900 hover:bg-neutral-950 transition-colors cursor-pointer text-xs font-semibold text-neutral-200 w-full"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? "animate-spin" : ""}`} />
                    {regenerating ? "Regenerating..." : "Regenerate Content"}
                  </button>
                </div>
              )}

              {/* Copy/Export/Regen Buttons */}
              {selectedAsset.asset_type !== "thumbnail" ? (
                <div className="flex flex-row items-center gap-2 sm:gap-3 w-full">
                  <MovingBorderButton
                    borderRadius="0.5rem"
                    onClick={() => handleCopy(selectedAsset.content)}
                    className="flex items-center justify-center gap-2 flex-1 py-2.5 text-xs"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 shrink-0" />
                        <span className="hidden sm:inline">Copy Asset Text</span>
                        <span className="inline sm:hidden">Copy</span>
                      </>
                    )}
                  </MovingBorderButton>

                  <button
                    onClick={() => handleExport(selectedAsset)}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 sm:px-6 rounded-lg border border-neutral-800 hover:border-neutral-700 bg-neutral-900 hover:bg-neutral-950 transition-colors flex-1 cursor-pointer text-xs font-bold text-neutral-200"
                  >
                    <Download className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">Download (.txt)</span>
                    <span className="inline sm:hidden">Download</span>
                  </button>

                  <button
                    onClick={() => setShowRegen(!showRegen)}
                    className={cn(
                      "flex items-center justify-center gap-2 py-2.5 px-3 sm:px-4 rounded-lg border transition-colors cursor-pointer text-xs font-bold shrink-0",
                      showRegen 
                        ? "bg-brand/10 border-brand/30 text-brand" 
                        : "bg-neutral-900 border-neutral-800 text-neutral-200 hover:bg-neutral-950 hover:border-neutral-700"
                    )}
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5 shrink-0", showRegen && "rotate-45 transition-transform duration-200")} />
                    <span className="hidden sm:inline">Regenerate</span>
                    <span className="inline sm:hidden">Regen</span>
                  </button>
                </div>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
