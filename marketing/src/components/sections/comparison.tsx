// ABOUTME: N-column comparison table with checks vs Xs.
// ABOUTME: First column is the feature label; remaining columns are products being compared.

import { Check, X } from "lucide-react";
import type { ComparisonConfig } from "@/types/landing";

export function Comparison({ config }: { config: ComparisonConfig }) {
  const colCount = config.columns.length;
  const gridTemplate = `1fr repeat(${colCount}, minmax(6rem, auto))`;

  return (
    <section className="px-6 py-16 md:py-24">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-4 text-center text-3xl font-bold md:text-4xl">
          {config.headline}
        </h2>
        {config.subheadline && (
          <p className="mb-12 text-center text-lg text-muted-foreground">
            {config.subheadline}
          </p>
        )}
        <div className="overflow-hidden rounded-xl border">
          <div
            className="grid items-center gap-4 border-b bg-muted/50 px-6 py-4 text-sm font-semibold"
            style={{ gridTemplateColumns: gridTemplate }}
          >
            <span />
            {config.columns.map((col) => (
              <span
                key={col.label}
                className={`text-center ${col.highlight ? "text-primary" : ""}`}
              >
                {col.label}
              </span>
            ))}
          </div>
          {config.rows.map((row, i) => (
            <div
              key={row.feature}
              className={`grid items-center gap-4 px-6 py-4 ${
                i < config.rows.length - 1 ? "border-b" : ""
              }`}
              style={{ gridTemplateColumns: gridTemplate }}
            >
              <span className="text-sm md:text-base">{row.feature}</span>
              {row.values.map((value, j) => {
                const highlight = config.columns[j]?.highlight;
                return (
                  <span key={j} className="flex justify-center">
                    {value ? (
                      <Check
                        className={`h-5 w-5 ${highlight ? "text-primary" : "text-foreground/70"}`}
                      />
                    ) : (
                      <X className="h-5 w-5 text-muted-foreground/40" />
                    )}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
