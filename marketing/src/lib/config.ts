// ABOUTME: Loads landing page configs from JSON files in configs/.
// ABOUTME: Used at build time by generateStaticParams and page components.

import fs from "fs";
import path from "path";
import type { LandingConfig } from "@/types/landing";

const configsDir = path.join(process.cwd(), "src", "configs");

export function getAllSlugs(): string[] {
  return fs
    .readdirSync(configsDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""));
}

export function loadLandingConfig(slug: string): LandingConfig | null {
  const filePath = path.join(configsDir, `${slug}.json`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as LandingConfig;
}
