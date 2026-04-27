// ABOUTME: Sleep health pillar detail content.
// ABOUTME: Shows last night score, duration, deep/REM percentages, and 7-day trend.

"use client";

import { PillarCard } from "./pillar-card";
import { Sparkline } from "./sparkline";

interface SleepPillarData {
  last_night_score: number | null;
  duration_hours: number | null;
  deep_pct: number | null;
  rem_pct: number | null;
  duration_trend: { date: string; value: number }[];
}

export function SleepPillar({ data }: { data: SleepPillarData }) {
  const summary = data.duration_hours != null ? `${data.duration_hours}h` : "—";

  return (
    <PillarCard icon="🌙" title="Sleep" summary={summary}>
      <div className="grid grid-cols-2 gap-4 text-sm">
        {data.last_night_score != null && (
          <div>
            <span className="text-muted-foreground">Last night score</span>
            <p className="font-medium">{data.last_night_score}/100</p>
          </div>
        )}
        <div>
          <span className="text-muted-foreground">Duration</span>
          <p className="font-medium">{data.duration_hours ?? "—"} hrs</p>
        </div>
        {data.deep_pct != null && (
          <div>
            <span className="text-muted-foreground">Deep sleep</span>
            <p className="font-medium">{data.deep_pct}%</p>
          </div>
        )}
        {data.rem_pct != null && (
          <div>
            <span className="text-muted-foreground">REM</span>
            <p className="font-medium">{data.rem_pct}%</p>
          </div>
        )}
        {data.duration_trend.length >= 2 && (
          <div className="col-span-2">
            <span className="text-muted-foreground">7-day trend</span>
            <div className="mt-1">
              <Sparkline data={data.duration_trend} color="#8b5cf6" />
            </div>
          </div>
        )}
      </div>
    </PillarCard>
  );
}
