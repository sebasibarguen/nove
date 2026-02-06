// ABOUTME: Final bold CTA section at the bottom of the page.
// ABOUTME: Dark background, large headline, scroll-to-form button.

import { Button } from "@/components/ui/button";
import type { FooterCtaConfig } from "@/types/landing";

export function FooterCta({ config }: { config: FooterCtaConfig }) {
  return (
    <section className="mx-4 mb-8 flex flex-col items-center gap-6 rounded-2xl bg-primary px-6 py-16 text-center text-primary-foreground md:mx-0 md:py-24">
      <h2 className="max-w-2xl text-3xl font-bold md:text-5xl">{config.headline}</h2>
      <p className="max-w-xl text-lg text-primary-foreground/80">
        {config.subheadline}
      </p>
      <Button asChild size="lg" variant="secondary" className="h-14 rounded-full px-10 text-lg">
        <a href="#registro">{config.ctaText}</a>
      </Button>
    </section>
  );
}
