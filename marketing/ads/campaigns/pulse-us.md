# Pulse — US Launch Campaign Brief

Acquisition plan for Pulse (pulse.nove.health) targeting US Garmin owners. Goal: build a waitlist before paid trial / Stripe billing ships.

## Positioning

**The Whoop app for your Garmin.** Three Whoop churn drivers — $30/mo, the double-wearable problem, and "now what?" after the recovery score — Pulse beats all three by riding on hardware Garmin owners already wear.

Working price: **$9.99/mo, $79/yr, 7-day free trial**. Final pricing TBD; landing page anchors on $9.99 for now.

## Funnel

```
Ad → /pulse?utm_source=…&utm_campaign=…&utm_content=…
  PageView
  → scroll past comparison
  → email submit → Brevo list "pulse-waitlist"
  → /success
```

UTM convention: `utm_source={reddit|meta|google}&utm_medium=cpc&utm_campaign={name}&utm_content={variant}&utm_term={keyword}`.

Pixels (deferred install): Meta Pixel, Reddit Pixel, GA4. Standard events: `Lead` on form submit, `CompleteRegistration` on /success.

## Geo Targets

**Tier 1 (launch — small endurance-heavy US cities):**
- Boulder, CO — highest density of pro triathletes; Garmin-saturated
- Bend, OR — trail running + cycling hub
- Flagstaff, AZ — altitude training, NAU + pro running groups
- Missoula, MT — strong citizen-runner community, low ad competition

**Tier 2 (add after Tier 1 proves):**
Asheville NC, Chattanooga TN, Bozeman MT, Park City UT, Durango CO, Bellingham WA.

Reddit targeting is geo-agnostic (subreddit-driven). Meta + Google geo-restrict to Tier 1 first.

## Channels (ranked by expected CAC)

### 1. Reddit Ads — primary

Subreddits: r/Garmin, r/GarminFenix, r/Forerunner, r/Whoop (churn-minded), r/AdvancedRunning, r/triathlon, r/Velo.

Format: image ads, native-feeling. No video.

**Variant 1 — direct attack**
- Title: You don't need Whoop. You have a Garmin.
- Body: Recovery, strain, and sleep — same UX, $9.99/mo, no second strap.

**Variant 2 — churn-bait**
- Title: Cancelled Whoop? Your Garmin already has the data.
- Body: Pulse turns Body Battery, HRV, and sleep into the recovery app you actually wanted.

**Variant 3 — Garmin Connect frustration**
- Title: Garmin Connect buries your recovery score. We don't.
- Body: Pulse is recovery-first. $9.99/mo, no second wearable.

### 2. Meta — Reels + Stories, geo-restricted to Tier 1

Interests: Garmin, Strava, triathlon, Ironman, trail running, cycling.

Creative: 15-second screen recording. Garmin watch wrist shot → swipe → Pulse home screen with recovery / strain / sleep cards. The UX is the pitch.

- Variant A overlay: If you wear a Garmin, you don't need Whoop.
- Variant B overlay: Whoop's UI. Garmin's data. $9.99/mo.
- Variant C overlay: Three Garmin metrics that matter. One screen.

CTA button: Learn More.
URL: https://nove.health/pulse?utm_source=meta&utm_medium=cpc&utm_campaign=pulse-us-tier1&utm_content={variant}

### 3. Google Search — geo-restricted to Tier 1 + 2

Three ad groups, exact + phrase match. See `pulse-google-us.json` for the deployable config.

1. **Whoop alternative** — high-intent churn keywords
2. **Garmin recovery** — Garmin owners hunting for better UX
3. **Whoop vs Garmin** — comparison-shopping intent

## Week-1 Test

- Total budget: $350 across 7 days ($50/day)
- Split: $20 Reddit, $20 Meta (Boulder + Bend only), $10 Google Search
- Primary metric: cost per waitlist signup
- Secondary metric: scroll-past-comparison rate (creative quality signal)
- Kill criteria: any single channel > $30/signup at day 4 → pause and re-cut creative

## Open Items Before Launch

- [ ] App-code: parameterize Spanish strings in `marketing/src/components/sections/lead-form.tsx` (placeholder, loading text, error text)
- [ ] App-code: Spanish strings on `/success` page
- [ ] App-code: route Brevo signups by `landingSlug` (or filter by `LANDING_SLUG` attribute downstream in Brevo)
- [ ] Brevo: create `pulse-waitlist` list, capture list ID
- [ ] Pixels: install Meta + Reddit + GA4 in `marketing/src/app/layout.tsx`
- [ ] Creative: produce 15s Pulse home-screen recording for Meta / Reddit
- [ ] Decide: final price ($9.99 / $14.99 / $19.99) before paid trial launch
- [ ] Pre-flight: Stripe subscription + 7-day trial gate before swapping waitlist CTA to "Start free trial"
