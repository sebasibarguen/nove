// ABOUTME: Pulse recovery trend page — Nove score header + 14-day Body Battery and stress trend.
// ABOUTME: Falls back gracefully to passthrough-only view when there isn't enough data for the score.

"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, ApiError } from "@/lib/api";
import {
  TrendShell,
  formatShortDate,
  useTrend,
} from "../../_components/trend-page";

interface RecoveryPoint {
  date: string;
  body_battery_charged: number | null;
  body_battery_drained: number | null;
  avg_stress: number | null;
}

interface RecoveryScore {
  value: number | null;
  confidence: "high" | "medium" | "low" | "none";
  components: Record<string, number>;
  as_of: string | null;
}

interface PulseToday {
  recovery_detail: RecoveryScore | null;
}

const COMPONENT_LABELS: Record<string, string> = {
  hrv: "HRV",
  sleep: "Sleep",
  rhr: "RHR",
};

export default function RecoveryPage() {
  const { user, authLoading, data, fetching } =
    useTrend<RecoveryPoint>("/pulse/recovery?days=14");
  const [score, setScore] = useState<RecoveryScore | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api<PulseToday>("/pulse/today")
      .then((today) => {
        if (!cancelled) setScore(today.recovery_detail);
      })
      .catch((err: ApiError) => console.error("today fetch failed", err));
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (authLoading || !user) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const rows = (data ?? []).map((p) => ({
    date: formatShortDate(p.date),
    charged: p.body_battery_charged,
    drained: p.body_battery_drained,
    stress: p.avg_stress,
  }));
  const latest = data?.at(-1) ?? null;

  return (
    <TrendShell
      title="Recovery"
      subtitle="Body Battery and average stress, last 14 days."
      fetching={fetching}
      hasData={rows.length > 0}
    >
      {score && score.value !== null && (
        <NoveScoreCard score={score} />
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Stat
          label="Charged today"
          value={latest?.body_battery_charged}
          unit="pts"
          accent="text-emerald-400"
        />
        <Stat
          label="Drained today"
          value={latest?.body_battery_drained}
          unit="pts"
          accent="text-amber-400"
        />
        <Stat
          label="Avg stress"
          value={latest?.avg_stress}
          unit="/100"
          accent="text-rose-400"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={rows}>
            <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="currentColor" />
            <YAxis
              yAxisId="bb"
              tick={{ fontSize: 12 }}
              stroke="currentColor"
              width={36}
            />
            <YAxis
              yAxisId="stress"
              orientation="right"
              tick={{ fontSize: 12 }}
              stroke="currentColor"
              width={30}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                background: "rgb(24 24 27)",
                border: "1px solid rgb(63 63 70)",
              }}
              formatter={(value, name) => [
                value,
                name === "charged"
                  ? "Charged"
                  : name === "drained"
                    ? "Drained"
                    : "Stress",
              ]}
            />
            <Bar yAxisId="bb" dataKey="charged" fill="#34d399" name="charged" />
            <Bar yAxisId="bb" dataKey="drained" fill="#f59e0b" name="drained" />
            <Line
              yAxisId="stress"
              dataKey="stress"
              stroke="#f43f5e"
              strokeWidth={2}
              dot={false}
              name="stress"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </TrendShell>
  );
}

function NoveScoreCard({ score }: { score: RecoveryScore }) {
  const value = score.value ?? 0;
  const accent =
    value >= 75
      ? "text-emerald-400"
      : value >= 50
        ? "text-amber-400"
        : "text-rose-400";

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Nove score
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-6xl font-semibold tabular-nums ${accent}`}>
              {Math.round(value)}
            </span>
            <span className="text-base text-muted-foreground">/100</span>
          </div>
        </div>
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {score.confidence} confidence
        </span>
      </div>

      <div className="mt-6 space-y-3">
        {Object.entries(score.components).map(([key, val]) => (
          <ComponentBar key={key} label={COMPONENT_LABELS[key] ?? key} value={val} />
        ))}
      </div>
    </div>
  );
}

function ComponentBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">{Math.round(value)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-foreground"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: number | null | undefined;
  unit: string;
  accent: string;
}) {
  const display =
    value === null || value === undefined
      ? "—"
      : Number.isInteger(value)
        ? value.toLocaleString()
        : value.toFixed(1);
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className={`text-3xl font-semibold tabular-nums ${accent}`}>
          {display}
        </span>
        <span className="text-sm text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}
