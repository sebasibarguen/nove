// ABOUTME: Nove Age banner showing physiological vs chronological age.
// ABOUTME: Displays age delta with color-coded indicator.

"use client";

import { Card, CardContent } from "@/components/ui/card";

interface NoveAgeCardProps {
  physiological: number | null;
  chronological: number | null;
  delta: number | null;
  inputsUsed: number;
}

export function NoveAgeCard({
  physiological,
  chronological,
  delta,
  inputsUsed,
}: NoveAgeCardProps) {
  if (physiological == null || chronological == null) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-4 text-center">
          <p className="text-muted-foreground text-sm">
            We need more data to calculate your Nove Age
            {inputsUsed > 0 && ` (${inputsUsed}/2 available)`}
          </p>
        </CardContent>
      </Card>
    );
  }

  const isYounger = delta != null && delta < 0;
  const deltaColor = isYounger ? "text-green-600" : delta === 0 ? "text-muted-foreground" : "text-red-500";
  const deltaLabel = delta != null
    ? isYounger
      ? `${Math.abs(delta)} years younger`
      : delta === 0
        ? "Same as your actual age"
        : `${delta} years older`
    : "";

  return (
    <Card>
      <CardContent className="flex items-center justify-between py-4">
        <div className="flex items-baseline gap-4">
          <div>
            <span className="text-muted-foreground text-xs">Nove Age</span>
            <p className="text-2xl font-bold">{physiological}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Actual age</span>
            <p className="text-muted-foreground text-lg">{chronological}</p>
          </div>
        </div>
        {delta != null && (
          <span className={`text-sm font-medium ${deltaColor}`}>
            {deltaLabel}
          </span>
        )}
      </CardContent>
    </Card>
  );
}
