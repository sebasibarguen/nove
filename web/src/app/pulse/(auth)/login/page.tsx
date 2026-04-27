// ABOUTME: Pulse-branded sign-in page.
// ABOUTME: Same Google OAuth flow, but uses return_to so the callback routes back to Pulse.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth";
import { api } from "@/lib/api";

export default function PulseLoginPage() {
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [user, loading, router]);

  async function handleGoogleLogin() {
    setRedirecting(true);
    setError("");
    try {
      const { url } = await api<{ url: string }>(
        "/auth/google/url?return_to=pulse"
      );
      window.location.href = url;
    } catch {
      setError("Couldn't start sign-in with Google. Please try again.");
      setRedirecting(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Pulse</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Recovery, strain, and sleep — from your Garmin.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <button
          onClick={handleGoogleLogin}
          disabled={redirecting}
          className="w-full rounded-lg bg-foreground px-4 py-3 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
        >
          {redirecting ? "Redirecting…" : "Continue with Google"}
        </button>

        {error && (
          <p className="mt-3 text-center text-sm text-rose-400">{error}</p>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing you let Pulse read the Garmin data linked to your Nove account.
        </p>
      </div>
    </div>
  );
}
