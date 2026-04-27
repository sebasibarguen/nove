// ABOUTME: Deploys a Meta Ads campaign from a JSON config — campaign + ad set + N ads, all PAUSED.
// ABOUTME: Run with: npx tsx ads/scripts/deploy-meta.ts ads/campaigns/pulse-meta-tier1.json

import fs from "fs";
import path from "path";

import {
  adAccountId,
  checkEnv,
  metaDelete,
  metaPost,
  searchGeo,
  searchInterest,
  uploadImage,
} from "./lib/meta-api";

interface GeoTarget {
  name: string;
  region?: string;
  countryCode?: string;
}

interface MetaCampaignConfig {
  campaign: {
    name: string;
    objective: string;
    dailyBudgetUsd: number;
    specialAdCategories?: string[];
    status?: string;
  };
  adSet: {
    name: string;
    geoTargets: (string | GeoTarget)[];
    interests: string[];
    ageMin: number;
    ageMax: number;
    placements?: {
      facebook?: string[];
      instagram?: string[];
    };
    optimizationGoal: string;
    billingEvent: string;
    pixelId?: string;
    customEventType?: string;
  };
  ads: {
    name: string;
    image: string;
    headline: string;
    primaryText: string;
    description?: string;
    cta: string;
    linkUrl: string;
  }[];
}

interface CreateResponse {
  id: string;
}

