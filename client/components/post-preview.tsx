"use client";

import React from "react";
import { 
  Heart, MessageCircle, Repeat2, Bookmark, Share2, 
  ThumbsUp, MessageSquare, Send, Globe, ExternalLink, Play,
  BarChart2, MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PreviewProps {
  content: string;
  title?: string;
  authorName?: string;
  authorHandle?: string;
  avatarUrl?: string;
  coverUrl?: string;
  actions?: React.ReactNode;
}

// On-brand SVG avatar (initials on a brand-gradient circle) as a data URI.
// Zero network dependency — never breaks if Unsplash/CDN is down.
const BRAND_AVATAR_DATA_URI =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(215 30% 14%)"/><stop offset="1" stop-color="hsl(215 85% 58%)"/></linearGradient></defs><rect width="100" height="100" rx="50" fill="url(#g)"/><text x="50" y="50" font-family="sans-serif" font-size="44" font-weight="bold" fill="#e6edf5" text-anchor="middle" dominant-baseline="central">P</text></svg>`
  );

const handleAvatarError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  (e.target as HTMLImageElement).src = BRAND_AVATAR_DATA_URI;
};

// Inline content formatter for rich posts (bolds, hashtags, mentions)
const formatPostText = (text: string, platform: "twitter" | "linkedin") => {
  const linkColor = platform === "twitter" ? "text-[#1d9bf0] hover:underline" : "text-brand hover:underline font-semibold";
  const lines = text.split("\n");
  
  return lines.map((line, lineIdx) => {
    // Split by markdown bold (**text**), hashtags (#tags), and mentions (@users)
    const parts = line.split(/(\*\*[^*]+\*\*|#[a-zA-Z0-9_-]+|@[a-zA-Z0-9_-]+)/g);
    
    return (
      <p key={lineIdx} className="min-h-[1.25rem] mb-1">
        {parts.map((part, partIdx) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <strong key={partIdx} className="font-extrabold text-neutral-100">
                {part.slice(2, -2)}
              </strong>
            );
          }
          if (part.startsWith("#")) {
            return (
              <span key={partIdx} className={cn(linkColor, "cursor-pointer font-medium")}>
                {part}
              </span>
            );
          }
          if (part.startsWith("@")) {
            return (
              <span key={partIdx} className={cn(linkColor, "cursor-pointer font-medium")}>
                {part}
              </span>
            );
          }
          return <span key={partIdx}>{part}</span>;
        })}
      </p>
    );
  });
};

