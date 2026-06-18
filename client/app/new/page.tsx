"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Youtube, Upload, FileText, ArrowRight, Sparkles, 
  AlertCircle, ArrowLeft, LogIn, UserCheck, ShieldAlert 
} from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { Dropzone } from "@/components/dropzone";
import { ModelSelector } from "@/components/model-selector";
import { createProject, SourceType, redirectToGoogleLogin, loginAsGuest, logout } from "@/lib/api";
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
        setError(`Authentication failed: ${authError}`);
        // Clean URL params
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      } else if (token) {
        localStorage.setItem("prism_token", token);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        setIsAuthenticated(true);
      } else {
        const storedToken = localStorage.getItem("prism_token");
        if (storedToken) {
          setIsAuthenticated(true);
        }
      }
      setAuthChecking(false);
    }
  }, []);

  const handleGoogleLogin = () => {
    setError(null);
    try {
      redirectToGoogleLogin();
    } catch (e) {
      setError("Failed to initialize Google login. Use Guest access instead.");
    }
  };

  const handleGuestLogin = async () => {
    setError(null);
    setAuthLoading(true);
    try {
      await loginAsGuest();
      setIsAuthenticated(true);
    } catch (e) {
      setError("Failed to create a guest session. Please verify the backend is running.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setIsAuthenticated(false);
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
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12 bg-neutral-950 relative overflow-hidden">
      <BackgroundBeams />

      <div className="w-full max-w-lg flex flex-col gap-4 relative z-10 animate-fade-in-up">
        {/* Navigation & Session Status */}
        <div className="flex items-center justify-between w-full">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-neutral-900 bg-neutral-950 hover:bg-neutral-900 text-xs font-semibold text-neutral-400 hover:text-neutral-200 transition-all cursor-pointer group active:scale-95 duration-150"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-neutral-500 group-hover:text-brand" />
            <span>Back to Home</span>
          </button>

          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="text-[10px] uppercase font-bold text-neutral-500 hover:text-brand border border-neutral-900 hover:border-brand/30 bg-neutral-950/40 px-3 py-1.5 rounded-xl transition-all cursor-pointer active:scale-95 duration-150"
            >
              Sign Out
            </button>
          )}
        </div>

        {error && (
          <div className="w-full p-3.5 bg-red-950/20 border border-red-900/30 rounded-xl text-red-400 text-xs font-semibold flex items-center gap-2 justify-center transition-all duration-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="text-center">{error}</span>
          </div>
        )}

        {!isAuthenticated ? (
          /* Gorgeous Glassmorphic Auth Panel */
          <div className="w-full bg-[#121215] border border-[#1f1f23] p-6 sm:p-10 rounded-2xl flex flex-col gap-8 shadow-2xl relative overflow-hidden group">
            {/* Subtle glow background */}
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
              <p className="text-xs text-neutral-500 max-w-xs leading-relaxed mt-1">
                Choose an account method to access the model selection and highlight refraction engine.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {/* Google OAuth Button */}
              <HoverBorderGradient
                as="button"
                onClick={handleGoogleLogin}
                disabled={authLoading}
                containerClassName="w-full"
                className="w-full flex items-center justify-center gap-2.5 text-xs font-bold text-neutral-200 bg-neutral-900 hover:bg-neutral-800 transition-all py-3"
              >
                {/* SVG for Google G logo */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Continue with Google
              </HoverBorderGradient>

              {/* Guest Session Button */}
              <button
                onClick={handleGuestLogin}
                disabled={authLoading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-neutral-900 bg-neutral-950 hover:bg-neutral-900 text-xs font-semibold text-neutral-300 hover:text-white transition-all cursor-pointer active:scale-95 duration-150 disabled:opacity-50"
              >
                {authLoading ? (
                  <div className="w-3.5 h-3.5 border-t border-neutral-300 rounded-full animate-spin" />
                ) : (
                  <LogIn className="w-3.5 h-3.5 text-neutral-500" />
                )}
                Continue as Guest
              </button>
            </div>

            <div className="text-[10px] text-neutral-600 text-center flex items-center justify-center gap-1">
              <ShieldAlert className="w-3 h-3" />
              <span>Guest session data is temporary and periodically cleared.</span>
            </div>
          </div>
        ) : (
          /* Original Project Creation Form */
          <div className="w-full bg-[#121215] border border-[#1f1f23] p-5 sm:p-8 md:p-10 rounded-2xl flex flex-col gap-6 sm:gap-8 shadow-xl">
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
        )}
      </div>
    </div>
  );
}
