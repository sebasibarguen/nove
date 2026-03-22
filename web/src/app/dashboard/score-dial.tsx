// ABOUTME: SVG circular progress dial for hero scores (Recovery, Strain, Sleep).
// ABOUTME: Renders an animated ring with score value and label in the center.

"use client";

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const COLOR_MAP: Record<string, string> = {
  green: "#22c55e",
  yellow: "#eab308",
  red: "#ef4444",
  light: "#93c5fd",
  medium: "#3b82f6",
  deep: "#1d4ed8",
};

interface ScoreDialProps {
  value: number | null;
  label: string;
  color: string | null;
  max?: number;
}

export function ScoreDial({ value, label, color, max = 100 }: ScoreDialProps) {
  const ratio = value != null ? Math.min(value / max, 1) : 0;
  const offset = CIRCUMFERENCE * (1 - ratio);
  const strokeColor = color ? COLOR_MAP[color] ?? "#a3a3a3" : "#a3a3a3";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 100 100" className="h-28 w-28">
        {/* Background ring */}
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-muted/30"
        />
        {/* Progress ring */}
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke={strokeColor}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          className="transition-all duration-700 ease-out"
        />
        {/* Value text */}
        <text
          x="50"
          y="48"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-foreground text-2xl font-bold"
          fontSize="20"
        >
          {value != null ? (max === 21 ? value.toFixed(1) : Math.round(value)) : "—"}
        </text>
      </svg>
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
    </div>
  );
}
