// ABOUTME: Thin fetch wrapper for the Brevo contacts API.
// ABOUTME: Creates contacts with UTM tracking attributes.

const BREVO_API_URL = "https://api.brevo.com/v3/contacts";

interface CreateContactParams {
  email: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  landingSlug: string;
}

export async function createContact(params: CreateContactParams) {
  const apiKey = process.env.BREVO_API_KEY;
  const listId = process.env.BREVO_LIST_ID;
  if (!apiKey || !listId) {
    throw new Error("Missing BREVO_API_KEY or BREVO_LIST_ID");
  }

  const res = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      listIds: [Number(listId)],
      attributes: {
        UTM_SOURCE: params.utmSource,
        UTM_MEDIUM: params.utmMedium,
        UTM_CAMPAIGN: params.utmCampaign,
        LANDING_SLUG: params.landingSlug,
      },
      updateEnabled: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo API error ${res.status}: ${body}`);
  }

  return res.json();
}
