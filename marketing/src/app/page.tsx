// ABOUTME: Root page that renders the default "salud" landing config.
// ABOUTME: Acts as the homepage for the marketing site.

import { loadLandingConfig } from "@/lib/config";
import { LandingPage } from "@/components/landing-page";
import { notFound } from "next/navigation";

export default function Home() {
  const config = loadLandingConfig("salud");
  if (!config) notFound();
  return <LandingPage config={config} />;
}
