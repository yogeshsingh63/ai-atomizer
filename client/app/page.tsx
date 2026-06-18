"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, Zap, Share2, FileText, Image as ImageIcon, Flame, ShieldAlert, Cpu } from "lucide-react";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { BackgroundBeams } from "@/components/ui/background-beams";

export default function LandingPage() {
  const router = useRouter();

  const features = [
    {
      icon: <Zap className="w-5 h-5 text-amber-400" />,
      title: "One-Click Multiplier",
      description: "Submit a single YouTube link or video file and instantly produce a blog, a tweet thread, and LinkedIn posts."
    },
    {
      icon: <Share2 className="w-5 h-5 text-sky-400" />,
      title: "Platform-Specific Optimization",
      description: "Each generated asset reads like it was native-written. No recycled copy-paste formats."
    },
    {
      icon: <Flame className="w-5 h-5 text-rose-500" />,
      title: "Critic Rewriter Pass",
      description: "An automated secondary review removes standard AI phrases and aligns statements with source transcripts."
    },
    {
      icon: <Cpu className="w-5 h-5 text-violet-400" />,
      title: "OpenRouter Failbacks",
      description: "Chains zero-price APIs to guarantee maximum rate limits and high availability for active users."
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-neutral-950 text-neutral-100 relative overflow-hidden">
      {/* Decorative Beams */}
      <BackgroundBeams />

      {/* Navigation Bar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10 border-b border-neutral-900/60 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-violet-400" />
          </div>
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-neutral-100 to-neutral-400 bg-clip-text text-transparent">
            AI Atomizer
          </span>
        </div>
        <Link 
          href="/new" 
          className="text-xs font-semibold text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60 border border-neutral-800 px-4 py-2 rounded-xl transition-all duration-200"
        >
          Launch App
        </Link>
      </header>

      {/* Hero Section */}
      <section className="flex flex-col items-center text-center justify-center max-w-4xl mx-auto px-6 pt-20 pb-16 relative z-10 flex-1">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-600/10 border border-violet-500/20 text-xs font-semibold text-violet-400 animate-pulse mb-6">
          <Flame className="w-3.5 h-3.5" />
          Transform long videos into viral social assets
        </div>

        <h1 className="text-4xl font-extrabold sm:text-6xl tracking-tight leading-[1.15] bg-gradient-to-b from-neutral-100 via-neutral-200 to-neutral-500 bg-clip-text text-transparent max-w-3xl">
          Turn One Piece of Long Content into <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-rose-400 bg-clip-text text-transparent">10x Viral Assets</span>
        </h1>

        <p className="text-sm sm:text-base text-neutral-400 max-w-xl mt-6 leading-relaxed">
          Input YouTube links, upload audio files, or paste transcripts. Our pipeline transcribes, extracts high-value quotes, drafts assets, removes AI slop, and renders cover templates automatically.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mt-10 w-full justify-center">
          <HoverBorderGradient
            as="button"
            onClick={() => router.push("/new")}
            containerClassName="w-full sm:w-auto glow-btn transition-all duration-300"
            className="flex items-center justify-center gap-2 font-bold py-3 px-8 text-neutral-100 text-sm"
          >
            Start Repurposing Free
            <ArrowRight className="w-4 h-4 text-violet-400 group-hover:translate-x-1 transition-transform" />
          </HoverBorderGradient>
          
          <a
            href="#features"
            className="text-xs font-semibold text-neutral-400 hover:text-neutral-200 py-3 px-6 rounded-xl border border-neutral-800/80 bg-neutral-900/20 hover:bg-neutral-900/40 transition-colors w-full sm:w-auto"
          >
            How it works
          </a>
        </div>

        {/* Floating Mockup Preview */}
        <div className="w-full max-w-3xl mt-20 relative group">
          <div className="absolute inset-0 bg-gradient-to-t from-violet-500/10 to-transparent blur-2xl pointer-events-none -z-10" />
          <div className="border border-neutral-800/80 rounded-[28px] overflow-hidden bg-neutral-900/20 backdrop-blur-md shadow-2xl p-2 relative">
            <div className="bg-neutral-950 rounded-[22px] border border-neutral-900 p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                </div>
                <div className="text-[10px] text-neutral-500 font-mono select-none">project_results_dashboard.xml</div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 h-24 rounded-xl border border-neutral-800/80 bg-neutral-900/40 p-3 flex flex-col gap-1.5 justify-center">
                  <div className="w-8 h-3 rounded bg-violet-500/20 border border-violet-500/30" />
                  <div className="w-full h-2 rounded bg-neutral-800" />
                  <div className="w-2/3 h-2 rounded bg-neutral-800" />
                </div>
                <div className="col-span-1 h-24 rounded-xl border border-neutral-800/80 bg-neutral-900/40 p-3 flex flex-col justify-center items-center">
                  <Share2 className="w-6 h-6 text-neutral-600" />
                </div>
                <div className="col-span-1 h-20 rounded-xl border border-neutral-800/80 bg-neutral-900/40" />
                <div className="col-span-2 h-20 rounded-xl border border-neutral-800/80 bg-neutral-900/40" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24 border-t border-neutral-900/60 relative z-10 w-full">
        <div className="flex flex-col items-center text-center gap-2 mb-16">
          <span className="text-xs uppercase font-extrabold text-violet-400 tracking-widest">Premium Engine Features</span>
          <h2 className="text-2xl font-extrabold text-neutral-100 sm:text-3xl tracking-tight mt-1">
            Engineered For Quality Outputs
          </h2>
          <p className="text-xs text-neutral-500 max-w-sm">
            We bypass generic templates to generate publication-ready social updates and structured documentation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, idx) => (
            <div 
              key={idx} 
              className="p-6 rounded-2xl bg-neutral-900/20 border border-neutral-900 hover:border-neutral-800 hover:bg-neutral-900/30 transition-all duration-300 flex flex-col gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center shadow-md">
                {feature.icon}
              </div>
              <h4 className="text-sm font-bold text-neutral-200 mt-2">{feature.title}</h4>
              <p className="text-xs text-neutral-500 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-neutral-900/60 py-8 text-center text-[10px] text-neutral-600 relative z-10 mt-auto">
        &copy; {new Date().getFullYear()} AI Atomizer. Built with Next.js 14 & Aceternity UI. All rights reserved.
      </footer>
    </div>
  );
}
