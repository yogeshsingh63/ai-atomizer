"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Sparkles, ArrowRight, Zap, Share2, Flame, Cpu, 
  Play, Clock, Clipboard, CheckCircle, ExternalLink,
  Youtube, Twitter, Linkedin, FileText, ListCollapse
} from "lucide-react";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { LinkedInPreview, TwitterPreview, BlogPreview } from "@/components/post-preview";

// Mock Repurposing Content for Live Simulator
const MOCK_SOURCE_VIDEO = {
  url: "https://www.youtube.com/watch?v=db_engine_101",
  title: "Building a Lock-Free High-Throughput DB from Scratch",
  duration: "18:42",
  channel: "Systems Architecture Insider",
  views: "128K views",
  avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=100&auto=format&fit=crop",
  thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop",
  transcriptSnippet: `[00:05] Today, we're deep-diving into why standard databases lock threads.
[01:12] We designed our database using standard memory mapping and specialized thread-local queues.
[02:40] By eliminating lock contention entirely, we achieved 1.2 million write ops per second on consumer hardware.
[04:15] Memory mapping allows the OS to handle caching directly, bypassing kernel space overhead...`
};

const MOCK_LINKEDIN = `Building a high-throughput system isn't about throwing hardware at the problem. It's about designing around hardware realities.

Our team just finished benchmarking our new storage engine: 1.2 Million writes/second.

The secret? Thread-local ring buffers that eliminate CPU thread blocking entirely.

Here are 3 architectural rules we followed:
1. Eliminate Lock Contention (no shared state)
2. Memory Map Files (bypass kernel space overhead)
3. Custom Ring Buffers (lock-free rings)

Read the full technical breakdown in our latest blog post! #SystemDesign #Database`;

const MOCK_TWITTER = `1/ We built the world's fastest database by breaking traditional assumptions.

Here is how we reached 1.2M writes/sec without high-end hardware. 🧵

2/ Standard databases rely on mutex locks for concurrency. Mutexes block execution threads, creating massive bottlenecks when scaled.

We threw mutexes out.

3/ Instead, we used thread-local queues. Every core has its own ring buffer. Writing threads never compete for the same memory space.

4/ The results speak for themselves: over 1.2M sequential write ops per second on a single machine. Next up: network layer optimizations.`;

const MOCK_BLOG = `# Building the World's Fastest Storage Engine

For the past year, we have been obsessed with memory performance and cache locality. When designing database systems, execution locks are usually the first thing to degrade throughput.

## The Problem: Shared State Bottlenecks
When multiple cores attempt to read and write to the same indexing tree, mutex locks force cores to idle.

## Our Solution: Lock-Free Thread Locality
By routing every channel to a core-specific lock-free queue, we completely eliminated write collision. The results speak for themselves: over 1.2M sequential write ops per second.`;

const MOCK_HIGHLIGHTS = [
  {
    timestamp: "00:45 - 02:15",
    title: "The Mutex Lock Bottleneck",
    description: "Explanation of why traditional database mutexes stall CPU cores at scale.",
  },
  {
    timestamp: "03:10 - 05:40",
    title: "Thread-Local Ring Buffers",
    description: "Deep dive into lock-free architecture using single-producer single-consumer buffers.",
  },
  {
    timestamp: "07:20 - 09:15",
    title: "Memory Mapping Files",
    description: "Bypassing write() kernel boundary overhead by writing directly to mapped system memory.",
  }
];

