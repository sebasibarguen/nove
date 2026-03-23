// ABOUTME: Sends campaign performance + landing page copy to Gemini for review.
// ABOUTME: Run with: npx tsx ads/scripts/review.ts [--days=7]

import fs from "fs";
import path from "path";

const REQUIRED_ENV = [
  "GOOGLE_ADS_DEVELOPER_TOKEN",
  "GOOGLE_ADS_CLIENT_ID",
  "GOOGLE_ADS_CLIENT_SECRET",
  "GOOGLE_ADS_REFRESH_TOKEN",
  "GOOGLE_ADS_CUSTOMER_ID",
  "GOOGLE_AI_API_KEY",
];

function checkEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error("Missing environment variables:");
    for (const key of missing) console.error(`  - ${key}`);
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
  if (!res.ok) throw new Error(`Failed to get access token: ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

function buildHeaders(accessToken: string): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    "Content-Type": "application/json",
  };
  if (process.env.GOOGLE_ADS_MCC_ID) {
    headers["login-customer-id"] = process.env.GOOGLE_ADS_MCC_ID;
  }
  return headers;
}

async function queryAds(
  baseUrl: string,
  headers: Record<string, string>,
  gaql: string
): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${baseUrl}/googleAds:searchStream`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query: gaql }),
  });
  if (!res.ok) throw new Error(`Query failed: ${await res.text()}`);
  const data = await res.json();
  return data[0]?.results ?? [];
}

function dateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

