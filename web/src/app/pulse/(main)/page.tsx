// ABOUTME: Pulse daily overview — Whoop-style three-metric home.
// ABOUTME: Recovery, strain, and sleep from the latest Garmin sync.

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth";
import { api, ApiError } from "@/lib/api";

interface PulseMetric {
  value: number | null;
  unit: string;
  source: string;
  as_of: string | null;
}

interface RecoveryDetail {
  value: number | null;
  confidence: "high" | "medium" | "low" | "none";
  components: Record<string, number>;
  as_of: string | null;
}

interface PulseToday {
  connected: boolean;
  recovery: PulseMetric;
  recovery_detail: RecoveryDetail | null;
  strain: PulseMetric;
  sleep: PulseMetric;
}

function formatValue(metric: PulseMetric): string {
  if (metric.value === null) return "—";
  if (metric.unit === "s") {
    const hours = metric.value / 3600;
    return hours.toFixed(1);
  }
  if (Number.isInteger(metric.value)) return metric.value.toLocaleString();
  return metric.value.toFixed(1);
}

function displayUnit(metric: PulseMetric): string {
  if (metric.unit === "s") return "h";
  return metric.unit;
}

export default function PulseHome() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<PulseToday | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api<PulseToday>("/pulse/today")
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: ApiError) => {
        console.error("pulse today fetch failed", err);
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading || !user) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (data && !data.connected) {
    return (
      <div className="space-y-6">
        <section>
          <h1 className="text-3xl font-semibold tracking-tight">Connect your Garmin</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pulse needs access to your Garmin data to show recovery, strain, and sleep.
          </p>
        </section>
        <Link
          href="/garmin"
          className="inline-flex items-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-muted"
        >
          Connect Garmin
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Today</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {fetching ? "Syncing…" : "Your day at a glance, from your Garmin."}
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard
          label="Recovery"
          metric={data?.recovery}
          accent="text-emerald-400"
        />
        <MetricCard
          label="Strain"
          metric={data?.strain}
          accent="text-sky-400"
        />
        <MetricCard
          label="Sleep"
          metric={data?.sleep}
          accent="text-violet-400"
        />
      </section>

      <p className="text-xs text-muted-foreground">
        Data provided by{" "}
        <a
          href="https://www.garmin.com/en-US/health/connect-iq/apps/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          Garmin Health API
        </a>
        . Garmin is a trademark of Garmin Ltd.
      </p>
    </div>
  );
}

function MetricCard({
  label,
  metric,
  accent,
}: {
  label: string;
  metric: PulseMetric | undefined;
  accent: string;
}) {
  const value = metric ? formatValue(metric) : "—";
  const unit = metric ? displayUnit(metric) : "";
  const source = metric?.source ?? "";

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className={`text-5xl font-semibold tabular-nums ${accent}`}>
          {value}
        </span>
        {unit && (
          <span className="text-lg text-muted-foreground">{unit}</span>
        )}
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        {source || "—"}
      </div>
    </div>
  );
}