export default function LandingPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"input" | "linkedin" | "twitter" | "blog" | "highlights">("input");
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getActiveTabContent = () => {
    switch (activeTab) {
      case "input":
        return (
          <div className="flex flex-col gap-4 p-5 bg-[#0e0e11] border border-neutral-900 rounded-xl max-w-lg mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-950/40 border border-red-900/30 flex items-center justify-center text-red-500">
                <Youtube className="w-5 h-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Source YouTube Video</span>
                <a href={MOCK_SOURCE_VIDEO.url} target="_blank" rel="noreferrer" className="text-sm font-bold text-neutral-200 hover:text-brand flex items-center gap-1 truncate">
                  {MOCK_SOURCE_VIDEO.title}
                  <ExternalLink className="w-3 h-3 inline shrink-0" />
                </a>
              </div>
            </div>
            
            <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-neutral-900 group">
              <img src={MOCK_SOURCE_VIDEO.thumbnail} alt="Video cover" className="w-full h-full object-cover brightness-75" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-neutral-950/80 border border-neutral-800 flex items-center justify-center text-neutral-200 group-hover:scale-105 transition-transform">
                  <Play className="w-5 h-5 fill-current ml-0.5 text-brand" />
                </div>
              </div>
              <div className="absolute bottom-2 right-2 bg-neutral-950/90 border border-neutral-800 text-[10px] px-2 py-0.5 rounded font-mono text-neutral-300">
                {MOCK_SOURCE_VIDEO.duration}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 mt-2">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Transcript Snippet (Auto-Extracted)</span>
              <div className="p-3 bg-neutral-950 border border-neutral-900 rounded-lg text-[11px] font-mono text-neutral-400 leading-relaxed max-h-36 overflow-y-auto no-scrollbar">
                {MOCK_SOURCE_VIDEO.transcriptSnippet.split("\n").map((line, i) => (
                  <p key={i} className="mb-1"><span className="text-brand/70 font-semibold">{line.slice(0, 7)}</span>{line.slice(7)}</p>
                ))}
              </div>
            </div>
          </div>
        );
      case "linkedin":
        return (
          <div className="relative">
            <button 
              onClick={() => handleCopy(MOCK_LINKEDIN)}
              className="absolute top-14 right-3 z-10 p-2 bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-neutral-400 hover:text-neutral-200 transition-colors"
              title="Copy to clipboard"
            >
              {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Clipboard className="w-3.5 h-3.5" />}
            </button>
            <LinkedInPreview content={MOCK_LINKEDIN} />
          </div>
        );
      case "twitter":
        return (
          <div className="relative">
            <button 
              onClick={() => handleCopy(MOCK_TWITTER)}
              className="absolute top-14 right-3 z-10 p-2 bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-neutral-400 hover:text-neutral-200 transition-colors"
              title="Copy thread to clipboard"
            >
              {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Clipboard className="w-3.5 h-3.5" />}
            </button>
            <TwitterPreview content={MOCK_TWITTER} />
          </div>
        );
      case "blog":
        return (
          <div className="relative max-h-[480px] overflow-y-auto no-scrollbar border border-neutral-850 rounded-2xl">
            <button 
              onClick={() => handleCopy(MOCK_BLOG)}
              className="absolute top-14 right-3 z-10 p-2 bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-neutral-400 hover:text-neutral-200 transition-colors"
              title="Copy blog text"
            >
              {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Clipboard className="w-3.5 h-3.5" />}
            </button>
            <BlogPreview content={MOCK_BLOG} title="Building the World's Fastest Storage Engine" />
          </div>
        );
      case "highlights":
        return (
          <div className="flex flex-col gap-3 max-w-lg mx-auto bg-neutral-950 border border-neutral-850 p-5 rounded-2xl">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-3 mb-2">
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
                    <div className="flex items-center justify-between flex-wrap gap-1">
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
    <div className="flex flex-col min-h-screen bg-neutral-950 text-neutral-100 relative overflow-hidden">
      {/* Background Thin Static Grid */}
      <BackgroundBeams />

      {/* Navigation Bar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between z-10 border-b border-neutral-900/80 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-brand" />
          </div>
          <span className="font-extrabold text-base tracking-tight text-neutral-200">
            AI <span className="text-brand">Atomizer</span>
          </span>
        </div>
        <Link 
          href="/new" 
          className="text-xs font-semibold text-neutral-300 hover:text-neutral-150 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 px-4 py-2 rounded-lg transition-all duration-200"
        >
          Launch Engine
        </Link>
      </header>

      {/* Hero Section */}
      <section className="flex flex-col items-center text-center justify-center max-w-5xl mx-auto px-6 pt-20 pb-16 relative z-10 flex-1">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-muted border border-brand-border text-[10px] font-bold text-brand mb-6 uppercase tracking-wider">
          <Flame className="w-3.5 h-3.5" />
          Premium Content Repurposing Pipeline
        </div>

        <h1 className="text-4xl font-extrabold sm:text-6xl tracking-tight leading-[1.12] text-neutral-100 max-w-4xl">
          Convert Long Videos & Audio Into <span className="underline decoration-brand/60 decoration-wavy underline-offset-8 text-brand">Structured Social Assets</span>
        </h1>

        <p className="text-xs sm:text-sm text-neutral-400 max-w-2xl mt-6 leading-relaxed">
          Unlock maximum distribution. Supply YouTube links, raw audio/video uploads, or text logs. The system structures transcribing, extracts highlights, writes targeted network updates, and maps post previews.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 mt-10 w-full justify-center">
          <HoverBorderGradient
            as="button"
            onClick={() => router.push("/new")}
            containerClassName="w-full sm:w-auto"
            className="flex items-center justify-center gap-2 font-bold py-3 px-8 text-neutral-950 text-xs bg-neutral-100 hover:bg-white border-neutral-700"
          >
            Start Repurposing Free
            <ArrowRight className="w-3.5 h-3.5" />
          </HoverBorderGradient>
          
          <a
            href="#simulator"
            className="text-xs font-semibold text-neutral-450 hover:text-neutral-200 py-3 px-6 rounded-lg border border-neutral-850 bg-neutral-900/40 hover:bg-neutral-900/80 transition-colors w-full sm:w-auto"
          >
            See interactive preview
          </a>
        </div>

        {/* Live Simulator Mockup Section */}
        <div id="simulator" className="w-full max-w-4xl mt-20 relative">
          <div className="border border-neutral-850 rounded-2xl overflow-hidden bg-neutral-900/10 backdrop-blur-md p-1 border-brand-border/40 shadow-xl">
            
            <div className="bg-neutral-950 rounded-xl border border-neutral-900 p-4 sm:p-6 flex flex-col gap-6">
              
              {/* Window Controls & Simulator Tabs */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-neutral-900 pb-4 gap-4">
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-neutral-800" />
                  <div className="w-2.5 h-2.5 rounded-full bg-neutral-800" />
                  <div className="w-2.5 h-2.5 rounded-full bg-neutral-800" />
                  <span className="text-[10px] text-neutral-500 font-mono ml-2">live_preview_simulator.sh</span>
                </div>
                
                {/* Horizontal scrollable tabs on small screens */}
                <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 no-scrollbar">
                  <button 
                    onClick={() => setActiveTab("input")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10.5px] font-semibold transition-all duration-200 shrink-0 border cursor-pointer ${
                      activeTab === "input" 
                        ? "bg-brand-muted border-brand-border text-brand" 
                        : "bg-transparent border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
                    }`}
                  >
                    <Youtube className="w-3.5 h-3.5" />
                    Source YouTube
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab("linkedin")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10.5px] font-semibold transition-all duration-200 shrink-0 border cursor-pointer ${
                      activeTab === "linkedin" 
                        ? "bg-brand-muted border-brand-border text-brand" 
                        : "bg-transparent border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
                    }`}
                  >
                    <Linkedin className="w-3.5 h-3.5" />
                    LinkedIn Card
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab("twitter")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10.5px] font-semibold transition-all duration-200 shrink-0 border cursor-pointer ${
                      activeTab === "twitter" 
                        ? "bg-brand-muted border-brand-border text-brand" 
                        : "bg-transparent border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
                    }`}
                  >
                    <Twitter className="w-3.5 h-3.5" />
                    X Thread
                  </button>

                  <button 
                    onClick={() => setActiveTab("blog")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10.5px] font-semibold transition-all duration-200 shrink-0 border cursor-pointer ${
                      activeTab === "blog" 
                        ? "bg-brand-muted border-brand-border text-brand" 
                        : "bg-transparent border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Blog Article
                  </button>

                  <button 
                    onClick={() => setActiveTab("highlights")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10.5px] font-semibold transition-all duration-200 shrink-0 border cursor-pointer ${
                      activeTab === "highlights" 
                        ? "bg-brand-muted border-brand-border text-brand" 
                        : "bg-transparent border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
                    }`}
                  >
                    <ListCollapse className="w-3.5 h-3.5" />
                    Short Highlights
                  </button>
                </div>
              </div>

              {/* Dynamic Tab Pane Wrapper */}
              <div className="w-full min-h-[300px] flex items-center justify-center">
                <div className="w-full transition-all duration-300">
                  {getActiveTabContent()}
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24 border-t border-neutral-900 relative z-10 w-full">
        <div className="flex flex-col items-center text-center gap-2 mb-16">
          <span className="text-[10px] uppercase font-bold text-brand tracking-widest brand-badge px-2.5 py-1 rounded-full">Features System</span>
          <h2 className="text-xl font-extrabold text-neutral-100 sm:text-3xl tracking-tight mt-3">
            Engineered For Editorial Integrity
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-lg mt-1">
            We move past basic template formatting. The engine optimizes context, reviews structural logic, and targets platforms.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => (
            <div 
              key={idx} 
              className="premium-panel p-6 rounded-xl flex flex-col gap-4"
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
      <section className="w-full max-w-4xl mx-auto px-6 pb-24 relative z-10 text-center">
        <div className="bg-[#0e0e11] border border-neutral-900/60 border-brand-border/20 p-8 sm:p-12 rounded-2xl flex flex-col items-center gap-6">
          <h3 className="text-xl sm:text-2xl font-extrabold text-neutral-150">Ready to distribute your voice?</h3>
          <p className="text-xs text-neutral-400 max-w-sm leading-relaxed">
            Stop manually scripting separate updates. Transform your first transcript in less than 90 seconds.
          </p>
          <button 
            onClick={() => router.push("/new")}
            className="text-xs font-bold text-neutral-950 bg-neutral-100 hover:bg-white px-6 py-3 rounded-lg flex items-center gap-2 transition-all cursor-pointer"
          >
            Create Your First Project
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-neutral-900 py-8 text-center text-[9px] text-neutral-600 relative z-10 mt-auto">
        &copy; {new Date().getFullYear()} AI Atomizer. Built with Next.js 14 & Aceternity UI. All rights reserved.
      </footer>
    </div>
  );
}
