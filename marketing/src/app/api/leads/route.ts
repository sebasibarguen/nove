// ABOUTME: POST endpoint for lead capture.
// ABOUTME: Receives email + UTM params, creates Brevo contact. Returns OK even if Brevo is unconfigured.

import { NextResponse } from "next/server";
import { createContact } from "@/lib/brevo";

interface LeadPayload {
  email: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  landingSlug: string;
}

export async function POST(request: Request) {
  const body = (await request.json()) as LeadPayload;

  if (!body.email || !body.email.includes("@")) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }

  // Always return success to the user — don't block the conversion on Brevo errors
  try {
    await createContact({
      email: body.email,
      utmSource: body.utmSource ?? "",
      utmMedium: body.utmMedium ?? "",
      utmCampaign: body.utmCampaign ?? "",
      landingSlug: body.landingSlug ?? "",
    });
  } catch (err) {
    // Log but don't fail — the lead is captured in server logs at minimum
    console.error("Brevo error (lead still accepted):", err);
  }

  return NextResponse.json({ ok: true });
}
