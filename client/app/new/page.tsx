"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Youtube, Upload, FileText, ArrowRight, Sparkles } from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { Dropzone } from "@/components/dropzone";
import { ModelSelector } from "@/components/model-selector";
import { createProject, SourceType } from "@/lib/api";

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [modelMode, setModelMode] = useState<"auto" | "pinned">("auto");
  const [pinnedModel, setPinnedModel] = useState<string | null>(null);

  // Input fields
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [articleText, setArticleText] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

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
        alert("Please provide a source input.");
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
      alert("Failed to create project. Check server console.");
      setLoading(false);
    }
  };

  const tabs = [
    {
      title: "YouTube Link",
      value: "youtube",
      icon: <Youtube className="w-4 h-4" />,
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
            }}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full bg-neutral-900/60 border border-neutral-800 focus:border-violet-500 rounded-xl px-4 py-3 text-sm text-neutral-200 outline-none transition-colors duration-200"
          />
        </div>
      ),
    },
    {
      title: "Upload File",
      value: "upload",
      icon: <Upload className="w-4 h-4" />,
      content: (
        <Dropzone
          selectedFile={selectedFile}
          onFileSelect={(file) => {
            setSelectedFile(file);
            setYoutubeUrl("");
            setArticleText("");
          }}
          className="mt-2"
        />
      ),
    },
    {
      title: "Paste Text",
      value: "text",
      icon: <FileText className="w-4 h-4" />,
      content: (
        <div className="flex flex-col gap-2 mt-2">
          <label className="text-xs font-semibold text-neutral-400">Article or Transcript Text</label>
          <textarea
            value={articleText}
            onChange={(e) => {
              setArticleText(e.target.value);
              setYoutubeUrl("");
              setSelectedFile(null);
            }}
            placeholder="Paste your long-form article, lecture transcript, or notes here..."
            rows={5}
            className="w-full bg-neutral-900/60 border border-neutral-800 focus:border-violet-500 rounded-xl px-4 py-3 text-sm text-neutral-200 outline-none transition-colors duration-200 resize-none no-scrollbar"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12 bg-neutral-950 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05)_0%,transparent_50%)] pointer-events-none -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[100%] h-[100%] bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.02)_0%,transparent_50%)] pointer-events-none -z-10" />

      <div className="w-full max-w-xl glass-panel p-8 sm:p-10 rounded-[32px] flex flex-col gap-8 shadow-2xl">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-600/10 border border-violet-500/20 text-xs font-semibold text-violet-400">
            <Sparkles className="w-3.5 h-3.5" />
            AI Content Repurposing Engine
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-100 mt-2 sm:text-4xl bg-gradient-to-r from-neutral-100 via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
            AI Atomizer
          </h1>
          <p className="text-sm text-neutral-400 max-w-sm">
            Upload your source file or paste text to split it into viral articles, threads, LinkedIn posts, and shorts.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-neutral-400 tracking-wider uppercase">Project Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Scaling AI Startups Panel"
              className="w-full bg-neutral-900/60 border border-neutral-800 focus:border-violet-500 rounded-xl px-4 py-3 text-sm text-neutral-200 outline-none transition-colors duration-200"
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
            {!loading && <ArrowRight className="w-4 h-4 text-violet-400" />}
          </HoverBorderGradient>
        </form>
      </div>
    </div>
  );
}