async function gatherCampaignData(days: number): Promise<string> {
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!;
  const baseUrl = `https://googleads.googleapis.com/v23/customers/${customerId}`;
  const accessToken = await getAccessToken();
  const headers = buildHeaders(accessToken);

  const today = dateDaysAgo(0);
  const startDate = dateDaysAgo(days);
  const dateRange = `segments.date BETWEEN '${startDate}' AND '${today}'`;

  const sections: string[] = [];

  // Campaign performance
  const campaigns = await queryAds(
    baseUrl,
    headers,
    `SELECT campaign.name, campaign.status, campaign_budget.amount_micros,
            metrics.impressions, metrics.clicks, metrics.ctr, metrics.average_cpc,
            metrics.cost_micros, metrics.conversions, metrics.cost_per_conversion
     FROM campaign WHERE ${dateRange} ORDER BY metrics.cost_micros DESC`
  );

  sections.push("## Campaign Performance (last " + days + " days)\n");
  if (campaigns.length === 0) {
    sections.push("No performance data yet.\n");
  } else {
    for (const row of campaigns) {
      const c = row.campaign as Record<string, string>;
      const m = row.metrics as Record<string, string | number>;
      const b = row.campaignBudget as Record<string, string>;
      sections.push(
        `- **${c.name}** (${c.status}): ${m.impressions} impressions, ${m.clicks} clicks, ` +
          `CTR ${(Number(m.ctr) * 100).toFixed(2)}%, Avg CPC $${(Number(m.averageCpc) / 1e6).toFixed(2)}, ` +
          `Spend $${(Number(m.costMicros) / 1e6).toFixed(2)}, ${m.conversions} conversions, ` +
          `Budget $${(Number(b.amountMicros) / 1e6).toFixed(2)}/day`
      );
    }
  }

  // Search terms
  const searchTerms = await queryAds(
    baseUrl,
    headers,
    `SELECT search_term_view.search_term, metrics.impressions, metrics.clicks, metrics.ctr, metrics.cost_micros
     FROM search_term_view WHERE segments.date DURING LAST_${days}_DAYS AND metrics.impressions > 0
     ORDER BY metrics.impressions DESC LIMIT 30`
  );

  sections.push("\n## Top Search Terms\n");
  for (const row of searchTerms) {
    const st = row.searchTermView as Record<string, string>;
    const m = row.metrics as Record<string, string | number>;
    sections.push(
      `- "${st.searchTerm}": ${m.impressions} impr, ${m.clicks} clicks, CTR ${(Number(m.ctr) * 100).toFixed(2)}%`
    );
  }

  // Keywords
  const keywords = await queryAds(
    baseUrl,
    headers,
    `SELECT ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type,
            metrics.impressions, metrics.clicks, metrics.ctr, metrics.cost_micros
     FROM keyword_view WHERE ${dateRange} AND metrics.impressions > 0
     ORDER BY metrics.clicks DESC LIMIT 20`
  );

  sections.push("\n## Keyword Performance\n");
  for (const row of keywords) {
    const kw = row.adGroupCriterion as { keyword: Record<string, string> };
    const m = row.metrics as Record<string, string | number>;
    sections.push(
      `- [${kw.keyword.matchType}] "${kw.keyword.text}": ${m.impressions} impr, ${m.clicks} clicks, CTR ${(Number(m.ctr) * 100).toFixed(2)}%`
    );
  }

  // Ad copy
  const ads = await queryAds(
    baseUrl,
    headers,
    `SELECT ad_group_ad.ad.responsive_search_ad.headlines, ad_group_ad.ad.responsive_search_ad.descriptions,
            ad_group_ad.ad.final_urls, ad_group_ad.policy_summary.approval_status,
            metrics.impressions, metrics.clicks, metrics.ctr
     FROM ad_group_ad WHERE campaign.status = 'ENABLED' AND ${dateRange}`
  );

  sections.push("\n## Active Ad Copy\n");
  for (const row of ads) {
    const ad = row.adGroupAd as Record<string, unknown>;
    const adContent = ad.ad as Record<string, unknown>;
    const rsa = adContent?.responsiveSearchAd as Record<string, unknown[]> | undefined;
    const m = row.metrics as Record<string, string | number>;
    if (rsa) {
      const headlines = (rsa.headlines as Array<{ text: string }>)?.map((h) => h.text) ?? [];
      const descriptions = (rsa.descriptions as Array<{ text: string }>)?.map((d) => d.text) ?? [];
      sections.push(`Headlines: ${headlines.join(" | ")}`);
      sections.push(`Descriptions: ${descriptions.join(" | ")}`);
      sections.push(
        `Performance: ${m.impressions} impr, ${m.clicks} clicks, CTR ${(Number(m.ctr) * 100).toFixed(2)}%`
      );
    }
  }

  // Negative keywords
  const negatives = await queryAds(
    baseUrl,
    headers,
    `SELECT campaign_criterion.keyword.text, campaign_criterion.keyword.match_type
     FROM campaign_criterion WHERE campaign_criterion.negative = true AND campaign_criterion.type = 'KEYWORD'`
  );

  sections.push("\n## Negative Keywords\n");
  for (const row of negatives) {
    const cc = row.campaignCriterion as { keyword: Record<string, string> };
    sections.push(`- [${cc.keyword.matchType}] "${cc.keyword.text}"`);
  }

  // Daily breakdown
  const daily = await queryAds(
    baseUrl,
    headers,
    `SELECT segments.date, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
     FROM campaign WHERE ${dateRange} ORDER BY segments.date DESC`
  );

  const byDate = new Map<string, { impressions: number; clicks: number; cost: number; conversions: number }>();
  for (const row of daily) {
    const date = (row.segments as Record<string, string>).date;
    const m = row.metrics as Record<string, string | number>;
    const existing = byDate.get(date) ?? { impressions: 0, clicks: 0, cost: 0, conversions: 0 };
    existing.impressions += Number(m.impressions);
    existing.clicks += Number(m.clicks);
    existing.cost += Number(m.costMicros);
    existing.conversions += Number(m.conversions);
    byDate.set(date, existing);
  }

  sections.push("\n## Daily Breakdown\n");
  for (const [date, d] of byDate) {
    sections.push(
      `- ${date}: ${d.impressions} impr, ${d.clicks} clicks, $${(d.cost / 1e6).toFixed(2)} spend, ${d.conversions} conv`
    );
  }

  return sections.join("\n");
}

function gatherLandingCopy(): string {
  const configsDir = path.resolve(__dirname, "../../src/configs");
  const sections: string[] = ["## Landing Page Copy\n"];

  const files = fs.readdirSync(configsDir).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const config = JSON.parse(fs.readFileSync(path.join(configsDir, file), "utf-8"));
    sections.push(`### /${config.slug}\n`);
    sections.push(`**Meta:** ${config.meta.title} — ${config.meta.description}\n`);
    sections.push(`**Hero:** ${config.hero.headline}`);
    sections.push(`${config.hero.subheadline}`);
    if (config.hero.stats) {
      sections.push(`Stats: ${config.hero.stats.map((s: { value: string; label: string }) => `${s.value} ${s.label}`).join(" | ")}\n`);
    }
    if (config.howItWorks) {
      sections.push(`**How it works:** ${config.howItWorks.headline}`);
      for (const step of config.howItWorks.steps) {
        sections.push(`  ${step.title}: ${step.description}`);
      }
      sections.push("");
    }
    const features = "items" in config.features ? config.features : { items: config.features };
    if (features.headline) sections.push(`**Features:** ${features.headline}`);
    for (const item of features.items) {
      sections.push(`  ${item.title}: ${item.description}`);
    }
    sections.push("");
    if (config.comparison) {
      sections.push(`**Comparison:** ${config.comparison.headline}`);
      if (config.comparison.subheadline) sections.push(`${config.comparison.subheadline}`);
      for (const row of config.comparison.rows) {
        sections.push(
          `  ${row.feature}: Nove=${row.nove ? "✓" : "✗"} Traditional=${row.traditional ? "✓" : "✗"}`
        );
      }
      sections.push("");
    }
    sections.push(`**Social proof:** ${config.socialProof.headline}`);
    for (const t of config.socialProof.testimonials) {
      sections.push(`  "${t.quote}" — ${t.name}, ${t.role}`);
    }
    sections.push("");
    sections.push(`**Footer CTA:** ${config.footerCta.headline}`);
    sections.push(`${config.footerCta.subheadline}`);
    sections.push(`Button: ${config.footerCta.ctaText}\n`);
  }

  return sections.join("\n");
}

