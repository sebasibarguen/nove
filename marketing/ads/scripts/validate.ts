// ABOUTME: Validates Google Ads campaign JSON configs before deployment.
// ABOUTME: Run with: npx tsx ads/scripts/validate.ts ads/campaigns/salud-general.json

import fs from "fs";

interface Keyword {
  text: string;
  matchType: string;
}

interface Ad {
  headlines: string[];
  descriptions: string[];
  finalUrl: string;
}

interface AdGroup {
  name: string;
  keywords: Keyword[];
  ads: Ad[];
}

interface CampaignConfig {
  campaign: {
    name: string;
    dailyBudgetGtq: number;
    geoTargets: string[];
    language: string;
  };
  adGroups: AdGroup[];
}

const VALID_MATCH_TYPES = ["EXACT", "PHRASE", "BROAD"];
const MAX_HEADLINE_LENGTH = 30;
const MAX_DESCRIPTION_LENGTH = 90;

function validate(filePath: string): string[] {
  const errors: string[] = [];

  if (!fs.existsSync(filePath)) {
    return [`File not found: ${filePath}`];
  }

  let config: CampaignConfig;
  try {
    config = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return [`Invalid JSON: ${filePath}`];
  }

  // Campaign validation
  if (!config.campaign?.name) errors.push("Missing campaign.name");
  if (!config.campaign?.dailyBudgetGtq || config.campaign.dailyBudgetGtq <= 0) {
    errors.push("dailyBudgetGtq must be positive");
  }
  if (!config.campaign?.geoTargets?.length) errors.push("Missing geoTargets");
  if (!config.campaign?.language) errors.push("Missing language");

  // Ad groups validation
  if (!config.adGroups?.length) {
    errors.push("Must have at least one ad group");
    return errors;
  }

  for (const group of config.adGroups) {
    if (!group.name) errors.push("Ad group missing name");

    // Keywords
    if (!group.keywords?.length) {
      errors.push(`Ad group "${group.name}": no keywords`);
    }
    for (const kw of group.keywords ?? []) {
      if (!kw.text) errors.push(`Empty keyword in "${group.name}"`);
      if (!VALID_MATCH_TYPES.includes(kw.matchType)) {
        errors.push(`Invalid matchType "${kw.matchType}" for keyword "${kw.text}"`);
      }
    }

    // Ads
    if (!group.ads?.length) {
      errors.push(`Ad group "${group.name}": no ads`);
    }
    for (const ad of group.ads ?? []) {
      if (!ad.headlines?.length || ad.headlines.length < 3) {
        errors.push(`Ad in "${group.name}": need at least 3 headlines`);
      }
      for (const h of ad.headlines ?? []) {
        if (h.length > MAX_HEADLINE_LENGTH) {
          errors.push(`Headline too long (${h.length}/${MAX_HEADLINE_LENGTH}): "${h}"`);
        }
      }
      if (!ad.descriptions?.length || ad.descriptions.length < 2) {
        errors.push(`Ad in "${group.name}": need at least 2 descriptions`);
      }
      for (const d of ad.descriptions ?? []) {
        if (d.length > MAX_DESCRIPTION_LENGTH) {
          errors.push(`Description too long (${d.length}/${MAX_DESCRIPTION_LENGTH}): "${d.slice(0, 40)}..."`);
        }
      }
      if (!ad.finalUrl) errors.push(`Ad in "${group.name}": missing finalUrl`);
    }
  }

  return errors;
}

// CLI entry point
const file = process.argv[2];
if (!file) {
  console.error("Usage: npx tsx ads/scripts/validate.ts <campaign-config.json>");
  process.exit(1);
}

const errors = validate(file);
if (errors.length === 0) {
  console.log(`✓ ${file} is valid`);
} else {
  console.error(`✗ ${file} has ${errors.length} error(s):`);
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
}
