// ABOUTME: TypeScript interfaces for landing page configuration.
// ABOUTME: Each JSON file in configs/ must conform to LandingConfig.

export interface LandingMeta {
  title: string;
  description: string;
  ogImage?: string;
}

export interface StatConfig {
  value: string;
  label: string;
}

export interface HeroConfig {
  headline: string;
  subheadline: string;
  ctaText: string;
  ctaHref: string;
  stats?: StatConfig[];
}

export interface StepConfig {
  title: string;
  description: string;
}

export interface HowItWorksConfig {
  headline: string;
  steps: StepConfig[];
}

export interface FeatureConfig {
  icon: string;
  title: string;
  description: string;
}

export interface FeaturesSection {
  headline?: string;
  items: FeatureConfig[];
}

export interface ComparisonRow {
  feature: string;
  nove: boolean;
  traditional: boolean;
}

export interface ComparisonConfig {
  headline: string;
  subheadline?: string;
  noveLabel: string;
  traditionalLabel: string;
  rows: ComparisonRow[];
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
  howItWorks?: HowItWorksConfig;
  features: FeatureConfig[] | FeaturesSection;
  comparison?: ComparisonConfig;
  socialProof: SocialProofConfig;
  footerCta: FooterCtaConfig;
}
