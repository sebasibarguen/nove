// ABOUTME: Landing page template that assembles all sections from config.
// ABOUTME: Optional sections (howItWorks, comparison) render only if present.

import type { LandingConfig } from "@/types/landing";
import { Hero } from "@/components/sections/hero";
import { HowItWorks } from "@/components/sections/how-it-works";
import { Features } from "@/components/sections/features";
import { Comparison } from "@/components/sections/comparison";
import { SocialProof } from "@/components/sections/social-proof";
import { Timeline } from "@/components/sections/timeline";
import { FAQ } from "@/components/sections/faq";
import { LeadForm } from "@/components/sections/lead-form";
import { FooterCta } from "@/components/sections/footer-cta";

export function LandingPage({ config }: { config: LandingConfig }) {
  return (
    <main>
      <Hero config={config.hero} />
      <div className="mx-auto max-w-6xl">
        <Features config={config.features} />
        {config.howItWorks && <HowItWorks config={config.howItWorks} />}
        {config.comparison && <Comparison config={config.comparison} />}
        <SocialProof config={config.socialProof} />
        {config.timeline && <Timeline config={config.timeline} />}
        {config.faq && <FAQ config={config.faq} />}
        <LeadForm slug={config.slug} ctaText={config.footerCta.ctaText} lang={config.lang} />
        <FooterCta config={config.footerCta} />
      </div>
    </main>
  );
}
