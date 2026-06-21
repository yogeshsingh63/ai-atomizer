"use client";

import puter from "@heyputer/puter.js";
import { useState, useEffect, useCallback } from "react";

// --- Types matching the backend User model ---
export interface PuterUser {
  uuid: string;
  username: string;
  email_confirmed?: boolean;
}

export function usePuterAuth() {
  const [user, setUser] = useState<PuterUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if already signed in
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (puter.auth.isSignedIn()) {
        puter.auth.getUser().then((u: any) => {
          setUser({ uuid: u.uuid, username: u.username, email_confirmed: u.email_confirmed });
          setLoading(false);
        }).catch(() => setLoading(false));
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }, []);

  const signIn = useCallback(async () => {
    setError(null);
    try {
      await puter.auth.signIn();
      const u: any = await puter.auth.getUser();
      setUser({ uuid: u.uuid, username: u.username, email_confirmed: u.email_confirmed });
      return true;
    } catch (e: any) {
      setError(e?.message || "Sign-in failed");
      return false;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      puter.auth.signOut();
      setUser(null);
    } catch (e: any) {
      setError(e?.message || "Sign-out failed");
    }
  }, []);

  return { user, loading, error, signIn, signOut };
}
