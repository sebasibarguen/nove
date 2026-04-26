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

export interface HeroImage {
  src: string;
  alt: string;
}

export interface HeroConfig {
  headline: string;
  subheadline: string;
  ctaText: string;
  ctaHref: string;
  stats?: StatConfig[];
  image?: HeroImage;
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

export interface ComparisonColumn {
  label: string;
  highlight?: boolean;
}

export interface ComparisonRow {
  feature: string;
  values: boolean[];
}

export interface ComparisonConfig {
  headline: string;
  subheadline?: string;
  columns: ComparisonColumn[];
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

export interface ValuePropConfig {
  headline: string;
  subheadline: string;
}

export interface FooterCtaConfig {
  headline: string;
  subheadline: string;
  ctaText: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQConfig {
  headline: string;
  items: FAQItem[];
}

export interface LandingConfig {
  slug: string;
  lang?: "es" | "en";
  meta: LandingMeta;
  hero: HeroConfig;
  valueProp?: ValuePropConfig;
  howItWorks?: HowItWorksConfig;
  features: FeatureConfig[] | FeaturesSection;
  comparison?: ComparisonConfig;
  socialProof: SocialProofConfig;
  timeline?: HowItWorksConfig;
  faq?: FAQConfig;
  footerCta: FooterCtaConfig;
}
