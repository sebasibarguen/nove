// ABOUTME: Single distilled value proposition band placed under the hero.
// ABOUTME: Larger headline, single sub-paragraph — anchors the page's "why" before the features.

import type { ValuePropConfig } from "@/types/landing";

export function ValueProp({ config }: { config: ValuePropConfig }) {
  return (
    <section className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
          {config.headline}
        </h2>
        <p className="mt-6 text-lg text-muted-foreground md:text-xl">
          {config.subheadline}
        </p>
      </div>
    </section>
  );
}
