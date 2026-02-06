// ABOUTME: Numbered step-by-step section explaining the product flow.
// ABOUTME: Renders 3 steps with large numbers, title, and description.

import type { HowItWorksConfig } from "@/types/landing";

export function HowItWorks({ config }: { config: HowItWorksConfig }) {
  return (
    <section className="px-6 py-16 md:py-24">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-16 text-center text-3xl font-bold md:text-4xl">
          {config.headline}
        </h2>
        <div className="grid gap-12 md:grid-cols-3 md:gap-8">
          {config.steps.map((step, i) => (
            <div key={step.title} className="flex flex-col items-center text-center md:items-start md:text-left">
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                {i + 1}
              </span>
              <h3 className="mb-2 text-xl font-semibold">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
