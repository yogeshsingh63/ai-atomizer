"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Sparkles, ArrowRight, Zap, Share2, Flame, Cpu, 
  Play, Clock, Clipboard, CheckCircle, ExternalLink,
  Youtube, Linkedin, FileText, ListCollapse
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { LinkedInPreview, TwitterPreview, BlogPreview } from "@/components/post-preview";
import { XIcon } from "@/components/ui/x-icon";
import { PrismLogo } from "@/components/ui/prism-logo";

// Mock Repurposing Content for Live Simulator
const MOCK_SOURCE_VIDEO = {
  url: "https://www.youtube.com/watch?v=SubuU1iOC2s&t=357s",
  title: "Introducing Prism AI: Repurpose Long Videos into Platform-Native Social Assets",
  duration: "12:15",
  channel: "Prism AI Media",
  views: "42K views",
  avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=100&auto=format&fit=crop",
  thumbnail: "/prism_repurpose_thumbnail.png",
  transcriptSnippet: `[00:00] Today, we're officially launching Prism AI. It's a premium content repurposing engine.
[01:15] Creators waste hours taking a single YouTube video or podcast and trying to format it for LinkedIn, X, and blogs.
[02:40] Prism AI automates this. You submit your media link, and it transcribes, extracts key moments, and writes native assets.
[04:20] It even runs a critic agent to rewrite generic AI phrasing, ensuring it sounds authentic and professional...`
};

const MOCK_LINKEDIN = `High-performing content creators don't work harder. They build leverage.

If you are spending hours manually turning your YouTube videos or podcasts into LinkedIn articles, X threads, and SEO blogs, you are playing a low-leverage game.

Introducing **Prism AI**—the premium content repurposing engine built to multiply your distribution.

Here is how the automated pipeline works:
1. **Source Ingestion**: Paste any YouTube link or upload raw audio/video.
2. **Context-Aware Highlights**: The engine extracts high-signal quotes and timestamps.
3. **Platform-Native Layouts**: Writes custom social copy tailored to each network's native culture.
4. **Critic Engine Loop**: A secondary AI reviews the drafts to remove generic AI fluff.

Refract your long-form media into a spectrum of ready-to-publish text assets in under 90 seconds.

Try it out and see how we help media teams secure 10x distribution! #ContentMarketing #CreatorEconomy #Automation #AI`;

const MOCK_TWITTER = `1/ Stop copy-pasting your YouTube descriptions onto other social platforms. It doesn't work.

Every social network has its own native culture and layout constraints. 

Here is how we built Prism AI to automate platform-native content refraction in 90 seconds. 🧵

2/ Prism AI takes your long-form video or audio and automatically extracts:
- 📖 Deep-dive SEO blog articles
- ✍️ Engaging X threads
- 💼 Authoritative LinkedIn updates
- ✂️ Viral short clip recommendations

3/ We built a secondary "Critic Engine" pipeline. 

Standard AI tools write generic, robotic text. The Critic Engine audits the draft, removes filler text, and checks statistics against the actual transcript to preserve absolute editorial integrity.

4/ By distributing platform-native assets simultaneously, you capture 300% more engagement across channels. 

Master the leverage game. Stop creating more content—refract what you already have.`;

const MOCK_BLOG = `# Multiplying Creator Output: The Prism AI Content Engine

In the modern media landscape, production value is no longer a bottleneck. The true battleground is distribution. Creators and marketing teams spend days producing deep-dive video assets, only to publish them once on a single platform. This is a massive waste of leverage. 

**Prism AI** was built to solve this distribution problem by refracting a single core asset into a beautiful spectrum of platform-native text copies.

## The Content Refraction Workflow
Prism AI automates content distribution through four core technical phases:
1. **Transcription & Syncing**: Transcribes incoming media and builds word-level sync maps.
2. **Moments Identification**: Evaluates transcript context to extract viral hooks and key segments.
3. **Draft Composition**: Writes platform-custom social cards, threads, and SEO blogs.
4. **Critic Rewriting**: Audits drafts through a secondary LLM chain to remove generic AI filler.

## Native Platform Layouts
A copy-pasted block of text doesn't perform well on X. A brief bulleted summary underperforms on LinkedIn. By training our engine on successful platform layouts, Prism AI compositions natively fit feed cultures.`;

const MOCK_HIGHLIGHTS = [
  {
    timestamp: "00:00 - 01:10",
    title: "The Creator Distribution Moat",
    description: "Explaining why content distribution leverage matters more than raw volume.",
  },
  {
    timestamp: "02:15 - 03:50",
    title: "Platform-Native Layout Writing",
    description: "A breakdown of why custom templates are required for LinkedIn, X, and SEO blogs.",
  },
  {
    timestamp: "04:05 - 06:20",
    title: "The Critic Agent Pipeline",
    description: "How Prism AI audits drafts through a secondary critic step to ensure human quality.",
  }
];

