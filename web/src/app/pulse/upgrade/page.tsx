// ABOUTME: Pulse upgrade/paywall page shown to users without an active subscription.
// ABOUTME: Initiates a Stripe Checkout session for the $9.99/mo Pulse plan.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth";
import { api, ApiError } from "@/lib/api";

export default function UpgradePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  async function handleStart() {
    setStarting(true);
    setError(null);
    try {
      const { url } = await api<{ url: string }>("/billing/checkout", { method: "POST" });
      window.location.href = url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setStarting(false);
    }
  }

  if (loading || !user) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-md space-y-10 px-6 py-16 text-center">
      <div className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight">Pulse</h1>
        <p className="text-muted-foreground">
          Whoop-style recovery, strain, and sleep — built on the Garmin you already wear.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-8 text-left space-y-4">
        <div className="space-y-2">
          {[
            "Daily recovery score from HRV, sleep, and resting HR",
            "14-day strain and sleep trends",
            "Journal to track habits that affect recovery",
            "Works with every modern Garmin watch",
          ].map((feature) => (
            <div key={feature} className="flex items-start gap-3 text-sm">
              <span className="mt-0.5 text-emerald-400">✓</span>
              <span>{feature}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-2xl font-semibold">
            $9.99<span className="text-base font-normal text-muted-foreground">/mo</span>
          </p>
          <p className="text-sm text-muted-foreground">7-day free trial — cancel anytime</p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      <button
        onClick={handleStart}
        disabled={starting}
        className="w-full rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-50"
      >
        {starting ? "Redirecting…" : "Start 7-day free trial"}
      </button>

      <p className="text-xs text-muted-foreground">
        No charge during the trial. $9.99/mo after. Cancel anytime from your billing portal.
      </p>
    </div>
  );
}
