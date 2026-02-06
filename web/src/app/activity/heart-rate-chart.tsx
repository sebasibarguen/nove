// ABOUTME: Stress and Body Battery line chart using Recharts.
// ABOUTME: Shows average stress level and body battery trends.

"use client";

import {
  Line,
  LineChart,
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

export function HeartRateChart({ data }: { data: DataPoint[] }) {
  const chartData = data
    .map((d) => ({
      date: new Date(d.date).toLocaleDateString("es-GT", {
        month: "short",
        day: "numeric",
      }),
      stress:
        typeof d.data.averageStressLevel === "number"
          ? d.data.averageStressLevel
          : null,
      bodyBattery:
        typeof d.data.bodyBatteryChargedValue === "number"
          ? d.data.bodyBatteryChargedValue
          : null,
    }))
    .reverse();

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={chartData}>
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
        <Tooltip
          formatter={(value, name) => [
            Number(value),
            name === "stress" ? "Estres" : "Body Battery",
          ]}
        />
        <Line
          type="monotone"
          dataKey="stress"
          stroke="#ef4444"
          strokeWidth={2}
          dot={false}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="bodyBattery"
          stroke="#10b981"
          strokeWidth={2}
          dot={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