export default function LandingPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"input" | "linkedin" | "twitter" | "blog" | "highlights">("input");
  const [copied, setCopied] = useState(false);
  const [imgErr, setImgErr] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderCopyButton = (text: string, titleStr: string) => (
    <button 
      onClick={(e) => {
        e.stopPropagation();
        handleCopy(text);
      }}
      className="p-1 hover:bg-neutral-800 rounded-md text-neutral-400 hover:text-neutral-200 transition-all cursor-pointer flex items-center justify-center active:scale-[0.85] duration-150 shrink-0"
      title={titleStr}
    >
      {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Clipboard className="w-3.5 h-3.5" />}
    </button>
  );

  const getActiveTabContent = () => {
    switch (activeTab) {
      case "input":
        return (
          <div className="flex flex-col gap-4 p-4 sm:p-5 bg-[#0e0e11] border border-neutral-900 rounded-xl w-full max-w-full sm:max-w-lg mx-auto min-w-0 overflow-hidden">
            <div className="flex items-center gap-3 w-full min-w-0">
              <div className="w-10 h-10 rounded-full bg-red-950/40 border border-red-900/30 flex items-center justify-center text-red-500 shrink-0">
                <Youtube className="w-5 h-5" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Source YouTube Video</span>
                <a href={MOCK_SOURCE_VIDEO.url} target="_blank" rel="noreferrer" className="text-sm font-bold text-neutral-200 hover:text-brand flex items-center gap-1 min-w-0 w-full overflow-hidden">
                  <span className="truncate flex-1 min-w-0">{MOCK_SOURCE_VIDEO.title}</span>
                  <ExternalLink className="w-3 h-3 inline shrink-0" />
                </a>
              </div>
            </div>
            
            <div className="relative aspect-video w-full max-w-full rounded-lg overflow-hidden border border-neutral-900 group shrink-0">
              <img src={MOCK_SOURCE_VIDEO.thumbnail} alt="Video cover" className="absolute inset-0 w-full h-full object-cover brightness-75" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-neutral-950/80 border border-neutral-800 flex items-center justify-center text-neutral-200 group-hover:scale-105 transition-transform">
                  <Play className="w-5 h-5 fill-current ml-0.5 text-brand" />
                </div>
              </div>
              <div className="absolute bottom-2 right-2 bg-neutral-950/90 border border-neutral-800 text-[10px] px-2 py-0.5 rounded font-mono text-neutral-300">
                {MOCK_SOURCE_VIDEO.duration}
              </div>
            </div>
 
            <div className="flex flex-col gap-1.5 mt-2 min-w-0 w-full">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest truncate block">Transcript Snippet (Auto-Extracted)</span>
              <div className="p-3 bg-neutral-950 border border-neutral-900 rounded-lg text-[11px] font-mono text-neutral-400 leading-relaxed max-h-36 overflow-y-auto no-scrollbar w-full min-w-0 break-words whitespace-pre-wrap">
                {MOCK_SOURCE_VIDEO.transcriptSnippet.split("\n").map((line, i) => (
                  <p key={i} className="mb-1 break-words whitespace-pre-wrap"><span className="text-brand/70 font-semibold">{line.slice(0, 7)}</span>{line.slice(7)}</p>
                ))}
              </div>
            </div>
          </div>
        );
      case "linkedin":
        return (
          <div className="w-full max-w-full overflow-hidden">
            <LinkedInPreview content={MOCK_LINKEDIN} actions={renderCopyButton(MOCK_LINKEDIN, "Copy text")} />
          </div>
        );
      case "twitter":
        return (
          <div className="w-full max-w-full overflow-hidden">
            <TwitterPreview content={MOCK_TWITTER} actions={renderCopyButton(MOCK_TWITTER, "Copy thread")} />
          </div>
        );
      case "blog":
        return (
          <div className="relative max-h-[480px] overflow-y-auto no-scrollbar border border-neutral-850 rounded-2xl w-full max-w-full overflow-hidden">
            <BlogPreview content={MOCK_BLOG} title="Building the World's Fastest Storage Engine" actions={renderCopyButton(MOCK_BLOG, "Copy blog article")} />
          </div>
        );
      case "highlights":
        return (
          <div className="flex flex-col gap-3 w-full max-w-full sm:max-w-lg mx-auto bg-neutral-950 border border-neutral-850 p-4 sm:p-5 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-3 mb-2 flex-wrap gap-2">
              <span className="text-xs font-bold text-neutral-300">Extracted Highlights & Short Clips</span>
              <span className="text-[10px] text-neutral-500">{MOCK_HIGHLIGHTS.length} clips found</span>
            </div>
            
            <div className="flex flex-col gap-3">
              {MOCK_HIGHLIGHTS.map((item, idx) => (
                <div key={idx} className="p-3 bg-neutral-900/30 border border-neutral-900 rounded-xl flex items-start gap-3 hover:border-brand-border transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-brand-muted border border-brand-border flex items-center justify-center text-brand shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-bold text-neutral-200 group-hover:text-brand transition-colors truncate">{item.title}</span>
                      <span className="text-[10px] font-mono bg-neutral-900 text-neutral-450 border border-neutral-850 px-1.5 py-0.5 rounded shrink-0">
                        {item.timestamp}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-neutral-400 mt-1 leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
    }
  };

  const features = [
    {
      icon: <Zap className="w-4 h-4 text-brand" />,
      title: "One-Click Atomization",
      description: "Submit a single YouTube link, audio file, or text transcript, and instantly output full blog posts, X threads, and LinkedIn cards."
    },
    {
      icon: <Share2 className="w-4 h-4 text-brand" />,
      title: "Engineered Platform Cards",
      description: "Every asset is customized to match network formatting guidelines natively. Never publish AI-looking text again."
    },
    {
      icon: <Flame className="w-4 h-4 text-brand" />,
      title: "Critic Rewriter Engine",
      description: "A secondary prompt pipeline acts as a critic to audit tone, remove generic filler text, and verify key transcript statistics."
    },
    {
      icon: <Cpu className="w-4 h-4 text-brand" />,
      title: "Robust OpenRouter Routing",
      description: "Uses a fallback system of high-performance LLMs to secure speed, maintain high rate limits, and cut operating costs."
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-neutral-950 text-neutral-100 relative overflow-x-hidden">
      {/* Background Thin Static Grid */}
      <BackgroundBeams />

      {/* Navigation Bar */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between z-10 border-b border-neutral-900/80 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-2">
          <PrismLogo size={32} />
          <span className="font-extrabold text-base tracking-tight text-neutral-200 ml-1">
            Prism <span className="text-brand">AI</span>
          </span>
        </div>
        <Link 
          href="/new" 
          className="text-xs font-semibold text-neutral-300 hover:text-neutral-150 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 px-4 py-2 rounded-lg transition-all duration-200 active:scale-95"
        >
          Launch Engine
        </Link>
      </header>

      {/* Hero Section */}
      <section className="flex flex-col items-center text-center justify-center max-w-5xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-12 sm:pb-16 relative z-10 flex-1">
        <div className="flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-brand-muted border border-brand-border text-[9px] sm:text-[10px] font-bold text-brand mb-5 sm:mb-6 uppercase tracking-wider text-center">
          <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
          <span>Content Repurposing Pipeline</span>
        </div>

        <h1 className="text-2xl sm:text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.15] text-neutral-100 max-w-4xl px-1">
          Convert Long Videos & Audio Into <span className="underline decoration-brand/60 decoration-wavy underline-offset-4 sm:underline-offset-8 text-brand">Structured Social Assets</span>
        </h1>

        <p className="text-[11px] sm:text-sm text-neutral-400 max-w-2xl mt-4 sm:mt-6 leading-relaxed px-2 sm:px-0">
          Supply YouTube links, raw audio/video uploads, or text logs. The system transcribes, extracts highlights, and writes targeted network posts.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 mt-8 sm:mt-10 w-full max-w-xs sm:max-w-none mx-auto justify-center px-4">
          <HoverBorderGradient
            as="button"
            onClick={() => router.push("/new")}
            containerClassName="w-full sm:w-auto py-3 px-8 rounded-xl font-bold text-xs shadow-lg bg-neutral-100 hover:bg-white active:scale-[0.98] transition-all duration-200"
            className="flex items-center justify-center gap-2 text-neutral-950 text-xs"
          >
            Get Started
            <ArrowRight className="w-3.5 h-3.5 text-neutral-950" />
          </HoverBorderGradient>
          
          <a
            href="#simulator"
            className="w-full sm:w-auto py-3 px-8 text-xs font-semibold text-neutral-300 hover:text-neutral-150 bg-neutral-900/40 hover:bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 rounded-xl transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            See interactive preview
          </a>
        </div>

        {/* Live Simulator Mockup Section */}
        <div id="simulator" className="w-full max-w-4xl mt-12 sm:mt-20 relative px-1">
          <div className="border border-neutral-850 rounded-2xl overflow-hidden bg-neutral-900/10 backdrop-blur-md p-1 border-brand-border/40 shadow-xl w-full max-w-full min-w-0">
            
            <div className="bg-neutral-950 rounded-xl border border-neutral-900 p-4 sm:p-6 flex flex-col gap-6 w-full max-w-full min-w-0">
              
              {/* Window Controls & Simulator Tabs */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-neutral-900 pb-4 gap-4 w-full min-w-0">
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                  <span className="text-[10px] text-neutral-500 font-mono ml-2">live_preview_simulator.sh</span>
                </div>
                
                {/* Horizontal scrollable tabs on small screens */}
                <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto w-full max-w-full min-w-0 sm:w-auto pb-1 sm:pb-0 no-scrollbar">
                  <button 
                    onClick={() => setActiveTab("input")}
                    className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-[10.5px] font-semibold transition-all duration-200 shrink-0 border cursor-pointer active:scale-95 ${
                      activeTab === "input" 
                        ? "bg-brand-muted border-brand-border text-brand" 
                        : "bg-transparent border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
                    }`}
                  >
                    <Youtube className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Source</span>
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab("linkedin")}
                    className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-[10.5px] font-semibold transition-all duration-200 shrink-0 border cursor-pointer active:scale-95 ${
                      activeTab === "linkedin" 
                        ? "bg-brand-muted border-brand-border text-brand" 
                        : "bg-transparent border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
                    }`}
                  >
                    <Linkedin className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">LinkedIn</span>
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab("twitter")}
                    className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-[10.5px] font-semibold transition-all duration-200 shrink-0 border cursor-pointer active:scale-95 ${
                      activeTab === "twitter" 
                        ? "bg-brand-muted border-brand-border text-brand" 
                        : "bg-transparent border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
                    }`}
                  >
                    <XIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">X Thread</span>
                  </button>

                  <button 
                    onClick={() => setActiveTab("blog")}
                    className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-[10.5px] font-semibold transition-all duration-200 shrink-0 border cursor-pointer active:scale-95 ${
                      activeTab === "blog" 
                        ? "bg-brand-muted border-brand-border text-brand" 
                        : "bg-transparent border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Blog</span>
                  </button>

                  <button 
                    onClick={() => setActiveTab("highlights")}
                    className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-[10.5px] font-semibold transition-all duration-200 shrink-0 border cursor-pointer active:scale-95 ${
                      activeTab === "highlights" 
                        ? "bg-brand-muted border-brand-border text-brand" 
                        : "bg-transparent border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
                    }`}
                  >
                    <ListCollapse className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Highlights</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Tab Pane Wrapper */}
              <div className="w-full min-h-[300px] overflow-hidden min-w-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="w-full max-w-full min-w-0"
                  >
                    {getActiveTabContent()}
                  </motion.div>
                </AnimatePresence>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 border-t border-neutral-900 relative z-10 w-full">
        <div className="flex flex-col items-center text-center gap-2 mb-10 sm:mb-16">
          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-brand tracking-widest brand-badge px-2.5 py-1 rounded-full">Features System</span>
          <h2 className="text-lg sm:text-xl md:text-3xl font-extrabold text-neutral-100 tracking-tight mt-3">
            Engineered For Editorial Integrity
          </h2>
          <p className="text-[11px] sm:text-sm text-neutral-500 max-w-lg mt-1 px-2 sm:px-0">
            We move past basic template formatting. The engine optimizes context, reviews structural logic, and targets platforms.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {features.map((feature, idx) => (
            <div 
              key={idx} 
              className="premium-panel p-5 sm:p-6 rounded-xl flex flex-col gap-3 sm:gap-4"
            >
              <div className="w-8 h-8 rounded-lg bg-neutral-950 border border-neutral-900 flex items-center justify-center shadow-sm text-brand">
                {feature.icon}
              </div>
              <h4 className="text-xs font-bold text-neutral-205 mt-2">{feature.title}</h4>
              <p className="text-[11px] text-neutral-450 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Action Banner */}
      <section className="w-full max-w-4xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24 relative z-10 text-center">
        <div className="bg-[#0e0e11] border border-neutral-900/60 border-brand-border/20 p-6 sm:p-12 rounded-2xl flex flex-col items-center gap-5 sm:gap-6">
          <h3 className="text-lg sm:text-xl md:text-2xl font-extrabold text-neutral-150">Ready to distribute your voice?</h3>
          <p className="text-xs text-neutral-400 max-w-sm leading-relaxed">
            Stop manually scripting separate updates. Transform your first transcript in less than 90 seconds.
          </p>
          <button 
            onClick={() => router.push("/new")}
            className="text-xs font-bold text-neutral-950 bg-neutral-100 hover:bg-white px-6 py-3 rounded-lg flex items-center gap-2 transition-all cursor-pointer active:scale-95 duration-150"
          >
            Create Your First Project
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-neutral-900 py-8 text-center text-[9px] text-neutral-600 relative z-10 mt-auto">
        &copy; {new Date().getFullYear()} Prism AI. Built with Next.js 14 & Aceternity UI. All rights reserved.
      </footer>
    </div>
  );
}
