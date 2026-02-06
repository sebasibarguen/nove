// ABOUTME: Hero section with bold headline, subheadline, CTA, and optional stats bar.
// ABOUTME: Inspired by Function Health's clean, stats-driven hero pattern.

import { Button } from "@/components/ui/button";
import type { HeroConfig } from "@/types/landing";

export function Hero({ config }: { config: HeroConfig }) {
  return (
    <section className="flex flex-col items-center gap-10 px-6 pt-20 pb-16 text-center md:pt-32 md:pb-20">
      <h1 className="max-w-4xl text-5xl font-bold tracking-tight md:text-7xl">
        {config.headline}
      </h1>
      <p className="max-w-2xl text-xl text-muted-foreground md:text-2xl">
        {config.subheadline}
      </p>
      <Button asChild size="lg" className="h-14 rounded-full px-10 text-lg">
        <a href={config.ctaHref}>{config.ctaText}</a>
      </Button>
      {config.stats && config.stats.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-8 md:gap-16">
          {config.stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center">
              <span className="text-3xl font-bold md:text-4xl">{stat.value}</span>
              <span className="text-sm text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
