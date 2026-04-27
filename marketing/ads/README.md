# Google Ads Pipeline

Deploy Google Ads campaigns from JSON config files.

## Prerequisites

### 1. Google Ads Account

- Create a Google Ads account at ads.google.com
- Note your **Customer ID** (10-digit number, format: XXX-XXX-XXXX)

### 2. Google Ads API Access

- Go to [Google Ads API Center](https://ads.google.com/aw/apicenter)
- Apply for a **Developer Token** (starts in test mode — sufficient for initial setup)

### 3. OAuth Credentials

- Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- Create an **OAuth 2.0 Client ID** (type: Desktop app)
- Note the **Client ID** and **Client Secret**
- Generate a **Refresh Token** using the OAuth Playground or gcloud CLI:

```bash
# Using Google's OAuth playground (https://developers.google.com/oauthplayground/)
# 1. Set scope: https://www.googleapis.com/auth/adwords
# 2. Authorize with your Google Ads account
# 3. Exchange authorization code for tokens
# 4. Copy the refresh_token
```

### 4. Environment Variables

```bash
export GOOGLE_ADS_DEVELOPER_TOKEN="your-developer-token"
export GOOGLE_ADS_CLIENT_ID="your-client-id.apps.googleusercontent.com"
export GOOGLE_ADS_CLIENT_SECRET="your-client-secret"
export GOOGLE_ADS_REFRESH_TOKEN="your-refresh-token"
export GOOGLE_ADS_CUSTOMER_ID="1234567890"  # no dashes
```

## Usage

### Validate a campaign config

```bash
npx tsx ads/scripts/validate.ts ads/campaigns/salud-general.json
```

### Deploy a campaign

```bash
npx tsx ads/scripts/deploy.ts ads/campaigns/salud-general.json
```

Campaigns are created in **PAUSED** status. Enable them in the Google Ads dashboard when ready.

## Campaign Config Format

```json
{
  "campaign": {
    "name": "Campaign Name",
    "dailyBudgetGtq": 100,
    "geoTargets": ["Guatemala City"],
    "language": "es"
  },
  "adGroups": [
    {
      "name": "Ad Group Name",
      "keywords": [
        { "text": "keyword phrase", "matchType": "PHRASE" }
      ],
      "ads": [
        {
          "headlines": ["Headline 1 (max 30)", "Headline 2", "Headline 3"],
          "descriptions": ["Description 1 (max 90 chars)", "Description 2"],
          "finalUrl": "https://nove.gt/salud?utm_source=google&utm_medium=cpc&utm_campaign=name"
        }
      ]
    }
  ]
}
```

### Constraints

- **Headlines**: min 3, max 30 characters each
- **Descriptions**: min 2, max 90 characters each
- **Match types**: `EXACT`, `PHRASE`, `BROAD`
- **Budget**: in GTQ (Guatemalan Quetzal), daily amount

---

# Meta Ads Pipeline

Deploy Meta (Facebook + Instagram) campaigns from a JSON config. Mirrors the Google Ads pipeline shape so the muscle memory transfers.

## Prerequisites

### 1. Meta Business Manager

- `business.facebook.com/settings` — must own a BM with the ad account claimed inside it.

### 2. Meta App (Development Mode is fine)

- `developers.facebook.com → Create App → Business type`
- Add the **Marketing API** product
- App stays in Development Mode for first-party use — **no App Review needed**.

### 3. System User + Token

In Business Settings:

1. **Accounts → Apps → Add → Add an app you own** → paste your App ID
2. **Users → System Users → Add** → name it `marketing-deploys`, role `Admin`
3. Click into the system user → **Add Assets**:
   - Apps → your app → grant `Develop`
   - Ad Accounts → your ad account → grant `Manage campaigns`
   - Pages → your Facebook Page → grant `Manage Page` (required — every ad must link to a Page)
4. **Generate New Token** → select your app → scopes: `ads_management`, `business_management` → **Token Expiration: Never** → copy the token (only shown once)

### 4. Environment Variables

```bash
export META_ACCESS_TOKEN="EAAB..."           # System user token from step 3
export META_AD_ACCOUNT_ID="act_1234567890"   # ad account ID, with or without "act_" prefix
export META_PAGE_ID="100123456789"           # Facebook Page ID (every ad needs a Page)
```

The pixel ID (`NEXT_PUBLIC_META_PIXEL_ID`) is read automatically if set — used for conversion-optimized ad sets.

## Usage

```bash
# Validate locally (no API calls)
npx tsx ads/scripts/validate-meta.ts ads/campaigns/pulse-meta-tier1.json

# Deploy (creates campaign + ad set + ads, all PAUSED)
npx tsx ads/scripts/deploy-meta.ts ads/campaigns/pulse-meta-tier1.json
```

Campaigns deploy in **PAUSED** status. Review and enable in Ads Manager when ready.

## Config Format

```jsonc
{
  "campaign": {
    "name": "Pulse - US Tier 1",
    "objective": "OUTCOME_TRAFFIC",       // or OUTCOME_LEADS, OUTCOME_AWARENESS, ...
    "dailyBudgetUsd": 10,
    "specialAdCategories": [],            // [] for most ads — Pulse is not a Special Ad Category
    "status": "PAUSED"
  },
  "adSet": {
    "name": "Boulder + Bend - Endurance",
    "geoTargets": [
      { "name": "Boulder", "region": "Colorado", "countryCode": "US" }
    ],
    "interests": ["Garmin", "Triathlon"], // resolved at deploy time via Meta search API
    "ageMin": 25,
    "ageMax": 55,
    "placements": {
      "facebook":  ["feed", "story"],
      "instagram": ["stream", "story", "reels"]
    },
    "optimizationGoal": "LANDING_PAGE_VIEWS",
    "billingEvent": "IMPRESSIONS"
  },
  "ads": [
    {
      "name": "Variant A - hero runner",
      "image": "marketing/public/pulse/hero-runner.png",   // path relative to repo root
      "headline": "Add years of healthspan",
      "primaryText": "Keep wearing your Garmin...",         // <= 125 chars to avoid truncation
      "description": "$9.99/mo · 7-day free trial",
      "cta": "LEARN_MORE",
      "linkUrl": "https://nove.health/pulse?utm_source=meta&..."
    }
  ]
}
```

### What deploy does

1. Resolves geo names → city keys (Meta `/search?type=adgeolocation`)
2. Resolves interest names → interest IDs (Meta `/search?type=adinterest`)
3. POST `/campaigns` → campaign (PAUSED)
4. POST `/adsets` → ad set with targeting + pixel (if available)
5. For each ad: upload image → create creative → create ad (PAUSED)

### Constraints

- **Headline**: max 40 chars
- **Primary text**: 125 chars before potential truncation
- **CTA**: enum — `LEARN_MORE`, `SIGN_UP`, `SUBSCRIBE`, `GET_OFFER`, etc.
- **Special Ad Categories**: only `CREDIT`, `EMPLOYMENT`, `HOUSING`, `ISSUES_ELECTIONS_POLITICS`, `ONLINE_GAMBLING_AND_GAMING`. Health is **not** a Special Ad Category — leave the array empty.
- **Budget**: in USD, daily amount (script multiplies × 100 for Meta's cents-based API)

### Out of scope (Phase 1)

- Custom Audiences / Lookalikes
- Reporting / metrics pull
- Auto-pause underperformers
- Multiple ad sets per campaign — one ad set per JSON file for now
