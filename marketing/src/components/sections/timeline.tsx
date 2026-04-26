// ABOUTME: Vertical timeline section — milestones along a connecting line.
// ABOUTME: Reuses HowItWorksConfig but renders distinctly from the numbered-grid HowItWorks.

import type { HowItWorksConfig } from "@/types/landing";

export function Timeline({ config }: { config: HowItWorksConfig }) {
  return (
    <section className="px-6 py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-12 text-center text-3xl font-bold md:text-4xl">
          {config.headline}
        </h2>
        <div className="relative">
          <div
            aria-hidden
            className="absolute left-[11px] top-2 bottom-2 w-px bg-border md:left-[15px]"
          />
          <ol className="space-y-10">
            {config.steps.map((step) => (
              <li key={step.title} className="relative pl-10 md:pl-14">
                <span
                  aria-hidden
                  className="absolute left-0 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-4 border-background bg-primary md:h-8 md:w-8"
                />
                <h3 className="text-lg font-semibold md:text-xl">{step.title}</h3>
                <p className="mt-2 text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
