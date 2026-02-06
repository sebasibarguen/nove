// ABOUTME: Landing page template that assembles all sections.
// ABOUTME: Receives a LandingConfig and renders the full page.

import type { LandingConfig } from "@/types/landing";
import { Hero } from "@/components/sections/hero";
import { Features } from "@/components/sections/features";
import { SocialProof } from "@/components/sections/social-proof";
import { LeadForm } from "@/components/sections/lead-form";
import { FooterCta } from "@/components/sections/footer-cta";

export function LandingPage({ config }: { config: LandingConfig }) {
  return (
    <main className="mx-auto max-w-6xl">
      <Hero config={config.hero} />
      <Features config={config.features} />
      <SocialProof config={config.socialProof} />
      <LeadForm slug={config.slug} />
      <FooterCta config={config.footerCta} />
    </main>
  );
}
