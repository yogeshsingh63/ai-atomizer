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
      icon: <Zap className="w-5 h-5 text-neutral-350" />,
      title: "One-Click Multiplier",
      description: "Submit a single YouTube link or video file and instantly produce a blog, a tweet thread, and LinkedIn posts."
    },
    {
      icon: <Share2 className="w-5 h-5 text-neutral-350" />,
      title: "Platform-Specific Optimization",
      description: "Each generated asset reads like it was native-written. No recycled copy-paste formats."
    },
    {
      icon: <Flame className="w-5 h-5 text-neutral-350" />,
      title: "Critic Rewriter Pass",
      description: "An automated secondary review removes standard AI phrases and aligns statements with source transcripts."
    },
    {
      icon: <Cpu className="w-5 h-5 text-neutral-350" />,
      title: "OpenRouter Failbacks",
      description: "Chains zero-price APIs to guarantee maximum rate limits and high availability for active users."
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-neutral-950 text-neutral-100 relative overflow-hidden">
      {/* Grid Pattern */}
      <BackgroundBeams />

      {/* Navigation Bar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10 border-b border-neutral-900 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-neutral-300" />
          </div>
          <span className="font-extrabold text-base tracking-tight text-neutral-200">
            AI Atomizer
          </span>
        </div>
        <Link 
          href="/new" 
          className="text-xs font-semibold text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 border border-neutral-850 px-4 py-2 rounded-lg transition-all duration-200"
        >
          Launch App
        </Link>
      </header>

      {/* Hero Section */}
      <section className="flex flex-col items-center text-center justify-center max-w-4xl mx-auto px-6 pt-24 pb-16 relative z-10 flex-1">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[10px] font-semibold text-neutral-350 mb-6 uppercase tracking-wider">
          <Flame className="w-3.5 h-3.5" />
          Transform video files into structured text assets
        </div>

        <h1 className="text-4xl font-extrabold sm:text-6xl tracking-tight leading-[1.15] text-neutral-100 max-w-3xl">
          Turn One Piece of Long Content into <span className="underline decoration-neutral-600 decoration-wavy underline-offset-8">10x Viral Assets</span>
        </h1>

        <p className="text-xs sm:text-sm text-neutral-400 max-w-xl mt-6 leading-relaxed">
          Input YouTube links, upload files, or paste transcripts. Our pipeline transcribes, extracts key highlights, writes clean platform drafts, and formats summaries automatically.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 mt-10 w-full justify-center">
          <HoverBorderGradient
            as="button"
            onClick={() => router.push("/new")}
            containerClassName="w-full sm:w-auto"
            className="flex items-center justify-center gap-2 font-bold py-3 px-8 text-neutral-950 text-xs"
          >
            Start Repurposing Free
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </HoverBorderGradient>
          
          <a
            href="#features"
            className="text-xs font-semibold text-neutral-400 hover:text-neutral-200 py-3 px-6 rounded-lg border border-neutral-850 bg-neutral-900/30 hover:bg-neutral-900/60 transition-colors w-full sm:w-auto"
          >
            How it works
          </a>
        </div>

        {/* Minimal Mockup Preview */}
        <div className="w-full max-w-3xl mt-20 relative">
          <div className="border border-neutral-850 rounded-2xl overflow-hidden bg-neutral-900/20 backdrop-blur-md shadow-lg p-1.5">
            <div className="bg-neutral-950 rounded-xl border border-neutral-900 p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-neutral-800" />
                  <div className="w-2.5 h-2.5 rounded-full bg-neutral-800" />
                  <div className="w-2.5 h-2.5 rounded-full bg-neutral-800" />
                </div>
                <div className="text-[9px] text-neutral-500 font-mono select-none">results_dashboard.config</div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 h-24 rounded-lg border border-neutral-900 bg-neutral-900/10 p-4 flex flex-col gap-2 justify-center">
                  <div className="w-12 h-3.5 rounded bg-neutral-800" />
                  <div className="w-full h-1.5 rounded bg-neutral-900" />
                  <div className="w-3/4 h-1.5 rounded bg-neutral-900" />
                </div>
                <div className="col-span-1 h-24 rounded-lg border border-neutral-900 bg-neutral-900/10 p-3 flex flex-col justify-center items-center">
                  <Share2 className="w-5 h-5 text-neutral-700" />
                </div>
                <div className="col-span-1 h-16 rounded-lg border border-neutral-900 bg-neutral-900/10" />
                <div className="col-span-2 h-16 rounded-lg border border-neutral-900 bg-neutral-900/10" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20 border-t border-neutral-900 relative z-10 w-full">
        <div className="flex flex-col items-center text-center gap-2 mb-16">
          <span className="text-[10px] uppercase font-extrabold text-neutral-400 tracking-wider">Premium Engine Features</span>
          <h2 className="text-xl font-extrabold text-neutral-100 sm:text-2xl tracking-tight mt-1">
            Engineered For Quality Outputs
          </h2>
          <p className="text-xs text-neutral-500 max-w-sm">
            We bypass generic templates to generate publication-ready social updates and structured documentation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => (
            <div 
              key={idx} 
              className="p-6 rounded-xl bg-neutral-900/10 border border-neutral-900 hover:border-neutral-800 transition-all duration-200 flex flex-col gap-4"
            >
              <div className="w-9 h-9 rounded-lg bg-neutral-950 border border-neutral-900 flex items-center justify-center shadow-sm">
                {feature.icon}
              </div>
              <h4 className="text-xs font-bold text-neutral-200 mt-2">{feature.title}</h4>
              <p className="text-[11px] text-neutral-500 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-neutral-900 py-8 text-center text-[9px] text-neutral-600 relative z-10 mt-auto">
        &copy; {new Date().getFullYear()} AI Atomizer. Built with Next.js 14 & Aceternity UI. All rights reserved.
      </footer>
    </div>
  );
}
