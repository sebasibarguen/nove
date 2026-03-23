// ABOUTME: Prints a summary report of Google Ads campaign performance.
// ABOUTME: Run with: npx tsx ads/scripts/report.ts [--days=7]

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

async function query(
  baseUrl: string,
  headers: Record<string, string>,
  gaql: string
): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${baseUrl}/googleAds:searchStream`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query: gaql }),
  });

  if (!res.ok) {
    throw new Error(`Query failed: ${await res.text()}`);
  }

  const data = await res.json();
  return data[0]?.results ?? [];
}

function formatUsd(micros: string | number): string {
  return `$${(Number(micros) / 1_000_000).toFixed(2)}`;
}

function formatPct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function dateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

async function report(days: number) {
  checkEnv();

  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!;
  const baseUrl = `https://googleads.googleapis.com/v23/customers/${customerId}`;
  const accessToken = await getAccessToken();
  const headers = buildHeaders(accessToken);

  const today = dateDaysAgo(0);
  const startDate = dateDaysAgo(days);
  const dateRange = `segments.date BETWEEN '${startDate}' AND '${today}'`;

  console.log(`\n═══ Nove Ads Report (last ${days} days) ═══\n`);

  // Campaign summary
  const campaigns = await query(
    baseUrl,
    headers,
    `SELECT
      campaign.name,
      campaign.status,
      campaign_budget.amount_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.average_cpc,
      metrics.cost_micros,
      metrics.conversions,
      metrics.cost_per_conversion
    FROM campaign
    WHERE ${dateRange}
    ORDER BY metrics.cost_micros DESC`
  );

  if (campaigns.length === 0) {
    // No data for date range, show campaign status instead
    const allCampaigns = await query(
      baseUrl,
      headers,
      `SELECT campaign.name, campaign.status, campaign_budget.amount_micros
       FROM campaign
       ORDER BY campaign.name`
    );

    if (allCampaigns.length === 0) {
      console.log("No campaigns found.");
      return;
    }

    console.log("CAMPAIGNS (no performance data yet)\n");
    console.log(
      pad("Campaign", 30) +
        pad("Status", 12) +
        pad("Budget/day", 12)
    );
    console.log("─".repeat(54));

    for (const row of allCampaigns) {
      const c = row.campaign as Record<string, string>;
      const b = row.campaignBudget as Record<string, string>;
      console.log(
        pad(c.name, 30) +
          pad(c.status, 12) +
          pad(formatUsd(b.amountMicros), 12)
      );
    }
    console.log("\nCampaigns are active but no impressions yet. Check back later.\n");
    return;
  }

  let totalImpressions = 0;
  let totalClicks = 0;
  let totalCostMicros = 0;
  let totalConversions = 0;

  console.log("CAMPAIGNS\n");
  console.log(
    pad("Campaign", 28) +
      pad("Status", 10) +
      pad("Impr", 8) +
      pad("Clicks", 8) +
      pad("CTR", 8) +
      pad("Avg CPC", 9) +
      pad("Spend", 10) +
      pad("Conv", 6) +
      pad("CPA", 10)
  );
  console.log("─".repeat(97));

  for (const row of campaigns) {
    const c = row.campaign as Record<string, string>;
    const m = row.metrics as Record<string, string | number>;
    const impressions = Number(m.impressions);
    const clicks = Number(m.clicks);
    const costMicros = Number(m.costMicros);
    const conversions = Number(m.conversions);

    totalImpressions += impressions;
    totalClicks += clicks;
    totalCostMicros += costMicros;
    totalConversions += conversions;

    console.log(
      pad(c.name, 28) +
        pad(c.status, 10) +
        pad(String(impressions), 8) +
        pad(String(clicks), 8) +
        pad(impressions > 0 ? formatPct(Number(m.ctr)) : "—", 8) +
        pad(clicks > 0 ? formatUsd(m.averageCpc) : "—", 9) +
        pad(formatUsd(costMicros), 10) +
        pad(String(conversions), 6) +
        pad(conversions > 0 ? formatUsd(m.costPerConversion) : "—", 10)
    );
  }

  console.log("─".repeat(97));
  const totalCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  const totalAvgCpc = totalClicks > 0 ? totalCostMicros / totalClicks : 0;
  const totalCpa = totalConversions > 0 ? totalCostMicros / totalConversions : 0;

  console.log(
    pad("TOTAL", 28) +
      pad("", 10) +
      pad(String(totalImpressions), 8) +
      pad(String(totalClicks), 8) +
      pad(formatPct(totalCtr), 8) +
      pad(formatUsd(totalAvgCpc), 9) +
      pad(formatUsd(totalCostMicros), 10) +
      pad(String(totalConversions), 6) +
      pad(totalConversions > 0 ? formatUsd(totalCpa) : "—", 10)
  );

  // Keyword performance
  const keywords = await query(
    baseUrl,
    headers,
    `SELECT
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.average_cpc,
      metrics.cost_micros
    FROM keyword_view
    WHERE ${dateRange}
      AND metrics.impressions > 0
    ORDER BY metrics.clicks DESC
    LIMIT 20`
  );

  if (keywords.length > 0) {
    console.log("\n\nKEYWORDS (top 20 by clicks)\n");
    console.log(
      pad("Keyword", 35) +
        pad("Match", 10) +
        pad("Impr", 8) +
        pad("Clicks", 8) +
        pad("CTR", 8) +
        pad("Avg CPC", 9) +
        pad("Spend", 10)
    );
    console.log("─".repeat(88));

    for (const row of keywords) {
      const kw = row.adGroupCriterion as { keyword: Record<string, string> };
      const m = row.metrics as Record<string, string | number>;
      console.log(
        pad(kw.keyword.text, 35) +
          pad(kw.keyword.matchType, 10) +
          pad(String(m.impressions), 8) +
          pad(String(m.clicks), 8) +
          pad(formatPct(Number(m.ctr)), 8) +
          pad(formatUsd(m.averageCpc), 9) +
          pad(formatUsd(m.costMicros), 10)
      );
    }
  }

  // Daily breakdown
  const daily = await query(
    baseUrl,
    headers,
    `SELECT
      segments.date,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions
    FROM campaign
    WHERE ${dateRange}
    ORDER BY segments.date DESC`
  );

  if (daily.length > 0) {
    console.log("\n\nDAILY BREAKDOWN\n");
    console.log(
      pad("Date", 14) +
        pad("Impr", 8) +
        pad("Clicks", 8) +
        pad("Spend", 10) +
        pad("Conv", 6)
    );
    console.log("─".repeat(46));

    // Aggregate by date
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

    for (const [date, d] of byDate) {
      console.log(
        pad(date, 14) +
          pad(String(d.impressions), 8) +
          pad(String(d.clicks), 8) +
          pad(formatUsd(d.cost), 10) +
          pad(String(d.conversions), 6)
      );
    }
  }

  console.log("");
}

function pad(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len) : str + " ".repeat(len - str.length);
}

// Parse --days flag
const args = process.argv.slice(2);
let days = 7;
for (const arg of args) {
  const match = arg.match(/^--days=(\d+)$/);
  if (match) days = Number(match[1]);
}

report(days).catch((err) => {
  console.error("Report failed:", err.message);
  process.exit(1);
});
