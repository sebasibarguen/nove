// ABOUTME: Landing page template that assembles all sections from config.
// ABOUTME: Optional sections (howItWorks, comparison) render only if present.

import type { LandingConfig } from "@/types/landing";
import { Hero } from "@/components/sections/hero";
import { HowItWorks } from "@/components/sections/how-it-works";
import { Features } from "@/components/sections/features";
import { Comparison } from "@/components/sections/comparison";
import { SocialProof } from "@/components/sections/social-proof";
import { LeadForm } from "@/components/sections/lead-form";
import { FooterCta } from "@/components/sections/footer-cta";

export function LandingPage({ config }: { config: LandingConfig }) {
  return (
    <main className="mx-auto max-w-6xl">
      <Hero config={config.hero} />
      {config.howItWorks && <HowItWorks config={config.howItWorks} />}
      <Features config={config.features} />
      {config.comparison && <Comparison config={config.comparison} />}
      <SocialProof config={config.socialProof} />
      <LeadForm slug={config.slug} ctaText={config.footerCta.ctaText} />
      <FooterCta config={config.footerCta} />
    </main>
  );
}
