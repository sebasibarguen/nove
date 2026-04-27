// ABOUTME: Validates a Meta Ads campaign config without hitting the API.
// ABOUTME: Run with: npx tsx ads/scripts/validate-meta.ts ads/campaigns/pulse-meta-tier1.json

import fs from "fs";
import path from "path";

const VALID_OBJECTIVES = [
  "OUTCOME_TRAFFIC",
  "OUTCOME_ENGAGEMENT",
  "OUTCOME_LEADS",
  "OUTCOME_AWARENESS",
  "OUTCOME_SALES",
  "OUTCOME_APP_PROMOTION",
];

const VALID_OPTIMIZATION_GOALS = [
  "LANDING_PAGE_VIEWS",
  "LINK_CLICKS",
  "REACH",
  "IMPRESSIONS",
  "OFFSITE_CONVERSIONS",
  "LEAD_GENERATION",
  "POST_ENGAGEMENT",
  "VIDEO_VIEWS",
];

const VALID_BILLING_EVENTS = ["IMPRESSIONS", "LINK_CLICKS"];

const VALID_FB_POSITIONS = [
  "feed",
  "right_hand_column",
  "story",
  "video_feeds",
  "marketplace",
  "search",
  "groups_feed",
];

const VALID_IG_POSITIONS = ["stream", "story", "reels", "explore", "shop"];

const VALID_CTAS = [
  "LEARN_MORE",
  "SIGN_UP",
  "SUBSCRIBE",
  "GET_OFFER",
  "DOWNLOAD",
  "CONTACT_US",
  "BOOK_TRAVEL",
  "GET_QUOTE",
  "APPLY_NOW",
  "SHOP_NOW",
];

const VALID_SPECIAL_AD_CATEGORIES = [
  "CREDIT",
  "EMPLOYMENT",
  "HOUSING",
  "ISSUES_ELECTIONS_POLITICS",
  "ONLINE_GAMBLING_AND_GAMING",
];

interface ValidationError {
  path: string;
  message: string;
}

function err(errors: ValidationError[], path: string, message: string) {
  errors.push({ path, message });
}

