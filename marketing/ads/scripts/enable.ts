// ABOUTME: Enables a paused Google Ads campaign by name.
// ABOUTME: Run with: npx tsx ads/scripts/enable.ts "Nove - Salud General"

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

async function enable(campaignName: string) {
  checkEnv();

  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!;
  const baseUrl = `https://googleads.googleapis.com/v23/customers/${customerId}`;
  const accessToken = await getAccessToken();
  const headers = buildHeaders(accessToken);

  // Find campaign by name
  const searchRes = await fetch(`${baseUrl}/googleAds:searchStream`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      query: `SELECT campaign.resource_name, campaign.name, campaign.status FROM campaign WHERE campaign.name = '${campaignName}'`,
    }),
  });

  if (!searchRes.ok) {
    throw new Error(`Search failed: ${await searchRes.text()}`);
  }

  const searchData = await searchRes.json();
  const results = searchData[0]?.results;

  if (!results || results.length === 0) {
    console.error(`Campaign "${campaignName}" not found.`);
    process.exit(1);
  }

  const campaign = results[0].campaign;
  console.log(`Found: ${campaign.name} (${campaign.status})`);

  if (campaign.status === "ENABLED") {
    console.log("Campaign is already enabled.");
    return;
  }

  // Enable the campaign
  const mutateRes = await fetch(`${baseUrl}/campaigns:mutate`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      operations: [
        {
          update: {
            resourceName: campaign.resourceName,
            status: "ENABLED",
          },
          updateMask: "status",
        },
      ],
    }),
  });

  if (!mutateRes.ok) {
    throw new Error(`Enable failed: ${await mutateRes.text()}`);
  }

  console.log(`✓ Campaign "${campaignName}" is now ENABLED.`);
}

const name = process.argv[2];
if (!name) {
  console.error('Usage: npx tsx ads/scripts/enable.ts "Campaign Name"');
  process.exit(1);
}

enable(name).catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