// 1. Twitter/X Card Preview
export const TwitterPreview = ({ 
  content, 
  authorName = "Yogesh", 
  authorHandle = "yogesh_rajawat", 
  avatarUrl = BRAND_AVATAR_DATA_URI,
  actions
}: PreviewProps) => {
  
  // Parse thread: split by tweets (1/, 2/, etc. or standard tweet numbering)
  const parseTweets = (text: string): string[] => {
    const regex = /\b\d+[\/\.]\s*/g;
    const parts = text.split(regex).map(p => p.trim()).filter(Boolean);
    
    if (parts.length > 1) {
      return parts;
    }
    
    // Fallback split on double newlines
    return text.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
  };

  const tweets = parseTweets(content);

  return (
    <div className="flex flex-col w-full max-w-lg mx-auto bg-[#000000] border border-neutral-900 rounded-2xl overflow-hidden font-sans text-[15px] text-[#e7e9ea] text-left">
      <div className="px-4 py-3 border-b border-neutral-900 bg-[#0c1017]/10 flex items-center justify-between">
        <h4 className="text-[11px] font-bold text-neutral-400 tracking-widest uppercase">Post Preview • X / Twitter</h4>
        <div className="flex items-center gap-2">
          {actions}
          <div className="w-2 h-2 rounded-full bg-[#1d9bf0]" />
        </div>
      </div>
      
      <div className="flex flex-col p-4">
        {tweets.map((tweetText, idx) => {
          const lineTop = idx === 0 ? "top-10" : "top-[56px]";
          return (
            <div key={idx} className="flex gap-3 relative pt-4 pb-5 group last:pb-2 first:pt-0">
              {/* Thread Connector Line (Top part) */}
              {idx > 0 && (
                <div className="absolute left-[19px] top-0 h-4 w-[2px] bg-[#2f3336]" />
              )}
              {/* Thread Connector Line (Bottom part) */}
              {idx < tweets.length - 1 && (
                <div className={cn("absolute left-[19px] bottom-0 w-[2px] bg-[#2f3336]", lineTop)} />
              )}

              {/* Profile Avatar */}
              <img 
                src={avatarUrl} 
                alt={authorName} 
                className="w-10 h-10 rounded-full object-cover border border-[#2f3336] z-10 shrink-0"
                onError={handleAvatarError}
              />

              {/* Tweet Content */}
              <div className="flex flex-col min-w-0 flex-1">
              {/* Header */}
              <div className="flex items-center justify-between text-[15px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-bold text-[#e7e9ea] hover:underline cursor-pointer truncate">{authorName}</span>
                  <span className="text-[#71767b] truncate">@{authorHandle}</span>
                  <span className="text-[#71767b] font-medium">•</span>
                  <span className="text-[#71767b] hover:underline cursor-pointer shrink-0">{idx + 1}h</span>
                </div>
                <button className="text-[#71767b] hover:text-[#1d9bf0] transition-colors p-1 rounded-full hover:bg-[#1d9bf0]/10 cursor-pointer">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              {/* Text Body */}
              <div className="text-[#e7e9ea] leading-normal mt-1 whitespace-pre-wrap">
                {formatPostText(tweetText, "twitter")}
              </div>

              {/* Action Bar — deterministic engagement seeded by tweet index */}
              <div className="flex items-center justify-between text-[#71767b] max-w-md mt-4 pr-1 sm:pr-4 gap-0.5 sm:gap-1.5">
                <button className="flex items-center gap-0.5 sm:gap-1.5 hover:text-[#1d9bf0] transition-colors group/btn cursor-pointer">
                  <span className="p-1 sm:p-2 rounded-full group-hover/btn:bg-[#1d9bf0]/10">
                    <MessageCircle className="w-[14px] h-[14px] sm:w-[17px] sm:h-[17px]" />
                  </span>
                  <span className="text-[10px] sm:text-[11.5px] font-medium">{(idx * 7 + 3) % 15 + 3}</span>
                </button>
                
                <button className="flex items-center gap-0.5 sm:gap-1.5 hover:text-[#00ba7c] transition-colors group/btn cursor-pointer">
                  <span className="p-1 sm:p-2 rounded-full group-hover/btn:bg-[#00ba7c]/10">
                    <Repeat2 className="w-[14px] h-[14px] sm:w-[17px] sm:h-[17px]" />
                  </span>
                  <span className="text-[10px] sm:text-[11.5px] font-medium">{(idx * 5 + 1) % 10 + 1}</span>
                </button>
                
                <button className="flex items-center gap-0.5 sm:gap-1.5 hover:text-[#f91880] transition-colors group/btn cursor-pointer">
                  <span className="p-1 sm:p-2 rounded-full group-hover/btn:bg-[#f91880]/10">
                    <Heart className="w-[14px] h-[14px] sm:w-[17px] sm:h-[17px]" />
                  </span>
                  <span className="text-[10px] sm:text-[11.5px] font-medium">{(idx * 13 + 12) % 80 + 12}</span>
                </button>
                
                <button className="hidden sm:flex items-center gap-0.5 sm:gap-1.5 hover:text-[#1d9bf0] transition-colors group/btn cursor-pointer">
                  <span className="p-1 sm:p-2 rounded-full group-hover/btn:bg-[#1d9bf0]/10">
                    <BarChart2 className="w-[14px] h-[14px] sm:w-[17px] sm:h-[17px]" />
                  </span>
                  <span className="text-[10px] sm:text-[11.5px] font-medium">{(idx * 3 + 1) % 5 + 1}.{(idx * 7) % 9}K</span>
                </button>

                <button className="hidden sm:flex hover:text-[#1d9bf0] transition-colors group/btn cursor-pointer">
                  <span className="p-1 sm:p-2 rounded-full group-hover/btn:bg-[#1d9bf0]/10">
                    <Bookmark className="w-[14px] h-[14px] sm:w-[17px] sm:h-[17px]" />
                  </span>
                </button>

                <button className="hover:text-[#1d9bf0] transition-colors group/btn cursor-pointer">
                  <span className="p-1 sm:p-2 rounded-full group-hover/btn:bg-[#1d9bf0]/10">
                    <Share2 className="w-[14px] h-[14px] sm:w-[17px] sm:h-[17px]" />
                  </span>
                </button>
              </div>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
};

// 2. LinkedIn Post Preview
export const LinkedInPreview = ({ 
  content, 
  authorName = "Yogesh", 
  authorHandle = "AI Content Strategist", 
  avatarUrl = BRAND_AVATAR_DATA_URI,
  actions
}: PreviewProps) => {
  return (
    <div className="flex flex-col w-full max-w-lg mx-auto bg-[#18181b] border border-neutral-900 rounded-2xl overflow-hidden font-sans text-[14px] text-neutral-300 shadow-md text-left">
      <div className="px-4 py-3 border-b border-neutral-900 bg-[#0c1017]/10 flex items-center justify-between">
        <h4 className="text-[11px] font-bold text-neutral-400 tracking-widest uppercase">Post Preview • LinkedIn</h4>
        <div className="flex items-center gap-2">
          {actions}
          <div className="w-2.5 h-2.5 rounded bg-[#0a66c2]" />
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <img 
            src={avatarUrl} 
            alt={authorName} 
            className="w-12 h-12 rounded-full object-cover border border-neutral-800"
            onError={handleAvatarError}
          />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="font-bold text-neutral-100 hover:text-brand hover:underline cursor-pointer text-[14.5px] truncate">{authorName}</span>
              <span className="text-[11px] text-neutral-500 font-semibold shrink-0">• 1st</span>
            </div>
            <span className="text-neutral-400 text-xs truncate leading-normal">{authorHandle}</span>
            <span className="text-neutral-500 text-[10px] flex items-center gap-1 mt-0.5 shrink-0">
              2h • <Globe className="w-3.5 h-3.5" />
            </span>
          </div>
          <button className="ml-auto text-brand hover:text-brand/80 text-[11px] sm:text-[12px] font-bold py-1 sm:py-1.5 px-2.5 sm:px-3.5 rounded-full hover:bg-brand-muted border border-brand-border/40 transition-colors cursor-pointer shrink-0">
            + Follow
          </button>
        </div>

        {/* Body Text */}
        <div className="text-neutral-200 leading-relaxed whitespace-pre-wrap text-[13.5px]">
          {formatPostText(content, "linkedin")}
        </div>
      </div>

      {/* Action Bar */}
      <div className="border-t border-neutral-900 p-1 bg-[#121214] flex items-center justify-around text-neutral-400 text-[10px] sm:text-xs font-bold">
        <button className="flex items-center gap-1.5 py-2 px-1 sm:py-3 sm:px-3 hover:bg-neutral-800/60 rounded-lg transition-colors cursor-pointer flex-1 justify-center">
          <ThumbsUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-400" />
          <span className="hidden sm:inline">Like</span>
        </button>
        <button className="flex items-center gap-1.5 py-2 px-1 sm:py-3 sm:px-3 hover:bg-neutral-800/60 rounded-lg transition-colors cursor-pointer flex-1 justify-center">
          <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-400" />
          <span className="hidden sm:inline">Comment</span>
        </button>
        <button className="flex items-center gap-1.5 py-2 px-1 sm:py-3 sm:px-3 hover:bg-neutral-800/60 rounded-lg transition-colors cursor-pointer flex-1 justify-center">
          <Repeat2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-400" />
          <span className="hidden sm:inline">Repost</span>
        </button>
        <button className="flex items-center gap-1.5 py-2 px-1 sm:py-3 sm:px-3 hover:bg-neutral-800/60 rounded-lg transition-colors cursor-pointer flex-1 justify-center">
          <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-400" />
          <span className="hidden sm:inline">Send</span>
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
  coverUrl = "/prism_repurpose_thumbnail.png",
  actions
}: PreviewProps) => {
  
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
          <blockquote key={idx} className="border-l-2 border-brand pl-4 py-1.5 my-3 italic text-neutral-400 text-xs">
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
    <div className="flex flex-col w-full max-w-2xl mx-auto bg-neutral-950 border border-neutral-900 rounded-2xl overflow-hidden shadow-lg text-left">
      <div className="px-4 py-3 border-b border-neutral-900 bg-neutral-900/10 flex items-center justify-between">
        <h4 className="text-[11px] font-bold text-neutral-400 tracking-widest uppercase">Post Preview • Blog Article</h4>
        <div className="flex items-center gap-2">
          {actions}
          <div className="w-2.5 h-2.5 rounded bg-brand" />
        </div>
      </div>

      {coverUrl && (
        <div className="aspect-video w-full overflow-hidden border-b border-neutral-900 relative">
          <img 
            src={coverUrl} 
            alt={title} 
            className="absolute inset-0 w-full h-full object-cover"
            onError={handleAvatarError}
          />
        </div>
      )}

      <div className="p-6 md:p-8 flex flex-col font-serif">
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[10px] text-neutral-500 border-b border-neutral-900 pb-4 mb-4 font-sans">
          <span className="font-semibold text-neutral-400">{authorName}</span>
          <span>•</span>
          <span>5 min read</span>
          <span>•</span>
          <span>Published in Tech Blog</span>
        </div>

        <div className="font-sans">
          {formatMarkdown(content)}
        </div>
      </div>
    </div>
  );
};
