// ABOUTME: Comparison table showing Nove vs traditional health approaches.
// ABOUTME: Checkmark/X grid inspired by Function Health's "Not your average checkup".

import { Check, X } from "lucide-react";
import type { ComparisonConfig } from "@/types/landing";

export function Comparison({ config }: { config: ComparisonConfig }) {
  return (
    <section className="px-6 py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-4 text-center text-3xl font-bold md:text-4xl">
          {config.headline}
        </h2>
        {config.subheadline && (
          <p className="mb-12 text-center text-lg text-muted-foreground">
            {config.subheadline}
          </p>
        )}
        <div className="overflow-hidden rounded-lg border">
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b bg-muted/50 px-6 py-4 text-sm font-semibold">
            <span />
            <span className="w-24 text-center">{config.noveLabel}</span>
            <span className="w-24 text-center">{config.traditionalLabel}</span>
          </div>
          {config.rows.map((row, i) => (
            <div
              key={row.feature}
              className={`grid grid-cols-[1fr_auto_auto] items-center gap-4 px-6 py-4 ${
                i < config.rows.length - 1 ? "border-b" : ""
              }`}
            >
              <span className="text-sm md:text-base">{row.feature}</span>
              <span className="flex w-24 justify-center">
                {row.nove ? (
                  <Check className="h-5 w-5 text-primary" />
                ) : (
                  <X className="h-5 w-5 text-muted-foreground/40" />
                )}
              </span>
              <span className="flex w-24 justify-center">
                {row.traditional ? (
                  <Check className="h-5 w-5 text-primary" />
                ) : (
                  <X className="h-5 w-5 text-muted-foreground/40" />
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
