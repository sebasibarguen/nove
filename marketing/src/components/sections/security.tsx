// ABOUTME: Security & data-handling commitments section.
// ABOUTME: Reuses FeatureConfig shape but renders with a tighter, trust-focused treatment.

import * as icons from "lucide-react";
import type { SecurityConfig } from "@/types/landing";

function getIcon(name: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Icon = (icons as any)[name] as React.ComponentType<{ className?: string }> | undefined;
  return Icon ?? icons.Shield;
}

export function Security({ config }: { config: SecurityConfig }) {
  return (
    <section className="border-y bg-muted/40 px-6 py-20 md:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold md:text-4xl">{config.headline}</h2>
          {config.subheadline && (
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              {config.subheadline}
            </p>
          )}
        </div>
        <div className="grid gap-6 md:grid-cols-2 md:gap-8">
          {config.points.map((point) => {
            const Icon = getIcon(point.icon);
            return (
              <div
                key={point.title}
                className="flex gap-4 rounded-2xl border bg-background p-6"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{point.title}</h3>
                  <p className="mt-2 text-muted-foreground leading-relaxed">
                    {point.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
