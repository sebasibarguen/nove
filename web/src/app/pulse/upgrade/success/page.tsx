// ABOUTME: Post-checkout success page shown after a successful Stripe checkout.
// ABOUTME: Instructs the user their trial has started and links to the dashboard.

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth";

export default function UpgradeSuccessPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  // Auto-redirect to dashboard after a short delay to give the webhook time
  // to process and update the subscription status.
  useEffect(() => {
    if (countdown <= 0) {
      router.replace("/");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, router]);

  if (loading || !user) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-md space-y-8 px-6 py-16 text-center">
      <div className="space-y-3">
        <div className="text-5xl">🎉</div>
        <h1 className="text-3xl font-semibold tracking-tight">You&apos;re in</h1>
        <p className="text-muted-foreground">
          Your 7-day free trial has started. Connect your Garmin and your recovery data will start
          appearing within a few minutes.
        </p>
      </div>

      <Link
        href="/"
        className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400"
      >
        Go to dashboard
      </Link>

      <p className="text-xs text-muted-foreground">
        Redirecting in {countdown}s…
      </p>
    </div>
  );
}
