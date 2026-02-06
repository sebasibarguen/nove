// ABOUTME: POST endpoint for lead capture.
// ABOUTME: Receives email + UTM params, creates Brevo contact.

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

  try {
    await createContact({
      email: body.email,
      utmSource: body.utmSource ?? "",
      utmMedium: body.utmMedium ?? "",
      utmCampaign: body.utmCampaign ?? "",
      landingSlug: body.landingSlug ?? "",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Lead capture error:", err);
    return NextResponse.json({ error: "Error al registrar" }, { status: 500 });
  }
}
