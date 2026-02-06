// ABOUTME: Deploys a Google Ads campaign from a JSON config file.
// ABOUTME: Run with: npx tsx ads/scripts/deploy.ts ads/campaigns/salud-general.json

import fs from "fs";

// Required env vars:
// GOOGLE_ADS_DEVELOPER_TOKEN - from Google Ads API Center
// GOOGLE_ADS_CLIENT_ID       - OAuth client ID
// GOOGLE_ADS_CLIENT_SECRET   - OAuth client secret
// GOOGLE_ADS_REFRESH_TOKEN   - OAuth refresh token
// GOOGLE_ADS_CUSTOMER_ID     - Google Ads account ID (no dashes)

const REQUIRED_ENV = [
  "GOOGLE_ADS_DEVELOPER_TOKEN",
  "GOOGLE_ADS_CLIENT_ID",
  "GOOGLE_ADS_CLIENT_SECRET",
  "GOOGLE_ADS_REFRESH_TOKEN",
  "GOOGLE_ADS_CUSTOMER_ID",
];

function checkEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error("Missing environment variables:");
    for (const key of missing) console.error(`  - ${key}`);
    console.error("\nSee ads/README.md for setup instructions.");
    process.exit(1);
  }
}

async function getAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to get access token: ${await res.text()}`);
  }

  const data = await res.json();
  return data.access_token;
}

async function googleAdsRequest(
  accessToken: string,
  endpoint: string,
  body: Record<string, unknown>
) {
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!;
  const baseUrl = `https://googleads.googleapis.com/v18/customers/${customerId}`;

  const res = await fetch(`${baseUrl}/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Google Ads API error (${endpoint}): ${error}`);
  }

  return res.json();
}

async function deploy(filePath: string) {
  checkEnv();

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const accessToken = await getAccessToken();

  console.log(`Deploying campaign: ${config.campaign.name}`);
  console.log(`Budget: Q${config.campaign.dailyBudgetGtq}/day`);
  console.log(`Geo: ${config.campaign.geoTargets.join(", ")}`);
  console.log(`Ad groups: ${config.adGroups.length}`);

  // Step 1: Create campaign budget
  const budgetResult = await googleAdsRequest(accessToken, "campaignBudgets:mutate", {
    operations: [
      {
        create: {
          name: `${config.campaign.name} Budget`,
          amountMicros: String(config.campaign.dailyBudgetGtq * 1_000_000),
          deliveryMethod: "STANDARD",
        },
      },
    ],
  });
  const budgetResource = budgetResult.results[0].resourceName;
  console.log(`✓ Created budget: ${budgetResource}`);

  // Step 2: Create campaign
  const campaignResult = await googleAdsRequest(accessToken, "campaigns:mutate", {
    operations: [
      {
        create: {
          name: config.campaign.name,
          advertisingChannelType: "SEARCH",
          status: "PAUSED",
          campaignBudget: budgetResource,
          networkSettings: {
            targetGoogleSearch: true,
            targetSearchNetwork: false,
            targetContentNetwork: false,
          },
        },
      },
    ],
  });
  const campaignResource = campaignResult.results[0].resourceName;
  console.log(`✓ Created campaign: ${campaignResource}`);

  // Step 3: Create ad groups and ads
  for (const group of config.adGroups) {
    const groupResult = await googleAdsRequest(accessToken, "adGroups:mutate", {
      operations: [
        {
          create: {
            name: group.name,
            campaign: campaignResource,
            status: "ENABLED",
            type: "SEARCH_STANDARD",
          },
        },
      ],
    });
    const groupResource = groupResult.results[0].resourceName;
    console.log(`  ✓ Created ad group: ${group.name}`);

    // Add keywords
    const keywordOps = group.keywords.map(
      (kw: { text: string; matchType: string }) => ({
        create: {
          adGroup: groupResource,
          keyword: {
            text: kw.text,
            matchType: kw.matchType,
          },
          status: "ENABLED",
        },
      })
    );
    await googleAdsRequest(accessToken, "adGroupCriteria:mutate", {
      operations: keywordOps,
    });
    console.log(`    ✓ Added ${group.keywords.length} keywords`);

    // Create ads
    for (const ad of group.ads) {
      await googleAdsRequest(accessToken, "adGroupAds:mutate", {
        operations: [
          {
            create: {
              adGroup: groupResource,
              status: "ENABLED",
              ad: {
                responsiveSearchAd: {
                  headlines: ad.headlines.map((h: string, i: number) => ({
                    text: h,
                    pinnedField: i === 0 ? "HEADLINE_1" : undefined,
                  })),
                  descriptions: ad.descriptions.map((d: string) => ({
                    text: d,
                  })),
                },
                finalUrls: [ad.finalUrl],
              },
            },
          },
        ],
      });
      console.log(`    ✓ Created responsive search ad`);
    }
  }

  console.log(`\n✓ Campaign "${config.campaign.name}" deployed (status: PAUSED)`);
  console.log("  Enable it in Google Ads dashboard when ready to go live.");
}

// CLI entry point
const file = process.argv[2];
if (!file) {
  console.error("Usage: npx tsx ads/scripts/deploy.ts <campaign-config.json>");
  process.exit(1);
}

deploy(file).catch((err) => {
  console.error("Deploy failed:", err.message);
  process.exit(1);
});
