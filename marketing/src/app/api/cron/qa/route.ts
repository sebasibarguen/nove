// ABOUTME: QA health check cron job — verifies all pages and lead API are up.
// ABOUTME: Sends email alert via Brevo if any check fails.

import { NextResponse } from "next/server";

const PAGES = [
  "https://nove.health",
  "https://nove.health/salud",
  "https://nove.health/analiza",
  "https://nove.health/privacy",
  "https://nove.health/terms",
  "https://nove.health/success",
];

async function checkPage(url: string): Promise<{ url: string; ok: boolean; status: number }> {
  try {
    const res = await fetch(url, { method: "HEAD", next: { revalidate: 0 } });
    return { url, ok: res.ok, status: res.status };
  } catch {
    return { url, ok: false, status: 0 };
  }
}

async function checkLeadApi(): Promise<{ ok: boolean; status: number }> {
  try {
    const res = await fetch("https://nove.health/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "invalid" }),
    });
    // Expect 400 for invalid email — means the API is responding
    return { ok: res.status === 400, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

async function sendAlert(subject: string, body: string) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error("No BREVO_API_KEY — cannot send alert");
    return;
  }

  await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: "Nove QA", email: "qa@nove.health" },
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

  const pageResults = await Promise.all(PAGES.map(checkPage));
  const apiResult = await checkLeadApi();

  const failures = pageResults.filter((r) => !r.ok);
  const apiOk = apiResult.ok;

  const allOk = failures.length === 0 && apiOk;

  if (!allOk) {
    const lines = [];
    for (const f of failures) {
      lines.push(`FAIL: ${f.url} — status ${f.status}`);
    }
    if (!apiOk) {
      lines.push(`FAIL: /api/leads — status ${apiResult.status} (expected 400)`);
    }
    const body = `QA failures detected:\n\n${lines.join("\n")}`;
    console.error(body);
    await sendAlert("🔴 Nove QA Failed", body);
  }

  return NextResponse.json({
    ok: allOk,
    timestamp: new Date().toISOString(),
    pages: pageResults,
    leadApi: { ...apiResult, expected: 400 },
  });
}
