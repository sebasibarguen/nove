// ABOUTME: Activity health pillar detail content.
// ABOUTME: Shows steps, active minutes, calories, and 7-day steps trend.

"use client";

import { PillarCard } from "./pillar-card";
import { Sparkline } from "./sparkline";

interface ActivityPillarData {
  steps: number | null;
  active_minutes: number | null;
  calories: number | null;
  steps_trend: { date: string; value: number }[];
}

function formatSteps(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export function ActivityPillar({ data }: { data: ActivityPillarData }) {
  const summary = data.steps != null ? formatSteps(data.steps) : "—";

  return (
    <PillarCard icon="🏃" title="Actividad" summary={summary}>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Pasos</span>
          <p className="font-medium">{data.steps?.toLocaleString("es-GT") ?? "—"}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Minutos activos</span>
          <p className="font-medium">{data.active_minutes ?? "—"} min</p>
        </div>
        {data.calories != null && (
          <div>
            <span className="text-muted-foreground">Calorias</span>
            <p className="font-medium">{data.calories.toLocaleString("es-GT")} kcal</p>
          </div>
        )}
        {data.steps_trend.length >= 2 && (
          <div>
            <span className="text-muted-foreground">Tendencia 7d</span>
            <div className="mt-1">
              <Sparkline data={data.steps_trend} color="#10b981" />
            </div>
          </div>
        )}
      </div>
    </PillarCard>
  );
}
