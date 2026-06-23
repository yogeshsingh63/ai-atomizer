"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  FolderGit2, PlusCircle, Search, Sparkles, AlertCircle, 
  Clock, CheckCircle2, XCircle, ArrowRight, Youtube, Upload, FileText
} from "lucide-react";
import { getUserProjects, Project } from "@/lib/api";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { PrismLogo } from "@/components/ui/prism-logo";
import { BackgroundBeams } from "@/components/ui/background-beams";

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    // Check if token exists
    const token = typeof window !== "undefined" ? localStorage.getItem("prism_token") : null;
    if (!token) {
      router.replace("/new");
      return;
    }

    async function loadProjects() {
      try {
        const data = await getUserProjects();
        setProjects(data);
      } catch (err) {
        console.error("Failed to load user projects:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, [router]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateStr;
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case "youtube_url":
        return <Youtube className="w-3.5 h-3.5 text-red-500" />;
      case "upload":
        return <Upload className="w-3.5 h-3.5 text-blue-400" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-brand" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "done":
        return (
          <span className="text-[10px] font-bold text-emerald-400 border border-emerald-950/40 bg-emerald-950/20 px-2 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /> Done
          </span>
        );
      case "failed":
        return (
          <span className="text-[10px] font-bold text-rose-400 border border-rose-950/40 bg-rose-950/20 px-2 py-0.5 rounded-full flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-500 shrink-0" /> Failed
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold text-brand border border-brand-border/40 bg-brand-muted/20 px-2 py-0.5 rounded-full flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-brand animate-ping shrink-0" />
            Processing
          </span>
        );
    }
  };

  // Filtering & searching projects
  const filteredProjects = projects.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.source_ref.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === "all" || p.source_type === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex flex-col min-h-screen bg-neutral-950 relative overflow-hidden">
      <BackgroundBeams />

      {/* Header Bar */}
      <header className="relative z-10 border-b border-neutral-900/80 bg-neutral-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
            <PrismLogo size={24} />
            <span className="font-extrabold text-sm tracking-tight text-neutral-200">
              Prism <span className="text-brand">AI</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/new")}
              className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-neutral-950 bg-neutral-100 hover:bg-white px-3.5 py-1.5 rounded-xl transition-all cursor-pointer active:scale-95 duration-150"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              New Project
            </button>
            <ProfileDropdown />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-900 pb-6">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full brand-badge text-[9px] font-bold uppercase tracking-wider w-fit">
              <FolderGit2 className="w-3 h-3 text-brand" />
              Workspace Archive
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-100">
              My Projects
            </h1>
            <p className="text-xs text-neutral-500">
              Revisit and manage all your repurposed social media media assets.
            </p>
          </div>

          <button
            onClick={() => router.push("/new")}
            className="sm:hidden w-full flex items-center justify-center gap-1.5 text-xs font-bold text-neutral-950 bg-neutral-100 hover:bg-white px-4 py-2.5 rounded-xl transition-all cursor-pointer active:scale-95 duration-150"
          >
            <PlusCircle className="w-4 h-4" />
            New Project
          </button>
        </div>

        {/* Search and Filters Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-neutral-900/40 border border-neutral-850 p-4 rounded-2xl">
          <div className="w-full sm:max-w-md relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Search projects by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-900 focus:border-brand-border focus:ring-1 focus:ring-brand/30 rounded-xl pl-10 pr-4 py-2.5 text-xs text-neutral-200 outline-none transition-all duration-200"
            />
          </div>

          {/* Filter options */}
          <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            {[
              { label: "All Types", value: "all" },
              { label: "YouTube Link", value: "youtube_url" },
              { label: "Files Upload", value: "upload" },
              { label: "Articles", value: "article_text" }
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setFilterType(filter.value)}
                className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all shrink-0 border border-transparent ${
                  filterType === filter.value
                    ? "bg-brand-muted border-brand-border/40 text-brand"
                    : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Projects Listing */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-12">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 rounded-2xl bg-neutral-900/40 border border-neutral-850 p-5 flex flex-col gap-4 animate-pulse">
                <div className="w-1/3 h-3 bg-neutral-800 rounded" />
                <div className="w-3/4 h-5 bg-neutral-800 rounded" />
                <div className="w-full h-3 bg-neutral-800 rounded mt-auto" />
              </div>
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-12 sm:p-20 bg-neutral-900/20 border border-neutral-900/60 rounded-2xl gap-4">
            <div className="w-12 h-12 rounded-full bg-neutral-950 border border-neutral-900 flex items-center justify-center text-neutral-600">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <div className="flex flex-col gap-1 max-w-sm">
              <h3 className="text-sm font-bold text-neutral-300">No Projects Found</h3>
              <p className="text-xs text-neutral-500">
                {searchQuery || filterType !== "all" 
                  ? "No projects match your search query or filter selection." 
                  : "You haven't repurposed any content yet. Start your first project now."}
              </p>
            </div>
            <button
              onClick={() => router.push("/new")}
              className="text-xs font-bold text-neutral-950 bg-neutral-100 hover:bg-white px-5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 duration-150 mt-2"
            >
              Create New Project
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((p) => (
              <div 
                key={p.id}
                onClick={() => router.push(`/project/${p.id}`)}
                className="group relative bg-neutral-900/30 hover:bg-neutral-900/60 border border-neutral-900 hover:border-brand-border/40 p-5 rounded-2xl flex flex-col justify-between gap-5 transition-all duration-300 shadow-lg cursor-pointer hover:-translate-y-0.5 active:scale-[0.99]"
              >
                <div className="absolute -inset-px bg-gradient-to-r from-brand-border/5 to-brand/5 rounded-2xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex flex-col gap-2 min-w-0">
                  <div className="flex items-center justify-between gap-2 border-b border-neutral-900 pb-3">
                    <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-bold uppercase tracking-wider shrink-0 bg-[#0c0c0f] px-2.5 py-1 rounded-lg border border-neutral-900">
                      {getSourceIcon(p.source_type)}
                      <span className="truncate max-w-[80px]">
                        {p.source_type.replace("_url", "").replace("_text", "")}
                      </span>
                    </div>
                    {getStatusBadge(p.status)}
                  </div>

                  <h3 className="text-sm font-bold text-neutral-200 truncate group-hover:text-brand transition-colors mt-2" title={p.title}>
                    {p.title}
                  </h3>
                  <span className="text-[10px] font-mono text-neutral-500 truncate block mt-0.5" title={p.source_ref}>
                    Ref: {p.source_ref}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-neutral-900 pt-3 text-[10px] text-neutral-500 mt-2">
                  <span>Created {formatDate(p.created_at)}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-neutral-600 group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
