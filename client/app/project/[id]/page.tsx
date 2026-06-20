"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  FileText, Linkedin, Video, Image as ImageIcon, 
  Clipboard, CheckCircle, Check, Download, RefreshCw, ArrowLeft, Sparkles, Clock, AlertCircle, Eye, EyeOff,
  MessageCircle, Repeat2, Heart, X
} from "lucide-react";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { Button as MovingBorderButton } from "@/components/ui/moving-border";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { ModelSelector } from "@/components/model-selector";
import { CardRegenPanel } from "@/components/card-regen-panel";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { TwitterPreview, LinkedInPreview, BlogPreview } from "@/components/post-preview";
import { motion, AnimatePresence } from "framer-motion";
import { XIcon } from "@/components/ui/x-icon";
import { 
  Project, GeneratedAsset, Highlight, 
  getProject, getAssets, getHighlights, regenerateAsset 
} from "@/lib/api";
import { cn } from "@/lib/utils";

const DEFAULT_THUMBNAIL_PLACEHOLDER = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop";

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


  useEffect(() => {
    if (!projectId) return;

    async function loadData() {
      try {
        const [p, a, h] = await Promise.all([
          getProject(projectId),
          getAssets(projectId),
          getHighlights(projectId),
        ]);

        // If the project is not done yet, redirect to the processing loader/error screen
        if (p && p.status !== "done") {
          router.replace(`/project/${projectId}/processing`);
          return;
        }

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

  const parseThreadIntoTweets = (text: string): string[] => {
    const regex = /(?:^|\n+)(?=\d+[\/\.]\s*)/g;
    const parts = text.split(regex).map(p => p.trim()).filter(Boolean);
    if (parts.length > 1) {
      return parts;
    }
    return text.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
  };

  const formatTimestamp = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleExport = (asset: GeneratedAsset) => {
    if (asset.asset_type === "thumbnail") {
      const a = document.createElement("a");
      a.href = asset.content;
      a.download = `${project?.title || "repurposed"}-thumbnail.png`;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
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
        { model: regenMode === "pinned" ? regenModel : null, model_mode: regenMode }
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

  // Per-card regenerate (from the inline CardRegenPanel beneath each bento card)
  const handleCardRegen = async (
    assetId: number,
    opts: { prompt?: string | null; model?: string | null; model_mode?: string | null }
  ) => {
    const updated = await regenerateAsset(projectId, assetId, opts);
    const nextAssets = assets.map(a => a.id === assetId ? updated : a);
    setAssets(nextAssets);
    // If the drawer is open on this asset, refresh it too
    if (selectedAsset?.id === assetId) setSelectedAsset(updated);
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
      ),
      footer: blogAsset ? (
        <CardRegenPanel assetType="blog" onRegenerate={(opts) => handleCardRegen(blogAsset.id, opts)} />
      ) : undefined
    },
    {
      type: "thread",
      title: "Twitter/X Thread",
      description: threadAsset?.content || "Writes a multi-tweet thread layout.",
      icon: <XIcon className="w-4 h-4 text-[#e7e9ea]" />,
      asset: threadAsset,
      className: "md:col-span-1",
      header: (() => {
        const threadTweets = threadAsset?.content ? parseThreadIntoTweets(threadAsset.content) : [];
        const firstTweet = threadTweets.length > 0 ? threadTweets[0] : "1/ We built the world's fastest database by breaking assumption...";
        return (
          <div className="h-32 bg-neutral-950 rounded-xl flex flex-col p-4 border border-neutral-900 relative overflow-hidden text-left justify-center select-none text-[11px] text-[#71767b]">
            <div className="flex gap-2 items-start">
              <div className="w-6 h-6 rounded-full bg-neutral-800 border border-[#2f3336] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="font-bold text-[#e7e9ea] text-[10.5px]">Yogesh</span>
                  <span className="truncate">@yogesh_rajawat</span>
                </div>
                <p className="text-[#e7e9ea] leading-tight line-clamp-2 mt-0.5 whitespace-pre-wrap">
                  {firstTweet}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-[9px] text-[#71767b] mt-3 pl-8">
              <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" /> {18 + (threadTweets.length % 7)}</span>
              <span className="flex items-center gap-0.5"><Repeat2 className="w-3 h-3" /> {9 + (threadTweets.length % 5)}</span>
              <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" /> {47 + (threadTweets.length % 13)}</span>
            </div>
          </div>
        );
      })(),
      footer: threadAsset ? (
        <CardRegenPanel assetType="thread" onRegenerate={(opts) => handleCardRegen(threadAsset.id, opts)} />
      ) : undefined
    },
    {
      type: "linkedin",
      title: "LinkedIn Post",
      description: linkedinAsset?.content || "Creates a professional LinkedIn post update.",
      icon: <Linkedin className="w-4 h-4 text-[#0a66c2]" />,
      asset: linkedinAsset,
      className: "md:col-span-1",
      header: (
        <div className="h-32 bg-neutral-950 rounded-xl flex flex-col p-4 border border-neutral-900 relative overflow-hidden text-left justify-center select-none text-[11px] text-neutral-400">
          <div className="flex gap-2 items-center">
            <div className="w-6 h-6 rounded-full bg-neutral-800 border border-neutral-900 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-neutral-200 text-[10.5px]">Yogesh</span>
              <span className="text-[9px] text-[#71767b] truncate">AI Content Strategist</span>
            </div>
          </div>
          <p className="text-neutral-300 leading-tight line-clamp-2 mt-2 whitespace-pre-wrap">
            {linkedinAsset?.content || "Building a high-throughput system isn't about hardware. It's about designing..."}
          </p>
        </div>
      ),
      footer: linkedinAsset ? (
        <CardRegenPanel assetType="linkedin" onRegenerate={(opts) => handleCardRegen(linkedinAsset.id, opts)} />
      ) : undefined
    },
    {
      type: "clip",
      title: "Short Clip Suggestions",
      description: `${clipAssets.length} clip suggestions generated with captions and timestamps.`,
      icon: <Video className="w-4 h-4 text-brand" />,
      asset: clipAssets[0],
      className: "md:col-span-1",
      header: (() => {
        const firstClipHighlight = clipAssets.length > 0
          ? highlights.find(h => h.id === clipAssets[0].related_highlight_id)
          : highlights[0];
        const startTime = firstClipHighlight ? formatTimestamp(firstClipHighlight.start_seconds) : "00:00";
        const endTime = firstClipHighlight ? formatTimestamp(firstClipHighlight.end_seconds) : "00:30";
        const totalHighlights = highlights.length || 1;
        const progressPct = totalHighlights > 0 ? Math.round((clipAssets.length / totalHighlights) * 100) : 0;
        return (
          <div className="h-32 bg-neutral-950 rounded-xl flex flex-col justify-between p-5 border border-neutral-900 relative overflow-hidden">
            <div className="flex justify-between items-center">
              <span className="text-[9px] uppercase font-bold text-neutral-400 tracking-wider">TIMESTAMPS</span>
              <span className="brand-badge text-[9px] font-bold px-2 py-0.5 rounded-full">{clipAssets.length} Clips</span>
            </div>
            
            <div className="flex gap-1.5 items-center my-2">
              <span className="text-[10px] font-mono bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded text-neutral-400">{startTime}</span>
              <span className="text-neutral-700">&rarr;</span>
              <span className="text-[10px] font-mono bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded text-neutral-400">{endTime}</span>
            </div>
   
            <div className="w-full bg-neutral-900 h-1 rounded-full overflow-hidden">
              <div className="bg-brand h-full transition-all" style={{ width: `${Math.max(progressPct, 8)}%` }} />
            </div>
          </div>
        );
      })(),
      footer: clipAssets[0] ? (
        <CardRegenPanel assetType="clip" onRegenerate={(opts) => handleCardRegen(clipAssets[0].id, opts)} />
      ) : undefined
    },
    {
      type: "thumbnail",
      title: "AI Thumbnail Images",
      description: `${thumbnailAssets.length || 1} image thumbnail templates for cover layouts.`,
      icon: <ImageIcon className="w-4 h-4 text-brand" />,
      asset: thumbnailAssets[0] || {
        id: -1,
        project_id: projectId,
        asset_type: "thumbnail",
        content: DEFAULT_THUMBNAIL_PLACEHOLDER,
        model_used: "placeholder",
        status: "done",
        created_at: new Date().toISOString()
      },
      className: "md:col-span-1",
      header: (
        <div className="h-32 bg-neutral-950 rounded-xl overflow-hidden border border-neutral-900 relative group/thumb">
          <img 
            src={thumbnailAssets[0]?.content || DEFAULT_THUMBNAIL_PLACEHOLDER} 
            alt="Thumbnail" 
            className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-neutral-950/40 group-hover/thumb:bg-neutral-950/20 transition-colors" />
        </div>
      ),
      footer: thumbnailAssets[0] ? (
        <CardRegenPanel assetType="thumbnail" onRegenerate={(opts) => handleCardRegen(thumbnailAssets[0].id, opts)} />
      ) : undefined
    },
    {
      type: "highlights",
      title: "Key Highlights",
      description: `${highlights.length} high-impact moments extracted from the source.`,
      icon: <Sparkles className="w-4 h-4 text-brand" />,
      asset: null,
      className: "md:col-span-1",
      header: (
        <div className="h-32 bg-neutral-950 rounded-xl flex flex-col p-4 border border-neutral-900 relative overflow-hidden text-left justify-center">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] uppercase font-bold text-neutral-400 tracking-wider">Extracted Moments</span>
            <span className="brand-badge text-[9px] font-bold px-2 py-0.5 rounded-full">{highlights.length}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {highlights.slice(0, 3).map((h, i) => (
              <div key={h.id} className="flex items-center gap-2 text-[10px] text-neutral-500">
                <span className="font-mono text-brand shrink-0">{formatTimestamp(h.start_seconds)}</span>
                <span className="truncate">{h.quote}</span>
              </div>
            ))}
            {highlights.length === 0 && (
              <span className="text-[10px] text-neutral-600 italic">No highlights extracted.</span>
            )}
          </div>
        </div>
      ),
      footer: undefined
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
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-neutral-900 bg-neutral-950/40 hover:bg-neutral-900 text-xs font-semibold text-neutral-400 hover:text-neutral-200 transition-all w-fit cursor-pointer group active:scale-95 duration-150"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-neutral-500 group-hover:text-brand" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-neutral-900 pb-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-extrabold text-neutral-100 sm:text-3xl tracking-tight">
              {project?.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-1">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Source Ref:</span>
                <span className="text-xs text-neutral-300 font-mono bg-[#121215] border border-neutral-900 px-2 py-0.5 rounded-lg inline-block truncate max-w-[180px] sm:max-w-xs md:max-w-md align-bottom" title={project?.source_ref}>{project?.source_ref}</span>
              </div>
              
              <span className="text-neutral-800 hidden sm:inline select-none">•</span>
              
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Input:</span>
                <span className="brand-badge text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">{project?.source_type.replace('_', ' ')}</span>
              </div>
              
              <span className="text-neutral-800 hidden sm:inline select-none">•</span>
              
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Model Routing:</span>
                <span className="brand-badge text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">{project?.default_model_mode}</span>
              </div>
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
                } else if (item.type !== "highlights") {
                  setSelectedAsset(item.asset || null);
                }
              }}
              footer={item.footer}
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
              className="w-full max-w-2xl h-full sm:h-[650px] sm:max-h-[85vh] bg-[#121215] border-0 sm:border border-neutral-900 rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden relative border-brand-border/20"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-neutral-900 flex items-center justify-between gap-4 bg-neutral-950/10 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="p-2 sm:p-2.5 rounded-xl bg-neutral-950 border border-neutral-900 shrink-0 hidden sm:flex">
                    {selectedAsset.asset_type === "blog" && <FileText className="w-4 h-4 text-brand" />}
                    {selectedAsset.asset_type === "thread" && <XIcon className="w-4 h-4 text-[#e7e9ea]" />}
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
                
                {/* Right Header Side (Toggle & Close) */}
                <div className="flex items-center gap-3 shrink-0">
                  {/* Platform Preview Toggle */}
                  {["blog", "thread", "linkedin"].includes(selectedAsset.asset_type) && (
                    <div className="flex bg-neutral-950 border border-neutral-900 rounded-lg p-0.5 shrink-0">
                      <button
                        onClick={() => setPreviewTab("preview")}
                        className={cn(
                          "flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-all",
                          previewTab === "preview" 
                            ? "bg-neutral-800 text-neutral-200" 
                            : "text-neutral-500 hover:text-neutral-400"
                        )}
                      >
                        <Eye className="w-3 h-3" />
                        Preview
                      </button>
                      <button
                        onClick={() => setPreviewTab("raw")}
                        className={cn(
                          "flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-all",
                          previewTab === "raw" 
                            ? "bg-neutral-800 text-neutral-200" 
                            : "text-neutral-500 hover:text-neutral-400"
                        )}
                      >
                        <EyeOff className="w-3 h-3" />
                        Raw
                      </button>
                    </div>
                  )}

                  {/* Close Button inline inside the flex flow */}
                  <button
                    onClick={() => setSelectedAsset(null)}
                    className="text-neutral-400 hover:text-neutral-200 transition-all cursor-pointer p-1.5 hover:bg-neutral-900 rounded-lg border border-transparent hover:border-neutral-800 shrink-0"
                    title="Close View"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-8 no-scrollbar bg-neutral-900/10">
              {selectedAsset.asset_type === "thumbnail" ? (
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-2 p-4 rounded-xl bg-neutral-950 border border-neutral-900 text-neutral-400 text-[11px] leading-relaxed">
                    <AlertCircle className="w-4 h-4 text-neutral-400 shrink-0" />
                    These images are automatically generated by the multimodal model using detailed composition descriptions derived from your key moments.
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {thumbnailAssets.map((thumb) => (
                      <div key={thumb.id} className="flex flex-col gap-3 rounded-xl bg-neutral-950 border border-neutral-900 p-4 hover:border-neutral-800 transition-colors">
                        <div className="aspect-video w-full rounded-lg overflow-hidden border border-neutral-900 relative">
                          <img 
                            src={thumb.content} 
                            alt="Cover thumbnail" 
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-neutral-500">
                          <span className="font-semibold text-neutral-400">
                            {thumb.related_highlight_id ? `Clip Suggestion #${thumb.related_highlight_id}` : "Blog Cover Image"}
                          </span>
                          <span className="font-mono text-[9px] bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-900">{thumb.model_used.split("/").pop()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : selectedAsset.asset_type === "clip" ? (
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-2 p-4 rounded-xl bg-neutral-950 border border-neutral-900 text-neutral-400 text-[11px] leading-relaxed mb-2">
                    <Clock className="w-4 h-4 text-neutral-400 shrink-0" />
                    Viral clip suggestions mapped with exact timestamps, captions, and visual composition overlay instructions.
                  </div>
                  {clipAssets.map((clip, idx) => {
                    const matchHighlight = highlights.find(h => h.id === clip.related_highlight_id);
                    return (
                      <div key={clip.id} className="p-6 rounded-2xl bg-neutral-950 border border-neutral-900 hover:border-neutral-800 transition-colors flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-900 pb-2 sm:pb-3">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-neutral-200">Clip Suggestion #{idx + 1}</h4>
                            <span className="text-[10px] bg-neutral-900 border border-neutral-900 px-2 py-0.5 rounded text-neutral-300 font-semibold tracking-wide">
                              {matchHighlight ? `${matchHighlight.start_seconds}s - ${matchHighlight.end_seconds}s` : "Suggestion"}
                            </span>
                          </div>
                        </div>

                        {matchHighlight && (
                          <div className="p-3.5 rounded-lg bg-neutral-900/50 border border-neutral-900 text-xs italic text-neutral-500 leading-relaxed">
                            Quote: &ldquo;{matchHighlight.quote}&rdquo;
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
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={previewTab}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                    >
                      {previewTab === "preview" ? (
                        <>
                          {selectedAsset.asset_type === "blog" && (
                            <BlogPreview 
                              content={selectedAsset.content} 
                              title={project?.title} 
                              coverUrl={thumbnailAssets[0]?.content || DEFAULT_THUMBNAIL_PLACEHOLDER}
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
                        selectedAsset.asset_type === "thread" ? (
                          <div className="flex flex-col gap-4">
                            {parseThreadIntoTweets(selectedAsset.content).map((tweet, idx) => {
                              const charCount = tweet.length;
                              const isOverLimit = charCount > 280;
                              return (
                                <div key={idx} className="p-5 rounded-2xl bg-neutral-950 border border-neutral-900 flex flex-col gap-3 relative overflow-hidden group/tweet">
                                  <div className="flex justify-between items-center text-[10px] text-neutral-500 border-b border-neutral-900 pb-2">
                                    <span className="font-bold text-neutral-400 uppercase tracking-wider">Tweet #{idx + 1}</span>
                                    <span className={cn(
                                      "font-mono font-bold px-1.5 py-0.5 rounded",
                                      isOverLimit ? "text-red-400 bg-red-950/20" : "text-neutral-500 bg-neutral-900"
                                    )}>
                                      {charCount} / 280 chars
                                    </span>
                                  </div>
                                  <div className="text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed">
                                    {tweet}
                                  </div>
                                  <button
                                    onClick={() => handleCopy(tweet)}
                                    className="self-end flex items-center gap-1 py-1.5 px-3 rounded-lg border border-neutral-800 hover:border-neutral-700 bg-neutral-900 hover:bg-neutral-950 text-[10px] font-bold text-neutral-300 cursor-pointer active:scale-95 transition-all"
                                  >
                                    <Clipboard className="w-3 h-3" />
                                    Copy Tweet
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap leading-relaxed text-sm text-neutral-400 bg-neutral-950 border border-neutral-900 rounded-2xl p-6 font-mono text-xs">
                            <TextGenerateEffect words={selectedAsset.content} />
                          </div>
                        )
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Footer Options & Actions */}
            <div className="p-4 sm:p-5 border-t border-neutral-900 bg-neutral-950/40 flex flex-col gap-3.5 shrink-0 z-10">
              {/* Row 1: Model Routing Selector */}
              <div className="w-full">
                <ModelSelector
                  mode={regenMode}
                  pinnedModel={regenModel}
                  onChange={(mode, model) => {
                    setRegenMode(mode);
                    setRegenModel(model);
                  }}
                  className="w-full"
                  size="sm"
                  dropup={true}
                />
              </div>

              {/* Row 2: Action Buttons Grid */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full">
                <MovingBorderButton
                  borderRadius="0.75rem"
                  onClick={() => handleCopy(selectedAsset.content)}
                  className="flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold select-none w-full"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                      <span className="truncate">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Clipboard className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        {selectedAsset.asset_type === "thumbnail" ? "Copy Link" : "Copy"}
                      </span>
                    </>
                  )}
                </MovingBorderButton>

                <button
                  onClick={() => handleExport(selectedAsset)}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border border-neutral-800 hover:border-neutral-700 bg-neutral-900 hover:bg-neutral-950 transition-colors cursor-pointer text-[11px] font-bold text-neutral-200 active:scale-95 duration-150 w-full"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {selectedAsset.asset_type === "thumbnail" ? "Download" : "Export"}
                  </span>
                </button>

                <button
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border border-neutral-800 hover:border-neutral-700 bg-neutral-900 hover:bg-neutral-950 transition-colors cursor-pointer text-[11px] font-bold text-neutral-200 active:scale-95 duration-150 w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5 shrink-0", regenerating && "animate-spin")} />
                  <span className="truncate">{regenerating ? "Regenerating" : "Regenerate"}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