function validate(config: Record<string, unknown>, configDir: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // campaign
  const campaign = config.campaign as Record<string, unknown> | undefined;
  if (!campaign) {
    err(errors, "campaign", "missing");
    return errors;
  }
  if (!campaign.name || typeof campaign.name !== "string") {
    err(errors, "campaign.name", "required string");
  }
  if (!campaign.objective) {
    err(errors, "campaign.objective", "required");
  } else if (!VALID_OBJECTIVES.includes(campaign.objective as string)) {
    err(errors, "campaign.objective", `must be one of ${VALID_OBJECTIVES.join(", ")}`);
  }
  if (typeof campaign.dailyBudgetUsd !== "number" || campaign.dailyBudgetUsd < 1) {
    err(errors, "campaign.dailyBudgetUsd", "must be a positive number (>= 1)");
  }
  const specialCats = campaign.specialAdCategories as string[] | undefined;
  if (specialCats) {
    for (const c of specialCats) {
      if (!VALID_SPECIAL_AD_CATEGORIES.includes(c)) {
        err(
          errors,
          "campaign.specialAdCategories",
          `unknown category "${c}". Valid: ${VALID_SPECIAL_AD_CATEGORIES.join(", ")} (or [])`
        );
      }
    }
  }

  // adSet
  const adSet = config.adSet as Record<string, unknown> | undefined;
  if (!adSet) {
    err(errors, "adSet", "missing");
    return errors;
  }
  if (!adSet.name || typeof adSet.name !== "string") {
    err(errors, "adSet.name", "required string");
  }
  if (!Array.isArray(adSet.geoTargets) || adSet.geoTargets.length === 0) {
    err(errors, "adSet.geoTargets", "must be a non-empty array");
  }
  if (!Array.isArray(adSet.interests)) {
    err(errors, "adSet.interests", "must be an array (can be empty)");
  }
  if (typeof adSet.ageMin !== "number" || (adSet.ageMin as number) < 18) {
    err(errors, "adSet.ageMin", "must be a number >= 18");
  }
  if (typeof adSet.ageMax !== "number" || (adSet.ageMax as number) > 65) {
    err(errors, "adSet.ageMax", "must be a number <= 65");
  }
  if (
    typeof adSet.ageMin === "number" &&
    typeof adSet.ageMax === "number" &&
    (adSet.ageMin as number) > (adSet.ageMax as number)
  ) {
    err(errors, "adSet.age", "ageMin must be <= ageMax");
  }
  if (
    !adSet.optimizationGoal ||
    !VALID_OPTIMIZATION_GOALS.includes(adSet.optimizationGoal as string)
  ) {
    err(
      errors,
      "adSet.optimizationGoal",
      `must be one of ${VALID_OPTIMIZATION_GOALS.join(", ")}`
    );
  }
  if (
    !adSet.billingEvent ||
    !VALID_BILLING_EVENTS.includes(adSet.billingEvent as string)
  ) {
    err(errors, "adSet.billingEvent", `must be one of ${VALID_BILLING_EVENTS.join(", ")}`);
  }
  const placements = adSet.placements as
    | { facebook?: string[]; instagram?: string[] }
    | undefined;
  if (placements?.facebook) {
    for (const p of placements.facebook) {
      if (!VALID_FB_POSITIONS.includes(p)) {
        err(
          errors,
          "adSet.placements.facebook",
          `unknown position "${p}". Valid: ${VALID_FB_POSITIONS.join(", ")}`
        );
      }
    }
  }
  if (placements?.instagram) {
    for (const p of placements.instagram) {
      if (!VALID_IG_POSITIONS.includes(p)) {
        err(
          errors,
          "adSet.placements.instagram",
          `unknown position "${p}". Valid: ${VALID_IG_POSITIONS.join(", ")}`
        );
      }
    }
  }

  // ads
  const ads = config.ads as Record<string, unknown>[] | undefined;
  if (!Array.isArray(ads) || ads.length === 0) {
    err(errors, "ads", "must be a non-empty array");
    return errors;
  }
  ads.forEach((ad, i) => {
    const p = `ads[${i}]`;
    if (!ad.name) err(errors, `${p}.name`, "required string");
    if (!ad.image) err(errors, `${p}.image`, "required string (path to image file)");
    else {
      const candidates = [
        path.isAbsolute(ad.image as string) ? (ad.image as string) : null,
        path.resolve(configDir, "../../..", ad.image as string),
        path.resolve(configDir, "../..", ad.image as string),
        path.resolve(configDir, ad.image as string),
        path.resolve(process.cwd(), ad.image as string),
      ].filter(Boolean) as string[];
      if (!candidates.some((c) => fs.existsSync(c))) {
        err(errors, `${p}.image`, `file not found at ${ad.image}`);
      }
    }
    if (!ad.headline || typeof ad.headline !== "string") {
      err(errors, `${p}.headline`, "required string");
    } else if ((ad.headline as string).length > 40) {
      err(errors, `${p}.headline`, `max 40 chars (got ${(ad.headline as string).length})`);
    }
    if (!ad.primaryText || typeof ad.primaryText !== "string") {
      err(errors, `${p}.primaryText`, "required string");
    } else if ((ad.primaryText as string).length > 125) {
      err(
        errors,
        `${p}.primaryText`,
        `max 125 chars recommended (got ${(ad.primaryText as string).length}, may truncate)`
      );
    }
    if (!ad.cta) err(errors, `${p}.cta`, "required");
    else if (!VALID_CTAS.includes(ad.cta as string)) {
      err(errors, `${p}.cta`, `unknown CTA. Valid: ${VALID_CTAS.join(", ")}`);
    }
    if (!ad.linkUrl || typeof ad.linkUrl !== "string") {
      err(errors, `${p}.linkUrl`, "required string");
    } else if (!(ad.linkUrl as string).startsWith("https://")) {
      err(errors, `${p}.linkUrl`, "must be an https:// URL");
    }
  });

  return errors;
}

const file = process.argv[2];
if (!file) {
  console.error("Usage: npx tsx ads/scripts/validate-meta.ts <campaign-config.json>");
  process.exit(1);
}

if (!fs.existsSync(file)) {
  console.error(`File not found: ${file}`);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(file, "utf-8"));
const configDir = path.dirname(path.resolve(file));
const errors = validate(config, configDir);

if (errors.length > 0) {
  console.error(`✗ ${errors.length} validation error${errors.length > 1 ? "s" : ""}:`);
  for (const e of errors) console.error(`  ${e.path}: ${e.message}`);
  process.exit(1);
}

console.log(`✓ ${file} is valid`);