function gatherAdConfigs(): string {
  const campaignsDir = path.resolve(__dirname, "../campaigns");
  const sections: string[] = ["## Ad Campaign Configs\n"];

  const files = fs.readdirSync(campaignsDir).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const config = JSON.parse(fs.readFileSync(path.join(campaignsDir, file), "utf-8"));
    sections.push(`### ${config.campaign.name} ($${config.campaign.dailyBudgetUsd}/day)\n`);
    for (const group of config.adGroups) {
      sections.push(`Ad Group: ${group.name}`);
      sections.push(`Keywords: ${group.keywords.map((k: { text: string; matchType: string }) => `[${k.matchType}] "${k.text}"`).join(", ")}`);
      for (const ad of group.ads) {
        sections.push(`Headlines: ${ad.headlines.join(" | ")}`);
        if (ad.longHeadlines) sections.push(`Long Headlines: ${ad.longHeadlines.join(" | ")}`);
        sections.push(`Descriptions: ${ad.descriptions.join(" | ")}`);
        sections.push(`URL: ${ad.finalUrl}`);
      }
    }
    sections.push("");
  }

  return sections.join("\n");
}

async function askGemini(context: string): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_API_KEY!;
  const model = "gemini-3.1-pro-preview";

  const prompt = `You are an expert performance marketer and conversion rate optimizer reviewing a Google Ads campaign for a health tech startup in Guatemala called Nove.

Nove is a preventive health platform ($350/year) that:
- Partners with certified labs in Guatemala
- Interprets blood test results with AI
- Tracks biomarkers over time between checkups
- Provides a 24/7 AI health coach
- Can import historical results from email and local labs
- Integrates with smartwatches (Garmin, Apple Watch, Whoop)
- Generates shareable reports for doctors

The target audience is health-conscious adults in Guatemala searching in Spanish.

Here is the complete campaign data, landing page copy, and ad configurations:

---
${context}
---

Please provide a thorough review covering:

1. **Campaign Performance Analysis** — What's working, what's not. CTR, CPC, conversion analysis.
2. **Search Term Analysis** — Are we reaching the right audience? Which terms should we double down on? Which should we exclude?
3. **Ad Copy Review** — Do headlines match search intent? Are descriptions compelling? Specific improvements.
4. **Landing Page Copy Review** — Does it match the ad promise? Is the value prop clear? Is the flow logical? Specific copy improvements.
5. **Keyword Strategy** — Missing keyword opportunities? Match type recommendations?
6. **Conversion Funnel** — Why might we have clicks but no conversions? What's the weakest link?
7. **Specific Recommendations** — Top 5 highest-impact changes to make right now, ranked by expected impact.

Be specific and actionable. Reference actual copy, numbers, and search terms. Write in English.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.7,
        },
      }),
    }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Gemini API error: ${error}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response from Gemini.";
}

async function review(days: number) {
  checkEnv();

  console.log("Gathering campaign data...");
  const campaignData = await gatherCampaignData(days);

  console.log("Gathering landing page copy...");
  const landingCopy = gatherLandingCopy();

  console.log("Gathering ad configs...");
  const adConfigs = gatherAdConfigs();

  const fullContext = [campaignData, landingCopy, adConfigs].join("\n\n---\n\n");

  console.log(`\nSending to Gemini 3.1 Pro for review (${fullContext.length} chars)...\n`);
  const review = await askGemini(fullContext);

  console.log("═".repeat(60));
  console.log("  CAMPAIGN & LANDING PAGE REVIEW — Gemini 3.1 Pro");
  console.log("═".repeat(60));
  console.log();
  console.log(review);
  console.log();
}

const args = process.argv.slice(2);
let days = 7;
for (const arg of args) {
  const match = arg.match(/^--days=(\d+)$/);
  if (match) days = Number(match[1]);
}

review(days).catch((err) => {
  console.error("Review failed:", err.message);
  process.exit(1);
});
