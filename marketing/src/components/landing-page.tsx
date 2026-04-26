// ABOUTME: Landing page template that assembles all sections from config.
// ABOUTME: Every section renders edge-to-edge — each handles its own content max-width internally.

import type { LandingConfig } from "@/types/landing";
import { Hero } from "@/components/sections/hero";
import { ValueProp } from "@/components/sections/value-prop";
import { BigMovers } from "@/components/sections/big-movers";
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
      {config.valueProp && <ValueProp config={config.valueProp} />}
      {config.bigMovers && <BigMovers config={config.bigMovers} />}
      <Features config={config.features} />
      {config.howItWorks && <HowItWorks config={config.howItWorks} />}
      {config.comparison && <Comparison config={config.comparison} />}
      <SocialProof config={config.socialProof} />
      {config.timeline && <Timeline config={config.timeline} />}
      {config.faq && <FAQ config={config.faq} />}
      <LeadForm slug={config.slug} ctaText={config.footerCta.ctaText} lang={config.lang} />
      <FooterCta config={config.footerCta} />
    </main>
  );
}
