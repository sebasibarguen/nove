// ABOUTME: Cardiovascular health pillar detail content.
// ABOUTME: Shows resting HR, VO2 Max, fitness age, and 7-day HR sparkline.

"use client";

import { PillarCard } from "./pillar-card";
import { Sparkline } from "./sparkline";

interface CardioPillarData {
  resting_hr: number | null;
  vo2_max: number | null;
  fitness_age: number | null;
  hr_trend: { date: string; value: number }[];
}

export function CardioPillar({ data }: { data: CardioPillarData }) {
  const summary = data.resting_hr != null ? `${data.resting_hr} bpm` : "—";

  return (
    <PillarCard icon="♥" title="Cardio" summary={summary}>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Resting HR</span>
          <p className="font-medium">{data.resting_hr ?? "—"} bpm</p>
        </div>
        <div>
          <span className="text-muted-foreground">VO2 Max</span>
          <p className="font-medium">{data.vo2_max ?? "—"} mL/kg/min</p>
        </div>
        {data.fitness_age != null && (
          <div>
            <span className="text-muted-foreground">Fitness age</span>
            <p className="font-medium">{data.fitness_age}</p>
          </div>
        )}
        {data.hr_trend.length >= 2 && (
          <div>
            <span className="text-muted-foreground">7-day trend</span>
            <div className="mt-1">
              <Sparkline data={data.hr_trend} color="#ef4444" />
            </div>
          </div>
        )}
      </div>
    </PillarCard>
  );
}
