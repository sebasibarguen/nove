// ABOUTME: Sleep duration bar chart using Recharts.
// ABOUTME: Shows deep, light, and REM sleep breakdown over time.

"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface DataPoint {
  data_type: string;
  date: string;
  data: Record<string, unknown>;
}

function toHours(seconds: unknown): number {
  if (typeof seconds !== "number") return 0;
  return Math.round((seconds / 3600) * 10) / 10;
}

export function SleepChart({ data }: { data: DataPoint[] }) {
  const chartData = data
    .map((d) => ({
      date: new Date(d.date).toLocaleDateString("es-GT", {
        month: "short",
        day: "numeric",
      }),
      deep: toHours(d.data.deepSleepDurationInSeconds),
      light: toHours(d.data.lightSleepDurationInSeconds),
      rem: toHours(d.data.remSleepInSeconds),
    }))
    .reverse();

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={chartData}>
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} unit="h" />
        <Tooltip
          formatter={(value, name) => [
            `${value}h`,
            name === "deep"
              ? "Profundo"
              : name === "light"
                ? "Ligero"
                : "REM",
          ]}
        />
        <Bar dataKey="deep" stackId="sleep" fill="#1e40af" name="deep" />
        <Bar dataKey="light" stackId="sleep" fill="#60a5fa" name="light" />
        <Bar dataKey="rem" stackId="sleep" fill="#a78bfa" name="rem" />
      </BarChart>
    </ResponsiveContainer>
  );
}
