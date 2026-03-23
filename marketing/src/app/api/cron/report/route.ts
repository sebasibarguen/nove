// ABOUTME: Daily campaign report + Gemini analysis cron job.
// ABOUTME: Gathers ads data, landing copy, sends to Gemini, emails results via Brevo.

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const maxDuration = 60;

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
  if (!res.ok) throw new Error("Failed to get access token");
  const data = await res.json();
  return data.access_token;
}

async function queryAds(accessToken: string, gaql: string): Promise<Record<string, unknown>[]> {
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    "Content-Type": "application/json",
  };
  if (process.env.GOOGLE_ADS_MCC_ID) {
    headers["login-customer-id"] = process.env.GOOGLE_ADS_MCC_ID;
  }

  const res = await fetch(
    `https://googleads.googleapis.com/v23/customers/${customerId}/googleAds:searchStream`,
    { method: "POST", headers, body: JSON.stringify({ query: gaql }) }
  );
  if (!res.ok) throw new Error(`Ads query failed`);
  const data = await res.json();
  return data[0]?.results ?? [];
}

function dateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

async function gatherAdsData(accessToken: string): Promise<string> {
  const today = dateDaysAgo(0);
  const startDate = dateDaysAgo(7);
  const dateRange = `segments.date BETWEEN '${startDate}' AND '${today}'`;
  const sections: string[] = [];

  const campaigns = await queryAds(
    accessToken,
    `SELECT campaign.name, campaign.status, campaign_budget.amount_micros,
            metrics.impressions, metrics.clicks, metrics.ctr, metrics.average_cpc,
            metrics.cost_micros, metrics.conversions
     FROM campaign WHERE ${dateRange} ORDER BY metrics.cost_micros DESC`
  );

  sections.push("## Campaign Performance (7 days)\n");
  for (const row of campaigns) {
    const c = row.campaign as Record<string, string>;
    const m = row.metrics as Record<string, string | number>;
    sections.push(
      `- **${c.name}** (${c.status}): ${m.impressions} impr, ${m.clicks} clicks, ` +
        `CTR ${(Number(m.ctr) * 100).toFixed(2)}%, CPC $${(Number(m.averageCpc) / 1e6).toFixed(2)}, ` +
        `Spend $${(Number(m.costMicros) / 1e6).toFixed(2)}, ${m.conversions} conv`
    );
  }

  const searchTerms = await queryAds(
    accessToken,
    `SELECT search_term_view.search_term, metrics.impressions, metrics.clicks, metrics.ctr
     FROM search_term_view WHERE segments.date DURING LAST_7_DAYS AND metrics.impressions > 0
     ORDER BY metrics.impressions DESC LIMIT 20`
  );

  sections.push("\n## Top Search Terms\n");
  for (const row of searchTerms) {
    const st = row.searchTermView as Record<string, string>;
    const m = row.metrics as Record<string, string | number>;
    sections.push(`- "${st.searchTerm}": ${m.impressions} impr, ${m.clicks} clicks`);
  }

  const keywords = await queryAds(
    accessToken,
    `SELECT ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type,
            metrics.impressions, metrics.clicks
     FROM keyword_view WHERE ${dateRange} AND metrics.impressions > 0
     ORDER BY metrics.clicks DESC LIMIT 15`
  );

  sections.push("\n## Keyword Performance\n");
  for (const row of keywords) {
    const kw = row.adGroupCriterion as { keyword: Record<string, string> };
    const m = row.metrics as Record<string, string | number>;
    sections.push(`- [${kw.keyword.matchType}] "${kw.keyword.text}": ${m.impressions} impr, ${m.clicks} clicks`);
  }

  const daily = await queryAds(
    accessToken,
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
      `- ${date}: ${d.impressions} impr, ${d.clicks} clicks, $${(d.cost / 1e6).toFixed(2)}, ${d.conversions} conv`
    );
  }

  return sections.join("\n");
}

function gatherLandingCopy(): string {
  const configsDir = path.join(process.cwd(), "src", "configs");
  const sections: string[] = ["## Landing Page Copy\n"];

  for (const file of ["salud.json", "analiza.json"]) {
    const filePath = path.join(configsDir, file);
    if (!fs.existsSync(filePath)) continue;
    const config = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    sections.push(`### /${config.slug}`);
    sections.push(`Hero: ${config.hero.headline} — ${config.hero.subheadline}`);
    sections.push(`CTA: ${config.hero.ctaText}\n`);
  }

  return sections.join("\n");
}

async function askGemini(context: string): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_API_KEY!;

  const prompt = `You are a performance marketer reviewing a Google Ads campaign for Nove, a health tech startup in Guatemala ($350/year subscription).

Campaign data and landing page copy:

---
${context}
---

Give a concise daily briefing:
1. Key metrics summary (1-2 lines)
2. What changed vs previous days
3. Top 3 actionable recommendations for today

Be specific, reference numbers and search terms. Max 500 words.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2048, temperature: 0.5 },
      }),
    }
  );

  if (!res.ok) {
    const error = await res.text();
    return `Gemini unavailable: ${error.slice(0, 200)}`;
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response from Gemini.";
}

async function sendReport(subject: string, body: string) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return;

  await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { name: "Nove Ads Report", email: "ads@nove.health" },
      to: [{ email: "sebas@nove.health" }],
      subject,
      textContent: body,
    }),
  });
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = await getAccessToken();
  const adsData = await gatherAdsData(accessToken);
  const landingCopy = gatherLandingCopy();
  const context = [adsData, landingCopy].join("\n\n---\n\n");

  const analysis = await askGemini(context);

  const fullReport = `${adsData}\n\n---\n\n## AI Analysis\n\n${analysis}`;

  await sendReport(
    `📊 Nove Ads Daily Report — ${new Date().toISOString().slice(0, 10)}`,
    fullReport
  );

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    report: fullReport,
  });
}
