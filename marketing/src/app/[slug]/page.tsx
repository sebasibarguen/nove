// ABOUTME: Dynamic route that loads a landing page config by slug.
// ABOUTME: Generates static pages for all configs at build time.

import { loadLandingConfig, getAllSlugs } from "@/lib/config";
import { LandingPage } from "@/components/landing-page";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const config = loadLandingConfig(slug);
  if (!config) return {};
  return {
    title: config.meta.title,
    description: config.meta.description,
    openGraph: config.meta.ogImage ? { images: [config.meta.ogImage] } : undefined,
  };
}

export default async function SlugPage({ params }: Props) {
  const { slug } = await params;
  const config = loadLandingConfig(slug);
  if (!config) notFound();
  return <LandingPage config={config} />;
}
