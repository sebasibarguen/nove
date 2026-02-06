// ABOUTME: Daily activity bar chart using Recharts.
// ABOUTME: Shows steps per day over the selected time period.

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

export function ActivityChart({ data }: { data: DataPoint[] }) {
  const chartData = data
    .map((d) => ({
      date: new Date(d.date).toLocaleDateString("es-GT", {
        month: "short",
        day: "numeric",
      }),
      steps: typeof d.data.steps === "number" ? d.data.steps : 0,
    }))
    .reverse();

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={chartData}>
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value) => [
            Number(value).toLocaleString("es-GT"),
            "Pasos",
          ]}
        />
        <Bar dataKey="steps" fill="#10b981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
