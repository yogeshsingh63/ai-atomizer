"use client";

import React from "react";
import { 
  Heart, MessageCircle, Repeat2, Bookmark, Share2, 
  ThumbsUp, MessageSquare, Send, Globe, ExternalLink, Play 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PreviewProps {
  content: string;
  title?: string;
  authorName?: string;
  authorHandle?: string;
  avatarUrl?: string;
  coverUrl?: string;
}

// 1. Twitter Thread Preview
export const TwitterPreview = ({ 
  content, 
  authorName = "Yogesh", 
  authorHandle = "yogesh_rajawat", 
  avatarUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&auto=format&fit=crop" 
}: PreviewProps) => {
  // Parse thread: split by tweets (1/, 2/, etc. or standard tweet numbering)
  const parseTweets = (text: string): string[] => {
    // Attempt to split by tweet numbers e.g. "1/", "2/", or "1."
    const regex = /\b\d+[\/\.]\s*/g;
    const parts = text.split(regex).map(p => p.trim()).filter(Boolean);
    
    if (parts.length > 1) {
      return parts;
    }
    
    // Fallback: split by double newlines or block paragraphs if numbers aren't found
    return text.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
  };

  const tweets = parseTweets(content);

  return (
    <div className="flex flex-col w-full max-w-lg mx-auto bg-[#000000] border border-neutral-800 rounded-2xl overflow-hidden font-sans text-[14px]">
      <div className="p-4 border-b border-neutral-800 bg-neutral-900/10">
        <h4 className="text-xs font-bold text-neutral-400 tracking-wider uppercase">Twitter/X Thread Preview</h4>
      </div>
      
      <div className="flex flex-col p-4">
        {tweets.map((tweetText, idx) => (
          <div key={idx} className="flex gap-3 relative pb-6 group last:pb-0">
            {/* Thread Connector Line */}
            {idx < tweets.length - 1 && (
              <div className="absolute left-[19px] top-10 bottom-0 w-[2px] bg-neutral-800" />
            )}

            {/* Profile Avatar */}
            <img 
              src={avatarUrl} 
              alt={authorName} 
              className="w-10 h-10 rounded-full object-cover shrink-0 border border-neutral-800"
            />

            {/* Tweet Content */}
            <div className="flex flex-col min-w-0 flex-1">
              {/* Header */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-neutral-200 text-sm hover:underline cursor-pointer">{authorName}</span>
                <span className="text-neutral-500 text-xs">@{authorHandle}</span>
                <span className="text-neutral-600 text-xs">•</span>
                <span className="text-neutral-500 text-xs">{idx + 1}t</span>
              </div>

              {/* Text */}
              <div className="text-neutral-300 text-[13.5px] leading-relaxed mt-1 whitespace-pre-wrap">
                {tweetText}
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between text-neutral-500 max-w-xs mt-3 pt-1">
                <button className="flex items-center gap-1.5 hover:text-sky-400 transition-colors cursor-pointer">
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-[11px]">{Math.floor(Math.random() * 20) + 3}</span>
                </button>
                <button className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors cursor-pointer">
                  <Repeat2 className="w-4 h-4" />
                  <span className="text-[11px]">{Math.floor(Math.random() * 15) + 1}</span>
                </button>
                <button className="flex items-center gap-1.5 hover:text-rose-400 transition-colors cursor-pointer">
                  <Heart className="w-4 h-4" />
                  <span className="text-[11px]">{Math.floor(Math.random() * 100) + 20}</span>
                </button>
                <button className="flex items-center gap-1.5 hover:text-sky-400 transition-colors cursor-pointer">
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 2. LinkedIn Post Preview
export const LinkedInPreview = ({ 
  content, 
  authorName = "Yogesh", 
  authorHandle = "AI Content Strategist", 
  avatarUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&auto=format&fit=crop" 
}: PreviewProps) => {
  return (
    <div className="flex flex-col w-full max-w-lg mx-auto bg-[#18181b] border border-[#27272a] rounded-2xl overflow-hidden font-sans text-[13.5px] shadow-md">
      <div className="p-4 border-b border-[#27272a] bg-[#0c1017]/10">
        <h4 className="text-xs font-bold text-neutral-400 tracking-wider uppercase">LinkedIn Post Preview</h4>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center gap-3">
          <img 
            src={avatarUrl} 
            alt={authorName} 
            className="w-12 h-12 rounded-full object-cover shrink-0 border border-neutral-800"
          />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-bold text-neutral-200 hover:text-sky-400 hover:underline cursor-pointer">{authorName}</span>
              <span className="text-[10px] text-neutral-500 font-semibold">• 1st</span>
            </div>
            <span className="text-neutral-400 text-[11px] truncate">{authorHandle}</span>
            <span className="text-neutral-500 text-[10px] flex items-center gap-1 mt-0.5">
              2h • <Globe className="w-3 h-3" />
            </span>
          </div>
          <button className="ml-auto text-sky-400 hover:text-sky-300 text-xs font-bold py-1 px-3 rounded hover:bg-sky-400/5 transition-colors cursor-pointer">
            + Follow
          </button>
        </div>

        {/* Body Text */}
        <div className="text-neutral-300 leading-relaxed whitespace-pre-wrap mt-2">
          {content}
        </div>
      </div>

      {/* Action Bar */}
      <div className="border-t border-[#27272a] p-1 bg-[#121214] flex items-center justify-around text-neutral-400 text-xs font-semibold">
        <button className="flex items-center gap-2 py-3 px-3 hover:bg-neutral-800/60 rounded-lg transition-colors cursor-pointer flex-1 justify-center">
          <ThumbsUp className="w-4 h-4" />
          Like
        </button>
        <button className="flex items-center gap-2 py-3 px-3 hover:bg-neutral-800/60 rounded-lg transition-colors cursor-pointer flex-1 justify-center">
          <MessageSquare className="w-4 h-4" />
          Comment
        </button>
        <button className="flex items-center gap-2 py-3 px-3 hover:bg-neutral-800/60 rounded-lg transition-colors cursor-pointer flex-1 justify-center">
          <Send className="w-4 h-4" />
          Send
        </button>
      </div>
    </div>
  );
};

// 3. Blog Preview
export const BlogPreview = ({ 
  content, 
  title = "Untitled Article",
  authorName = "Yogesh", 
  coverUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop" 
}: PreviewProps) => {
  // Parse H1/H2 headings if they exist to render nice formatted layouts
  const formatMarkdown = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("# ")) {
        return (
          <h1 key={idx} className="text-xl sm:text-2xl font-black text-neutral-100 mt-6 mb-3 tracking-tight border-b border-neutral-900 pb-2">
            {trimmed.slice(2)}
          </h1>
        );
      }
      if (trimmed.startsWith("## ")) {
        return (
          <h2 key={idx} className="text-base sm:text-lg font-extrabold text-neutral-200 mt-5 mb-2">
            {trimmed.slice(3)}
          </h2>
        );
      }
      if (trimmed.startsWith("> ")) {
        return (
          <blockquote key={idx} className="border-l-2 border-sky-400 pl-4 py-1.5 my-3 italic text-neutral-400 text-xs">
            {trimmed.slice(2)}
          </blockquote>
        );
      }
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        return (
          <li key={idx} className="list-disc list-inside text-neutral-300 text-xs leading-relaxed ml-2 my-1">
            {trimmed.slice(2)}
          </li>
        );
      }
      if (trimmed === "") {
        return <div key={idx} className="h-3" />;
      }
      return (
        <p key={idx} className="text-neutral-300 text-xs leading-relaxed mb-3">
          {line}
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto bg-neutral-950 border border-neutral-850 rounded-2xl overflow-hidden shadow-lg">
      <div className="p-4 border-b border-neutral-850 bg-neutral-900/10">
        <h4 className="text-xs font-bold text-neutral-400 tracking-wider uppercase">Blog Post Preview</h4>
      </div>

      {/* Cover Image */}
      {coverUrl && (
        <div className="aspect-video w-full overflow-hidden border-b border-neutral-900 relative">
          <img 
            src={coverUrl} 
            alt={title} 
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Blog content */}
      <div className="p-6 md:p-8 flex flex-col font-serif">
        {/* Metadata */}
        <div className="flex items-center gap-3 text-[10px] text-neutral-500 border-b border-neutral-900 pb-4 mb-4 font-sans">
          <span className="font-semibold text-neutral-400">{authorName}</span>
          <span>•</span>
          <span>5 min read</span>
          <span>•</span>
          <span>Published in Tech Blog</span>
        </div>

        {/* Content body formatted */}
        <div className="font-sans">
          {formatMarkdown(content)}
        </div>
      </div>
    </div>
  );
};
