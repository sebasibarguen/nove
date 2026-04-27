// ABOUTME: Pulse strain trend page — 14-day active calories, intensity minutes, and steps.
// ABOUTME: Passthrough view of Garmin activity summaries.

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

interface StrainPoint {
  date: string;
  active_kcal: number | null;
  intensity_minutes: number | null;
  steps: number | null;
}

export default function StrainPage() {
  const { user, authLoading, data, fetching } =
    useTrend<StrainPoint>("/pulse/strain?days=14");

  if (authLoading || !user) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const rows = (data ?? []).map((p) => ({
    date: formatShortDate(p.date),
    kcal: p.active_kcal,
    minutes: p.intensity_minutes,
    steps: p.steps,
  }));
  const latest = data?.at(-1) ?? null;
  const weekKcal = (data ?? [])
    .slice(-7)
    .reduce((acc, p) => acc + (p.active_kcal ?? 0), 0);

  return (
    <TrendShell
      title="Strain"
      subtitle="Active calories, intensity minutes, and steps — last 14 days."
      fetching={fetching}
      hasData={rows.length > 0}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Stat
          label="Calories today"
          value={latest?.active_kcal}
          unit="kcal"
          accent="text-sky-400"
        />
        <Stat
          label="Intensity today"
          value={latest?.intensity_minutes}
          unit="min"
          accent="text-indigo-400"
        />
        <Stat
          label="7-day kcal"
          value={Math.round(weekKcal) || null}
          unit="kcal"
          accent="text-cyan-400"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
          Active calories
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={rows}>
            <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="currentColor" />
            <YAxis tick={{ fontSize: 12 }} stroke="currentColor" width={40} />
            <Tooltip
              contentStyle={{
                background: "rgb(24 24 27)",
                border: "1px solid rgb(63 63 70)",
              }}
              formatter={(value) => [`${value} kcal`, "Active"]}
            />
            <Bar dataKey="kcal" fill="#38bdf8" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
          Intensity minutes
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={rows}>
            <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="currentColor" />
            <YAxis tick={{ fontSize: 12 }} stroke="currentColor" width={36} />
            <Tooltip
              contentStyle={{
                background: "rgb(24 24 27)",
                border: "1px solid rgb(63 63 70)",
              }}
              formatter={(value) => [`${value} min`, "Intensity"]}
            />
            <Bar dataKey="minutes" fill="#818cf8" />
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
