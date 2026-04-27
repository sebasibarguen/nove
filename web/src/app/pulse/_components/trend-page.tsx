// ABOUTME: Shared scaffolding for Pulse trend detail pages.
// ABOUTME: Handles auth guard, API fetch, loading states, and empty-data messaging.

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth";
import { api, ApiError } from "@/lib/api";

export function useTrend<T>(path: string) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<T[] | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api<T[]>(path)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: ApiError) => {
        console.error(`${path} fetch failed`, err);
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, path]);

  return { user, authLoading: loading, data, fetching };
}

export function TrendShell({
  title,
  subtitle,
  fetching,
  hasData,
  children,
}: {
  title: string;
  subtitle: string;
  fetching: boolean;
  hasData: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </section>

      {fetching ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !hasData ? (
        <p className="text-sm text-muted-foreground">
          No recent data. Your metrics will appear here once Garmin sends the next sync.
        </p>
      ) : (
        children
      )}
    </div>
  );
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
