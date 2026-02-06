// ABOUTME: TypeScript interfaces for landing page configuration.
// ABOUTME: Each JSON file in configs/ must conform to LandingConfig.

export interface LandingMeta {
  title: string;
  description: string;
  ogImage?: string;
}

export interface HeroConfig {
  headline: string;
  subheadline: string;
  ctaText: string;
  ctaHref: string;
}

export interface FeatureConfig {
  icon: string;
  title: string;
  description: string;
}

export interface TestimonialConfig {
  quote: string;
  name: string;
  role: string;
}

export interface SocialProofConfig {
  headline: string;
  testimonials: TestimonialConfig[];
}

export interface FooterCtaConfig {
  headline: string;
  subheadline: string;
  ctaText: string;
}

export interface LandingConfig {
  slug: string;
  meta: LandingMeta;
  hero: HeroConfig;
  features: FeatureConfig[];
  socialProof: SocialProofConfig;
  footerCta: FooterCtaConfig;
}
