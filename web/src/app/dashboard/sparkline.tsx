// ABOUTME: Inline SVG sparkline for 7-day trend visualization.
// ABOUTME: Renders a simple polyline from an array of numeric values.

"use client";

interface SparklineProps {
  data: { value: number }[];
  color?: string;
  width?: number;
  height?: number;
}

export function Sparkline({
  data,
  color = "#3b82f6",
  width = 80,
  height = 24,
}: SparklineProps) {
  if (data.length < 2) return null;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padding = 2;

  const points = values
    .map((v, i) => {
      const x = padding + (i / (values.length - 1)) * (width - 2 * padding);
      const y = padding + (1 - (v - min) / range) * (height - 2 * padding);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
