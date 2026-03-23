// ABOUTME: OAuth 2.0 flow to obtain a Google Ads API refresh token.
// ABOUTME: Opens browser, catches callback on localhost:3456, prints refresh token.

import http from "http";
import { URL } from "url";

const SCOPES = "https://www.googleapis.com/auth/adwords";
const REDIRECT_URI = "http://localhost:3456/callback";

const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error("Set GOOGLE_ADS_CLIENT_ID and GOOGLE_ADS_CLIENT_SECRET in .env first.");
  process.exit(1);
}

const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.searchParams.set("client_id", clientId);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("scope", SCOPES);
authUrl.searchParams.set("access_type", "offline");
authUrl.searchParams.set("prompt", "consent");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url!, `http://localhost:3456`);
  if (url.pathname !== "/callback") {
    res.writeHead(404);
    res.end();
    return;
  }

  const code = url.searchParams.get("code");
  if (!code) {
    res.writeHead(400);
    res.end("Missing code parameter");
    return;
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const data = await tokenRes.json();

    if (data.refresh_token) {
      console.log("\n=== Add this to your .env ===\n");
      console.log(`GOOGLE_ADS_REFRESH_TOKEN=${data.refresh_token}`);
      console.log("");
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<h1>Done! You can close this tab.</h1><p>Refresh token printed in terminal.</p>");
    } else {
      console.error("No refresh_token in response:", data);
      res.writeHead(500);
      res.end("Failed to get refresh token. Check terminal.");
    }
  } catch (err) {
    console.error("Token exchange failed:", err);
    res.writeHead(500);
    res.end("Token exchange failed. Check terminal.");
  }

  server.close();
});

server.listen(3456, () => {
  console.log("Opening browser for Google OAuth...\n");
  import("child_process").then(({ exec }) => {
    exec(`open "${authUrl.toString()}"`);
  });
});
