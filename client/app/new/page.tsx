"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Youtube, Upload, FileText, ArrowRight, Sparkles,
  AlertCircle, ArrowLeft, LogIn, ShieldAlert
} from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { Dropzone } from "@/components/dropzone";
import { ModelSelector } from "@/components/model-selector";
import { AssetSelector, TargetAsset } from "@/components/asset-selector";
import { createProject, SourceType, loginAsGuest, logout } from "@/lib/api";
import { ProfileDropdown } from "@/components/profile-dropdown";

import { BackgroundBeams } from "@/components/ui/background-beams";
import { PrismLogo } from "@/components/ui/prism-logo";

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [modelMode, setModelMode] = useState<"auto" | "pinned">("auto");
  const [pinnedModel, setPinnedModel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Asset selection
  const [targetAssets, setTargetAssets] = useState<TargetAsset[]>(["blog", "thread", "linkedin", "clip"]);

  // Input fields
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [articleText, setArticleText] = useState("");

  // Verify auth on mount & extract OAuth callback tokens
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get("token");
      const authError = urlParams.get("auth_error");

      if (authError) {
        setTimeout(() => setError(`Authentication failed: ${authError}`), 0);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      } else if (token) {
        localStorage.setItem("prism_token", token);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        setTimeout(() => setIsAuthenticated(true), 0);
      } else {
        const storedToken = localStorage.getItem("prism_token");
        if (storedToken) {
          setTimeout(() => setIsAuthenticated(true), 0);
        }
      }
      setTimeout(() => setAuthChecking(false), 0);
    }
  }, []);

  const handleGuestLogin = async () => {
    setError(null);
    setAuthLoading(true);
    try {
      await loginAsGuest();
      setIsAuthenticated(true);
    } catch {
      setError("Failed to create a guest session. Please verify the backend is running.");
    } finally {
      setAuthLoading(false);
    }
  };

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
        target_assets: targetAssets,
        file: selectedFile || undefined,
      });

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
            className="w-full bg-neutral-950 border border-neutral-900 focus:border-brand-border focus:ring-1 focus:ring-brand/30 rounded-lg px-4 py-3 text-xs text-neutral-200 outline-none transition-all duration-200"
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
            className="w-full bg-neutral-950 border border-neutral-900 focus:border-brand-border focus:ring-1 focus:ring-brand/30 rounded-lg px-4 py-3 text-xs text-neutral-200 outline-none transition-all duration-200 resize-none no-scrollbar"
          />
        </div>
      ),
    },
  ];

  if (authChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950 text-neutral-400 relative">
        <BackgroundBeams />
        <div className="flex flex-col items-center gap-3 relative z-10">
          <div className="w-8 h-8 rounded-full border-t-2 border-neutral-400 animate-spin" />
          <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">Verifying Session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-neutral-950 relative overflow-hidden">
      <BackgroundBeams />

      {/* Header Bar */}
      <header className="relative z-10 border-b border-neutral-900/80 bg-neutral-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-neutral-900 bg-neutral-950 hover:bg-neutral-900 text-xs font-semibold text-neutral-400 hover:text-neutral-200 transition-all cursor-pointer group active:scale-95 duration-150"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-neutral-500 group-hover:text-brand" />
              <span>Back</span>
            </button>
            <div className="h-5 w-px bg-neutral-900" />
            <div className="flex items-center gap-2">
              <PrismLogo size={24} />
              <span className="font-extrabold text-sm tracking-tight text-neutral-200">
                Prism <span className="text-brand">AI</span>
              </span>
            </div>
          </div>

          <ProfileDropdown />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        {error && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md p-3.5 bg-red-950/30 border border-red-900/40 rounded-xl text-red-400 text-xs font-semibold flex items-center gap-2 justify-center shadow-lg backdrop-blur-sm animate-fade-in-up">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="text-center">{error}</span>
          </div>
        )}

        {!isAuthenticated ? (
          /* Auth Panel — centered card */
          <div className="w-full max-w-md flex flex-col gap-8 animate-fade-in-up">
            <div className="bg-neutral-900/50 border border-neutral-800 p-6 sm:p-10 rounded-2xl flex flex-col gap-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute -inset-px bg-gradient-to-r from-brand-border/10 to-brand/10 rounded-2xl -z-10 opacity-30 group-hover:opacity-75 transition-opacity" />

              <div className="flex flex-col items-center text-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full brand-badge text-[10px] font-bold uppercase tracking-wider mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-brand" />
                  Refraction Identity
                </div>
                <div className="flex items-center gap-2.5">
                  <PrismLogo size={36} />
                  <span className="font-extrabold text-lg tracking-tight text-neutral-200">
                    Prism <span className="text-brand">AI</span>
                  </span>
                </div>
                <h1 className="text-xl font-extrabold tracking-tight text-neutral-100 mt-4">
                  Authenticate Session
                </h1>
                <p className="text-[10px] text-brand font-semibold tracking-widest uppercase mt-0.5">
                  Own Your Projects
                </p>
                <p className="text-xs text-neutral-500 max-w-xs leading-relaxed mt-2">
                  Refract long-form media in under 90 seconds — and keep every project tied to your account so you can revisit, regenerate, or export anytime.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {/* Google Sign In */}
                <button
                  type="button"
                  onClick={() => {
                    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
                    window.location.href = `${backendUrl}/api/auth/google/login`;
                  }}
                  disabled={authLoading}
                  className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 text-xs font-bold text-neutral-200 transition-all cursor-pointer active:scale-95 duration-150 disabled:opacity-50"
                >
                  <svg className="w-4 h-4 mr-0.5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582l3.51-3.51C17.745 1.027 14.99 0 12 0 7.354 0 3.307 2.69 1.34 6.6l3.926 3.165z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.49 12.275c0-.825-.075-1.62-.215-2.385H12v4.51h6.46a5.523 5.523 0 0 1-2.4 3.62l3.765 2.92c2.2-2.03 3.465-5.02 3.465-8.665z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.266 14.235L1.34 17.4A11.942 11.942 0 0 0 12 24c2.936 0 5.645-.968 7.677-2.61l-3.765-2.92a7.073 7.073 0 0 1-9.646-4.235z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 4.909c1.9 0 3.61.65 4.95 1.93l3.51-3.51C17.745 1.027 14.99 0 12 0A11.942 11.942 0 0 0 1.34 6.6l3.926 3.165A7.073 7.073 0 0 1 12 4.909z"
                    />
                  </svg>
                  Sign In with Google
                </button>

                <div className="flex items-center my-1">
                  <div className="h-px bg-neutral-800 flex-1" />
                  <span className="text-[9px] uppercase font-bold text-neutral-600 px-3 tracking-widest">or</span>
                  <div className="h-px bg-neutral-800 flex-1" />
                </div>

                {/* Guest — no account, free fallback chain, session is temporary */}
                <button
                  type="button"
                  onClick={handleGuestLogin}
                  disabled={authLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-brand-border bg-gradient-to-r from-brand-muted to-brand/20 hover:from-brand/30 hover:to-brand/30 text-xs font-bold text-neutral-100 transition-all cursor-pointer active:scale-95 duration-150 disabled:opacity-50"
                >
                  {authLoading ? (
                    <div className="w-3.5 h-3.5 border-t border-neutral-300 rounded-full animate-spin" />
                  ) : (
                    <LogIn className="w-3.5 h-3.5 text-brand" />
                  )}
                  Continue as Guest
                </button>
                <p className="text-[10px] text-neutral-600 text-center -mt-1">
                  Free to try — no account needed, data is temporary.
                </p>
              </div>

              <div className="text-[10px] text-neutral-600 text-center flex items-center justify-center gap-1">
                <ShieldAlert className="w-3 h-3" />
                <span>Guest session data is temporary and periodically cleared.</span>
              </div>
            </div>
          </div>
        ) : (
          /* Project Creation — split layout */
          <div className="w-full max-w-5xl flex flex-col gap-6 animate-fade-in-up">
            {/* Page Title */}
            <div className="flex flex-col items-center text-center gap-2 mb-2">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full brand-badge text-[10px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-brand" />
                Repurposing Engine
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-100 mt-2">
                Create New Project
              </h1>
              <p className="text-xs text-neutral-500 max-w-md">
                Submit your source content and configure which assets to generate.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {/* Split Layout: Source Input | Configuration */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Panel: Source Input */}
                <div className="flex flex-col gap-5 bg-neutral-900/40 border border-neutral-800 rounded-2xl p-5 sm:p-6">
                  <div className="flex items-center gap-2 pb-3 border-b border-neutral-800">
                    <div className="w-7 h-7 rounded-lg bg-brand-muted border border-brand-border flex items-center justify-center">
                      <FileText className="w-3.5 h-3.5 text-brand" />
                    </div>
                    <h2 className="text-sm font-bold text-neutral-200">Source Content</h2>
                  </div>

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
                    <label className="text-xs font-semibold text-neutral-400 tracking-wider uppercase mb-1">Input Source</label>
                    <Tabs tabs={tabs} />
                  </div>
                </div>

                {/* Right Panel: Configuration */}
                <div className="flex flex-col gap-5 bg-neutral-900/40 border border-neutral-800 rounded-2xl p-5 sm:p-6">
                  <div className="flex items-center gap-2 pb-3 border-b border-neutral-800">
                    <div className="w-7 h-7 rounded-lg bg-brand-muted border border-brand-border flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5 text-brand" />
                    </div>
                    <h2 className="text-sm font-bold text-neutral-200">Configuration</h2>
                  </div>

                  <AssetSelector
                    selected={targetAssets}
                    onChange={setTargetAssets}
                  />

                  <div className="h-px bg-neutral-800" />

                  <ModelSelector
                    mode={modelMode}
                    pinnedModel={pinnedModel}
                    onChange={(mode, model) => {
                      setModelMode(mode);
                      setPinnedModel(model);
                    }}
                    dropup={true}
                  />
                </div>
              </div>

              {/* Submit Bar */}
              <div className="flex items-center justify-between gap-4 bg-neutral-900/40 border border-neutral-800 rounded-2xl p-4 sm:p-5">
                <div className="hidden sm:flex flex-col gap-0.5 min-w-0">
                  <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Ready to refract</span>
                  <span className="text-xs text-neutral-300 font-semibold truncate">
                    {targetAssets.length} asset{targetAssets.length !== 1 ? "s" : ""} selected
                  </span>
                </div>
                <HoverBorderGradient
                  as="button"
                  type="submit"
                  disabled={loading}
                  containerClassName="w-full sm:w-auto"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-8"
                >
                  {loading ? "Processing..." : "Atomize Content"}
                  {!loading && <ArrowRight className="w-3.5 h-3.5" />}
                </HoverBorderGradient>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
