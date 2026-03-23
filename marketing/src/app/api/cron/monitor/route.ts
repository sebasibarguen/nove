// ABOUTME: Campaign monitor cron job — checks Google Ads campaign health.
// ABOUTME: Alerts via Brevo if campaigns are down, overspending, or CTR drops.

import { NextResponse } from "next/server";

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
  if (!res.ok) throw new Error(`Ads query failed: ${await res.text()}`);
  const data = await res.json();
  return data[0]?.results ?? [];
}

async function sendAlert(subject: string, body: string) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return;

  await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { name: "Nove Ads", email: "ads@nove.health" },
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

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  let accessToken: string;
  try {
    accessToken = await getAccessToken();
  } catch (err) {
    return NextResponse.json({ ok: false, error: "Failed to get access token" }, { status: 500 });
  }

  const campaigns = await queryAds(
    accessToken,
    `SELECT campaign.name, campaign.status, campaign.serving_status, campaign.primary_status,
            metrics.impressions, metrics.clicks, metrics.ctr, metrics.cost_micros
     FROM campaign
     WHERE segments.date = '${today}' AND campaign.status = 'ENABLED'`
  );

  const issues: string[] = [];
  const summary: Record<string, unknown>[] = [];

  for (const row of campaigns) {
    const c = row.campaign as Record<string, string>;
    const m = row.metrics as Record<string, string | number>;
    const spend = Number(m.costMicros) / 1e6;
    const ctr = Number(m.ctr);

    summary.push({
      name: c.name,
      status: c.servingStatus,
      impressions: m.impressions,
      clicks: m.clicks,
      spend: `$${spend.toFixed(2)}`,
    });

    if (c.servingStatus !== "SERVING") {
      issues.push(`${c.name}: not serving (${c.servingStatus}, primary: ${c.primaryStatus})`);
    }
    if (spend > 8) {
      issues.push(`${c.name}: overspending — $${spend.toFixed(2)} today (target $5)`);
    }
    if (Number(m.impressions) > 50 && ctr < 0.01) {
      issues.push(`${c.name}: low CTR ${(ctr * 100).toFixed(2)}% on ${m.impressions} impressions`);
    }
  }

  if (issues.length > 0) {
    const body = `Campaign issues detected:\n\n${issues.join("\n")}\n\nFull status:\n${JSON.stringify(summary, null, 2)}`;
    console.warn(body);
    await sendAlert("⚠️ Nove Ads Alert", body);
  }

  return NextResponse.json({
    ok: issues.length === 0,
    timestamp: new Date().toISOString(),
    issues,
    campaigns: summary,
  });
}
