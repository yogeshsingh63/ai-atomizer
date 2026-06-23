"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { FolderGit2, LogOut, ChevronDown, PlusCircle, Sparkles } from "lucide-react";
import { getCurrentUser, logout } from "@/lib/api";

interface ProfileUser {
  id: number;
  name: string;
  email?: string | null;
  avatar_url?: string | null;
  is_guest: boolean;
}

export const ProfileDropdown = () => {
  const router = useRouter();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load user data on mount if token exists
  useEffect(() => {
    async function fetchUser() {
      const token = typeof window !== "undefined" ? localStorage.getItem("prism_token") : null;
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const profile = await getCurrentUser();
        setUser(profile);
      } catch (err) {
        console.error("Failed to load user profile:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();

    // Listen to storage changes to keep state in sync
    const handleStorageChange = () => {
      fetchUser();
    };
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Handle outside click to close dropdown
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = () => {
    logout();
    setUser(null);
    setIsOpen(false);
    // Trigger storage event for other listening tabs/components
    window.dispatchEvent(new Event("storage"));
    router.push("/new");
  };

  if (loading) {
    return (
      <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 animate-pulse flex items-center justify-center">
        <div className="w-3.5 h-3.5 rounded-full border-t border-neutral-500 animate-spin" />
      </div>
    );
  }

  // If no user is logged in, show Launch Engine button
  if (!user) {
    return (
      <button
        onClick={() => router.push("/new")}
        className="text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 px-4 py-2 rounded-lg transition-all duration-200 active:scale-95"
      >
        Launch Engine
      </button>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 pr-2 rounded-xl bg-neutral-950 hover:bg-neutral-900 border border-neutral-900 focus:outline-none focus:ring-1 focus:ring-brand/30 transition-all select-none cursor-pointer active:scale-95"
      >
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.name}
            className="w-7 h-7 rounded-lg object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-muted to-brand/40 border border-brand-border flex items-center justify-center text-xs font-bold text-brand">
            {user.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <span className="hidden sm:inline text-xs font-bold text-neutral-300 truncate max-w-[80px]">
          {user.name}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-60 rounded-2xl border border-neutral-900 bg-neutral-950/95 backdrop-blur-md p-2 shadow-2xl z-50 animate-fade-in-up">
          {/* User info panel */}
          <div className="p-3 pb-2 flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-neutral-200 truncate">{user.name}</span>
              {user.is_guest ? (
                <span className="text-[9px] font-bold text-orange-400 border border-orange-950/50 bg-orange-950/20 px-1.5 py-0.5 rounded-md">
                  Guest
                </span>
              ) : (
                <span className="text-[9px] font-bold text-brand border border-brand-border/40 bg-brand-muted/20 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5" /> Google User
                </span>
              )}
            </div>
            {user.email && (
              <span className="text-[10px] text-neutral-500 truncate">{user.email}</span>
            )}
          </div>

          <div className="h-px bg-neutral-900 my-1.5" />

          {/* Actions */}
          <div className="flex flex-col gap-0.5">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push("/dashboard");
              }}
              className="flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900/60 transition-colors cursor-pointer"
            >
              <FolderGit2 className="w-4 h-4 text-neutral-500" />
              My Projects
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                router.push("/new");
              }}
              className="flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900/60 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-neutral-500" />
              New Project
            </button>
          </div>

          <div className="h-px bg-neutral-900 my-1.5" />

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-red-400/80" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};
