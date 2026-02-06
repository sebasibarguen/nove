// ABOUTME: Hero section with headline, subheadline, and CTA button.
// ABOUTME: CTA scrolls to the lead capture form.

import { Button } from "@/components/ui/button";
import type { HeroConfig } from "@/types/landing";

export function Hero({ config }: { config: HeroConfig }) {
  return (
    <section className="flex flex-col items-center gap-8 px-6 py-24 text-center md:py-32">
      <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
        {config.headline}
      </h1>
      <p className="max-w-2xl text-lg text-muted-foreground md:text-xl">
        {config.subheadline}
      </p>
      <Button asChild size="lg" className="text-lg px-8 py-6">
        <a href={config.ctaHref}>{config.ctaText}</a>
      </Button>
    </section>
  );
}
