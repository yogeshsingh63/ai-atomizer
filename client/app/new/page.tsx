"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Youtube, Upload, FileText, ArrowRight, Sparkles, AlertCircle } from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { Dropzone } from "@/components/dropzone";
import { ModelSelector } from "@/components/model-selector";
import { createProject, SourceType } from "@/lib/api";
import { BackgroundBeams } from "@/components/ui/background-beams";

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [modelMode, setModelMode] = useState<"auto" | "pinned">("auto");
  const [pinnedModel, setPinnedModel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Input fields
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [articleText, setArticleText] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let sourceType: SourceType = "article_text";
      let sourceRef = "";

      if (youtubeUrl) {
        sourceType = "youtube_url";
        sourceRef = youtubeUrl;
      } else if (selectedFile) {
        sourceType = "upload";
        sourceRef = selectedFile.name;
      } else if (articleText) {
        sourceType = "article_text";
        sourceRef = articleText;
      } else {
        setError("Please provide a YouTube URL, upload a file, or paste text content.");
        setLoading(false);
        return;
      }

      const res = await createProject({
        title: title || (sourceType === "youtube_url" ? "YouTube Video Repurpose" : sourceType === "upload" ? "Audio/Video File Upload" : "Pasted Text Blog"),
        source_type: sourceType,
        source_ref: sourceRef,
        default_model_mode: modelMode,
        default_pinned_model: pinnedModel,
        file: selectedFile || undefined,
      });

      // Redirect to processing page
      router.push(`/project/${res.project_id}/processing`);
    } catch (e) {
      console.error(e);
      setError("Failed to create project. Please verify the backend services are running.");
      setLoading(false);
    }
  };

  const tabs = [
    {
      title: "YouTube Link",
      value: "youtube",
      icon: <Youtube className="w-3.5 h-3.5" />,
      content: (
        <div className="flex flex-col gap-2 mt-2">
          <label className="text-xs font-semibold text-neutral-400">YouTube URL</label>
          <input
            type="url"
            value={youtubeUrl}
            onChange={(e) => {
              setYoutubeUrl(e.target.value);
              setSelectedFile(null);
              setArticleText("");
              setError(null);
            }}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full bg-[#121215] border border-[#1f1f23] focus:border-brand-border focus:ring-1 focus:ring-brand/30 rounded-lg px-4 py-3 text-xs text-neutral-200 outline-none transition-all duration-200"
          />
        </div>
      ),
    },
    {
      title: "Upload File",
      value: "upload",
      icon: <Upload className="w-3.5 h-3.5" />,
      content: (
        <Dropzone
          selectedFile={selectedFile}
          onFileSelect={(file) => {
            setSelectedFile(file);
            setYoutubeUrl("");
            setArticleText("");
            setError(null);
          }}
          className="mt-2"
        />
      ),
    },
    {
      title: "Paste Text",
      value: "text",
      icon: <FileText className="w-3.5 h-3.5" />,
      content: (
        <div className="flex flex-col gap-2 mt-2">
          <label className="text-xs font-semibold text-neutral-400">Article or Transcript Text</label>
          <textarea
            value={articleText}
            onChange={(e) => {
              setArticleText(e.target.value);
              setYoutubeUrl("");
              setSelectedFile(null);
              setError(null);
            }}
            placeholder="Paste your long-form article, lecture transcript, or notes here..."
            rows={5}
            className="w-full bg-[#121215] border border-[#1f1f23] focus:border-brand-border focus:ring-1 focus:ring-brand/30 rounded-lg px-4 py-3 text-xs text-neutral-200 outline-none transition-all duration-200 resize-none no-scrollbar"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12 bg-neutral-950 relative overflow-hidden">
      {/* Grid Pattern */}
      <BackgroundBeams />

      <div className="w-full max-w-lg bg-[#121215] border border-[#1f1f23] p-5 sm:p-8 md:p-10 rounded-2xl flex flex-col gap-6 sm:gap-8 shadow-xl relative z-10">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full brand-badge text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-brand" />
            Repurposing Engine
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-100 mt-2">
            Create Project
          </h1>
          <p className="text-xs text-neutral-500 max-w-xs">
            Submit your source file or transcript to produce blog posts, tweet threads, and LinkedIn updates.
          </p>
        </div>

        {error && (
          <div className="w-full p-3.5 bg-red-950/20 border border-red-900/30 rounded-xl text-red-400 text-xs font-semibold flex items-center gap-2 justify-center transition-all duration-300 animate-pulse">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-neutral-400 tracking-wider uppercase">Project Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Scaling AI Startups Panel"
              className="w-full bg-neutral-950 border border-neutral-900 focus:border-brand-border focus:ring-1 focus:ring-brand/30 rounded-lg px-4 py-3 text-xs text-neutral-200 outline-none transition-all duration-200"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-neutral-400 tracking-wider uppercase mb-1">Source Content</label>
            <Tabs tabs={tabs} />
          </div>

          <ModelSelector
            mode={modelMode}
            pinnedModel={pinnedModel}
            onChange={(mode, model) => {
              setModelMode(mode);
              setPinnedModel(model);
            }}
          />

          <HoverBorderGradient
            as="button"
            type="submit"
            disabled={loading}
            containerClassName="w-full mt-4"
            className="w-full flex items-center justify-center gap-2"
          >
            {loading ? "Processing..." : "Atomize Content"}
            {!loading && <ArrowRight className="w-3.5 h-3.5" />}
          </HoverBorderGradient>
        </form>
      </div>
    </div>
  );
}
