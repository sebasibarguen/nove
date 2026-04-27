// ABOUTME: Metabolic health pillar detail content.
// ABOUTME: Shows glucose, HbA1c, and lipid panel values with status badges.

"use client";

import { PillarCard } from "./pillar-card";

interface Biomarker {
  code: string;
  name: string;
  value: number;
  unit: string;
  status: string;
  reference_range_low: number | null;
  reference_range_high: number | null;
}

interface MetabolicPillarData {
  biomarkers: Biomarker[];
}

const STATUS_STYLES: Record<string, string> = {
  normal: "bg-green-100 text-green-800",
  borderline: "bg-yellow-100 text-yellow-800",
  flagged: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  normal: "Normal",
  borderline: "Borderline",
  flagged: "Flagged",
};

export function MetabolicPillar({ data }: { data: MetabolicPillarData }) {
  const normalCount = data.biomarkers.filter((b) => b.status === "normal").length;
  const summary = `${normalCount}/${data.biomarkers.length}`;

  return (
    <PillarCard icon="🧪" title="Metabolism" summary={summary}>
      <div className="space-y-3">
        {data.biomarkers.map((b) => (
          <div key={b.code} className="flex items-center justify-between text-sm">
            <div>
              <span className="font-medium">{b.name}</span>
              <span className="text-muted-foreground ml-2">
                {b.value} {b.unit}
              </span>
              {b.reference_range_low != null && b.reference_range_high != null && (
                <span className="text-muted-foreground ml-1 text-xs">
                  ({b.reference_range_low}–{b.reference_range_high})
                </span>
              )}
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[b.status] ?? ""}`}
            >
              {STATUS_LABELS[b.status] ?? b.status}
            </span>
          </div>
        ))}
      </div>
    </PillarCard>
  );
}
