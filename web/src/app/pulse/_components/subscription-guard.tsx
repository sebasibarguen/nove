// ABOUTME: Client component that gates Pulse dashboard pages behind an active subscription.
// ABOUTME: Fetches /pulse/subscription on mount and redirects to /upgrade if not subscribed.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth";
import { api } from "@/lib/api";

interface SubscriptionStatus {
  status: string | null;
  trial_ends_at: string | null;
}

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export default function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (loading || !user) return;

    api<SubscriptionStatus>("/pulse/subscription")
      .then(({ status }) => {
        if (!status || !ACTIVE_STATUSES.has(status)) {
          router.replace("/upgrade");
        } else {
          setChecked(true);
        }
      })
      .catch(() => {
        // Network error — let the page handle it; don't block access.
        setChecked(true);
      });
  }, [user, loading, router]);

  if (loading || !user || !checked) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return <>{children}</>;
}
