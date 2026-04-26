// ABOUTME: Final bold CTA band at the bottom of the page, edge-to-edge primary background.
// ABOUTME: Designed to render outside any max-width wrapper.

import { Button } from "@/components/ui/button";
import type { FooterCtaConfig } from "@/types/landing";

export function FooterCta({ config }: { config: FooterCtaConfig }) {
  return (
    <section className="bg-primary px-6 py-20 text-center text-primary-foreground md:py-28">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6">
        <h2 className="text-3xl font-bold md:text-5xl">{config.headline}</h2>
        <p className="text-lg text-primary-foreground/80 md:text-xl">
          {config.subheadline}
        </p>
        <Button
          asChild
          size="lg"
          variant="secondary"
          className="h-16 rounded-full px-12 text-xl shadow-xl"
        >
          <a href="#registro">{config.ctaText}</a>
        </Button>
      </div>
    </section>
  );
}
