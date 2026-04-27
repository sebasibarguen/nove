// ABOUTME: Pulse sleep trend page — 14-day sleep duration and stage breakdown.
// ABOUTME: Stacked bar chart of deep/light/REM, plus latest-night summary.

"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  TrendShell,
  formatShortDate,
  useTrend,
} from "../../_components/trend-page";

interface SleepPoint {
  date: string;
  total_seconds: number | null;
  deep_seconds: number | null;
  light_seconds: number | null;
  rem_seconds: number | null;
  awake_seconds: number | null;
}

function toHours(seconds: number | null | undefined): number {
  if (typeof seconds !== "number") return 0;
  return Math.round((seconds / 3600) * 10) / 10;
}

export default function SleepPage() {
  const { user, authLoading, data, fetching } =
    useTrend<SleepPoint>("/pulse/sleep?days=14");

  if (authLoading || !user) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const rows = (data ?? []).map((p) => ({
    date: formatShortDate(p.date),
    deep: toHours(p.deep_seconds),
    light: toHours(p.light_seconds),
    rem: toHours(p.rem_seconds),
    awake: toHours(p.awake_seconds),
  }));
  const latest = data?.at(-1) ?? null;
  const avgHours =
    data && data.length > 0
      ? data.reduce((acc, p) => acc + toHours(p.total_seconds), 0) / data.length
      : 0;

  return (
    <TrendShell
      title="Sleep"
      subtitle="Duration and stages, last 14 days."
      fetching={fetching}
      hasData={rows.length > 0}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Stat
          label="Last night"
          value={toHours(latest?.total_seconds)}
          unit="h"
          accent="text-violet-400"
        />
        <Stat
          label="Deep last night"
          value={toHours(latest?.deep_seconds)}
          unit="h"
          accent="text-blue-400"
        />
        <Stat
          label="14-day avg"
          value={avgHours}
          unit="h"
          accent="text-purple-400"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
          Sleep stages
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={rows}>
            <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="currentColor" />
            <YAxis tick={{ fontSize: 12 }} stroke="currentColor" unit="h" width={36} />
            <Tooltip
              contentStyle={{
                background: "rgb(24 24 27)",
                border: "1px solid rgb(63 63 70)",
              }}
              formatter={(value, name) => [
                `${value}h`,
                name === "deep"
                  ? "Deep"
                  : name === "light"
                    ? "Light"
                    : name === "rem"
                      ? "REM"
                      : "Awake",
              ]}
            />
            <Bar dataKey="deep" stackId="sleep" fill="#1e40af" name="deep" />
            <Bar dataKey="light" stackId="sleep" fill="#60a5fa" name="light" />
            <Bar dataKey="rem" stackId="sleep" fill="#a78bfa" name="rem" />
            <Bar dataKey="awake" stackId="sleep" fill="#71717a" name="awake" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </TrendShell>
  );
}

function Stat({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: number;
  unit: string;
  accent: string;
}) {
  const display = value === 0 ? "—" : value.toFixed(1);
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
