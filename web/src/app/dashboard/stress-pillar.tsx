// ABOUTME: Stress and recovery health pillar detail content.
// ABOUTME: Shows average stress level, body battery, and 7-day stress trend.

"use client";

import { PillarCard } from "./pillar-card";
import { Sparkline } from "./sparkline";

interface StressPillarData {
  avg_stress: number | null;
  body_battery: number | null;
  stress_trend: { date: string; value: number }[];
}

export function StressPillar({ data }: { data: StressPillarData }) {
  const summary = data.avg_stress != null ? `${data.avg_stress}` : "—";

  return (
    <PillarCard icon="⚡" title="Estres y Recuperacion" summary={summary}>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Estres promedio</span>
          <p className="font-medium">{data.avg_stress ?? "—"}/100</p>
        </div>
        <div>
          <span className="text-muted-foreground">Body Battery</span>
          <p className="font-medium">{data.body_battery ?? "—"}/100</p>
        </div>
        {data.stress_trend.length >= 2 && (
          <div className="col-span-2">
            <span className="text-muted-foreground">Tendencia 7d</span>
            <div className="mt-1">
              <Sparkline data={data.stress_trend} color="#f97316" />
            </div>
          </div>
        )}
      </div>
    </PillarCard>
  );
}
