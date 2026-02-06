// ABOUTME: Final CTA section at the bottom of the page.
// ABOUTME: Scrolls to the lead form on click.

import { Button } from "@/components/ui/button";
import type { FooterCtaConfig } from "@/types/landing";

export function FooterCta({ config }: { config: FooterCtaConfig }) {
  return (
    <section className="flex flex-col items-center gap-6 px-6 py-16 text-center md:py-24">
      <h2 className="max-w-2xl text-3xl font-bold">{config.headline}</h2>
      <p className="max-w-xl text-lg text-muted-foreground">
        {config.subheadline}
      </p>
      <Button asChild size="lg" className="text-lg px-8 py-6">
        <a href="#registro">{config.ctaText}</a>
      </Button>
    </section>
  );
}
