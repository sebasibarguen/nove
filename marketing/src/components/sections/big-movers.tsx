// ABOUTME: Three-column "big movers for healthspan" section.
// ABOUTME: Each card leads with a metric label, then title and description.

import type { BigMoversConfig } from "@/types/landing";

export function BigMovers({ config }: { config: BigMoversConfig }) {
  return (
    <section className="bg-muted/30 px-6 py-20 md:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold md:text-5xl">{config.headline}</h2>
          {config.subheadline && (
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              {config.subheadline}
            </p>
          )}
        </div>
        <div className="grid gap-8 md:grid-cols-3 md:gap-10">
          {config.movers.map((mover) => (
            <div
              key={mover.title}
              className="rounded-2xl border bg-background p-8 shadow-sm"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                {mover.metric}
              </span>
              <h3 className="mt-3 text-2xl font-bold">{mover.title}</h3>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                {mover.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
