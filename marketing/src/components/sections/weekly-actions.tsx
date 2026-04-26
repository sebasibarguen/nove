// ABOUTME: "This week, focus on..." section showing example AI-generated weekly actions.
// ABOUTME: Each action card carries a category, action title, and rationale grounded in the user's data.

import { Sparkles } from "lucide-react";
import type { WeeklyActionsConfig } from "@/types/landing";

export function WeeklyActions({ config }: { config: WeeklyActionsConfig }) {
  return (
    <section className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold md:text-5xl">{config.headline}</h2>
          {config.subheadline && (
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
              {config.subheadline}
            </p>
          )}
        </div>
        <div className="grid gap-6 md:grid-cols-3 md:gap-8">
          {config.actions.map((action) => (
            <div
              key={action.title}
              className="flex flex-col rounded-2xl border-2 border-primary/15 bg-primary/5 p-8"
            >
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{action.category}</span>
              </div>
              <h3 className="mt-4 text-xl font-bold md:text-2xl">{action.title}</h3>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                {action.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
