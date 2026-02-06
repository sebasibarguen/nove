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