function resolveImagePath(configDir: string, imagePath: string): string {
  if (path.isAbsolute(imagePath) && fs.existsSync(imagePath)) return imagePath;
  const candidates = [
    path.resolve(configDir, "../../..", imagePath),
    path.resolve(configDir, "../..", imagePath),
    path.resolve(configDir, imagePath),
    path.resolve(process.cwd(), imagePath),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error(`Image not found: ${imagePath}`);
}

function normalizeGeo(g: string | GeoTarget): GeoTarget {
  if (typeof g === "string") {
    const parts = g.split(",").map((p) => p.trim());
    return {
      name: parts[0],
      region: parts[1],
      countryCode: "US",
    };
  }
  return { countryCode: "US", ...g };
}

async function deploy(filePath: string): Promise<void> {
  checkEnv();

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const config: MetaCampaignConfig = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const configDir = path.dirname(path.resolve(filePath));
  const account = adAccountId();
  const pageId = process.env.META_PAGE_ID!;

  console.log(`Deploying to Meta ad account: ${account}`);
  console.log(`Campaign: ${config.campaign.name}`);
  console.log(`Daily budget: $${config.campaign.dailyBudgetUsd}`);
  console.log(`Geo: ${config.adSet.geoTargets.map((g) => (typeof g === "string" ? g : g.name)).join(", ")}`);
  console.log(`Ad variants: ${config.ads.length}`);
  console.log("");

  // Step 1 — resolve geo names → city keys
  const geoCities: { key: string }[] = [];
  for (const g of config.adSet.geoTargets) {
    const target = normalizeGeo(g);
    const result = await searchGeo(target.name, {
      region: target.region,
      countryCode: target.countryCode,
    });
    geoCities.push({ key: result.key });
    console.log(`  geo: ${target.name}${target.region ? `, ${target.region}` : ""} → ${result.key}`);
  }

  // Step 2 — resolve interest names → interest IDs
  const interests: { id: string; name: string }[] = [];
  for (const interestName of config.adSet.interests) {
    const result = await searchInterest(interestName);
    interests.push({ id: result.id, name: result.name });
    console.log(`  interest: ${interestName} → ${result.id} (${result.name})`);
  }
  console.log("");

  // Track created resources so we can roll back on partial failure.
  const createdIds: string[] = [];

  async function rollback(reason: Error): Promise<never> {
    if (createdIds.length > 0) {
      console.error(`\nRolling back ${createdIds.length} created resource(s)...`);
      for (const id of [...createdIds].reverse()) {
        try {
          await metaDelete(id);
          console.error(`  deleted ${id}`);
        } catch (delErr) {
          console.error(`  ✗ failed to delete ${id}: ${(delErr as Error).message}`);
        }
      }
    }
    throw reason;
  }

  async function tracked<T extends CreateResponse>(p: Promise<T>): Promise<T> {
    try {
      const result = await p;
      createdIds.push(result.id);
      return result;
    } catch (err) {
      return rollback(err as Error);
    }
  }

  // Step 3 — create campaign
  const campaign = await tracked(
    metaPost<CreateResponse>(`${account}/campaigns`, {
      name: config.campaign.name,
      objective: config.campaign.objective,
      status: config.campaign.status ?? "PAUSED",
      special_ad_categories: config.campaign.specialAdCategories ?? [],
      is_adset_budget_sharing_enabled: false,
    })
  );
  console.log(`✓ Campaign created: ${campaign.id}`);

  // Step 4 — build targeting and create ad set
  const targeting: Record<string, unknown> = {
    geo_locations: { cities: geoCities },
    age_min: config.adSet.ageMin,
    age_max: config.adSet.ageMax,
    publisher_platforms: [] as string[],
  };
  if (interests.length > 0) {
    targeting.interests = interests;
  }
  targeting.targeting_automation = { advantage_audience: 0 };
  const platforms: string[] = [];
  if (config.adSet.placements?.facebook?.length) {
    platforms.push("facebook");
    targeting.facebook_positions = config.adSet.placements.facebook;
  }
  if (config.adSet.placements?.instagram?.length) {
    platforms.push("instagram");
    targeting.instagram_positions = config.adSet.placements.instagram;
  }
  if (platforms.length === 0) {
    platforms.push("facebook", "instagram");
  }
  targeting.publisher_platforms = platforms;

  const adSetBody: Record<string, unknown> = {
    name: config.adSet.name,
    campaign_id: campaign.id,
    daily_budget: config.campaign.dailyBudgetUsd * 100,
    billing_event: config.adSet.billingEvent,
    optimization_goal: config.adSet.optimizationGoal,
    bid_strategy: "LOWEST_COST_WITHOUT_CAP",
    targeting,
    status: config.campaign.status ?? "PAUSED",
  };
  if (config.adSet.pixelId || process.env.NEXT_PUBLIC_META_PIXEL_ID) {
    const pixel = config.adSet.pixelId ?? process.env.NEXT_PUBLIC_META_PIXEL_ID;
    const promoted: Record<string, string> = { pixel_id: pixel! };
    if (config.adSet.customEventType) {
      promoted.custom_event_type = config.adSet.customEventType;
    }
    adSetBody.promoted_object = promoted;
  }

  const adSet = await tracked(metaPost<CreateResponse>(`${account}/adsets`, adSetBody));
  console.log(`✓ Ad set created: ${adSet.id}`);
  console.log("");

  // Step 5 — for each ad: upload image, create creative, create ad
  for (const ad of config.ads) {
    const imagePath = resolveImagePath(configDir, ad.image);
    let image;
    try {
      image = await uploadImage(imagePath);
    } catch (err) {
      await rollback(err as Error);
    }
    console.log(`  ✓ Uploaded image ${path.basename(imagePath)} → ${image!.hash}`);

    const creative = await tracked(
      metaPost<CreateResponse>(`${account}/adcreatives`, {
        name: `${ad.name} — creative`,
        object_story_spec: {
          page_id: pageId,
          link_data: {
            image_hash: image!.hash,
            link: ad.linkUrl,
            message: ad.primaryText,
            name: ad.headline,
            description: ad.description,
            call_to_action: {
              type: ad.cta,
              value: { link: ad.linkUrl },
            },
          },
        },
      })
    );
    console.log(`  ✓ Creative created: ${creative.id}`);

    const adResult = await tracked(
      metaPost<CreateResponse>(`${account}/ads`, {
        name: ad.name,
        adset_id: adSet.id,
        creative: { creative_id: creative.id },
        status: config.campaign.status ?? "PAUSED",
      })
    );
    console.log(`  ✓ Ad created: ${adResult.id} (${ad.name})`);
  }

  console.log("");
  console.log(`✓ Deployed campaign "${config.campaign.name}" (status: PAUSED)`);
  console.log(`  Review and enable in Ads Manager:`);
  console.log(`  https://business.facebook.com/adsmanager/manage/campaigns?act=${account.replace("act_", "")}`);
}

const file = process.argv[2];
if (!file) {
  console.error("Usage: npx tsx ads/scripts/deploy-meta.ts <campaign-config.json>");
  process.exit(1);
}

deploy(file).catch((err) => {
  console.error("\nDeploy failed:", err.message);
  process.exit(1);
});
