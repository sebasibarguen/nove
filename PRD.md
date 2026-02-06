# Nove — MVP Product Requirements Document

**Version:** 0.1
**Last updated:** 2026-02-05
**Status:** Draft

---

## 1. Problem

In Guatemala (and most of LATAM), healthcare is reactive. People visit a doctor when something is already wrong. Preventive health infrastructure exists (labs, clinics, fitness assessments) but there's no connective tissue between them — no system that helps a person understand their health holistically, track it over time, and act on it before problems emerge.

The result: people who *would* invest in their health don't know what to test, when to test, or what the results mean. Wearable data sits unused. Lab results live in PDF drawers. There's no feedback loop between lifestyle and biomarkers.

## 2. Solution

Nove is a **proactive health hub** with an AI coach at the center. It connects a user's wearable data, lab results, and health goals into a single experience — then uses an AI coach to interpret, recommend, and nudge.

The AI coach is not a chatbot bolted onto a dashboard. It's the primary interface for understanding your health and deciding what to do next.

## 3. Target Users

### Primary: Health-conscious adults (25–40)
- Already active (gym, running, sports)
- Own or willing to buy a wearable
- Want data-driven optimization: "Am I actually improving?"
- Will pay for clarity and structure

### Secondary: Prevention-focused adults (30–50)
- Don't go to the doctor unless sick
- Know they *should* get bloodwork done but haven't
- Motivated by fear of chronic disease (family history, aging)
- Need a system that makes proactive health easy, not another task

### Anti-persona
- People looking for a diagnosis or treatment plan (Nove is not a telemedicine platform)
- People who want a free health tracker (Nove is a paid service)

## 4. Core User Journey (MVP)

```
Sign up → Connect wearable → AI onboarding conversation → Baseline lab order
→ Visit partner lab → Results flow into Nove → AI coach interprets results
→ Ongoing coaching (wearable data + goals) → Follow-up labs (quarterly)
```

### Step-by-step

1. **Sign up** — Email/password or social login on web app. Basic profile: age, sex, weight, height, health goals (dropdown + free text).

2. **Connect wearable** — Garmin OAuth 2.0. Historical data imported (90 days).

3. **AI onboarding** — Coach asks about lifestyle, goals, medical history (family conditions, medications, allergies). Conversational, not a form. This builds the user's health context.

4. **Baseline lab recommendation** — Based on profile and goals, the AI coach recommends a lab panel. For MVP, this is a standardized baseline panel (see Section 6). User confirms and Nove generates a lab order.

5. **Lab visit** — User receives a code/QR. Walks into any partner lab location. Identifies with the code. Gets bloodwork drawn. No appointment needed (or simple scheduling if the lab requires it).

6. **Results ingestion** — Lab sends results to Nove (email to a dedicated inbox or upload via a lab-facing web portal). Nove's PDF processing pipeline extracts structured biomarker data, stores it, and notifies the user that results are ready.

7. **AI interpretation** — Coach walks the user through results: what's normal, what needs attention, what to track. Connects biomarkers to wearable trends where relevant (e.g., resting HR trend + lipid panel).

8. **Ongoing coaching** — Weekly check-ins, goal tracking, wearable data analysis. Coach nudges based on activity trends, sleep patterns, and upcoming lab milestones.

9. **Follow-up labs** — Quarterly or as recommended. Coach tracks progress over time: "Your fasting glucose dropped from 105 to 95 since you started zone 2 training."

## 5. MVP Features

### 5.1 Web Application

The primary interface. Clean, focused, not a dashboard overloaded with charts.

**Pages/views:**
- **Home** — Current health snapshot: recent coach messages, upcoming actions, key metrics
- **Coach** — Chat interface with the AI coach. Full conversation history. This is where most interaction happens.
- **Lab Results** — Timeline of lab results with trend visualization. Tap any biomarker to see history + AI interpretation.
- **Activity** — Wearable data summary: activity, sleep, heart rate trends. Not a Garmin clone — curated views the coach references.
- **Profile/Settings** — Personal info, connected devices, subscription management

**Key UX principles:**
- The coach is the entry point for everything. "What should I test?" → ask the coach. "What does this result mean?" → ask the coach. "Am I improving?" → ask the coach.
- Data views exist to support the coaching conversation, not replace it.
- Mobile-responsive web. Native app is a later phase.

### 5.2 AI Coach

**Capabilities:**
- Health onboarding and goal-setting conversation
- Interpret lab results in plain language (Spanish and English)
- Analyze wearable trends and connect them to biomarkers
- Recommend lab tests based on profile, history, and goals
- Weekly check-in messages with actionable insights
- Answer health questions within scope (not diagnosis, not prescriptions)

**Boundaries:**
- Never diagnoses conditions
- Never recommends medications
- Flags concerning results with "talk to your doctor" guidance
- Transparent about what it knows and doesn't know

**Personalization:**
- Adapts tone and depth to user (data-nerd vs. keep-it-simple)
- Remembers full history: past conversations, lab trends, goals
- Proactive, not just reactive — reaches out when patterns emerge

**Language:**
- Spanish (Guatemala/LATAM Spanish) as primary
- English supported
- User can switch anytime

### 5.3 Wearable Integration

**Garmin (MVP):**
- OAuth 2.0 connection
- Data: daily activities, sleep, heart rate (resting + active), VO2Max estimate, stress, body battery
- Historical backfill: 90 days
- Ongoing sync via webhooks or polling

**Apple Health (post-MVP):**
- Added as first wearable expansion
- Requires evaluating native wrapper approach (React Native/Capacitor)

**Design principle:** The web app should work without a wearable connected (lab-only users are valid), but the coaching experience is significantly richer with one.

### 5.4 Lab Orders & Results

**Order flow:**
1. AI coach recommends a panel (or user requests one)
2. User confirms in-app
3. Nove generates a lab order with a unique code
4. User visits partner lab, presents code
5. Lab processes the order
6. Lab sends result PDF to Nove (email to dedicated inbox or upload via lab portal)
7. Nove's processing pipeline extracts structured biomarker data
8. User is notified that results are ready and AI coach interprets them

**Baseline panel (MVP):**
- Complete Blood Count (CBC)
- Lipid panel (total cholesterol, LDL, HDL, triglycerides)
- Fasting glucose
- HbA1c
- Thyroid (TSH, free T4)
- Basic metabolic panel (electrolytes, kidney function)

**Results display:**
- Each biomarker shown with: value, reference range, status (normal/borderline/flag), trend (if previous results exist)
- AI-generated summary for each result set
- PDF export of full results

**Lab result delivery (MVP):**
- **Email inbox**: Labs email result PDFs to a dedicated Nove address (e.g., results@nove.health). Matched to the user's order via code/identifier in the email or filename.
- **Lab portal**: Simple web interface where lab staff upload result PDFs against an order code. Minimal UI — just auth, order lookup, and file upload.

**PDF processing pipeline:**
- Must handle varying PDF formats across partner labs (scanned images, digitally generated, mixed layouts)
- OCR for scanned/image-based PDFs
- AI-assisted extraction to identify biomarkers, values, units, and reference ranges
- Structured validation: extracted data checked against expected panel (e.g., ordered CBC → expect WBC, RBC, hemoglobin, etc.)
- Confidence scoring per extracted value — low-confidence values flagged for human review
- Human-in-the-loop review queue for flagged results and first N results per new lab partner (build trust in the pipeline before fully automating)
- All original PDFs permanently stored — serves as the source of truth and historical record for the user's health data
- Extracted structured data always linked back to its source PDF

### 5.5 Notifications & Nudges

- **In-app notifications** for: lab results ready, coach check-in, reminders
- **Email** for: lab results ready, weekly summary
- **Push notifications** (web push) for time-sensitive nudges
- **WhatsApp** (future phase — not MVP)

## 6. Business Model

### Subscription tiers

**Nove Essential — ~Q150/month ($20 USD)**
- AI coach (unlimited conversations)
- Wearable integration and analysis
- 1 basic lab panel per quarter (included)
- Results tracking and trends

**Nove Complete — ~Q300/month ($40 USD)**
- Everything in Essential
- Comprehensive lab panels (add hormones, vitamins, inflammation markers)
- Priority lab scheduling
- Monthly coach reports

### Lab test add-ons
- Users can purchase additional tests beyond what's included
- Nove takes a margin on lab costs (negotiate wholesale pricing with partners)
- A la carte pricing displayed in-app

### Unit economics (rough)
- Lab cost to Nove (basic panel): ~Q100–200 ($13–26)
- Subscription revenue per user: Q150–300/month
- Margin on included quarterly lab: absorbed into subscription
- Margin on add-on tests: 30–50%

## 7. Technical Architecture (High Level)

### Frontend
- **Web app**: React/Next.js (or similar). Mobile-responsive SPA.
- **Hosting**: Vercel or similar edge platform

### Backend
- **API**: Python (FastAPI) or Node.js — TBD based on team
- **Database**: PostgreSQL (structured data: users, labs, biomarkers) + object storage for documents
- **AI**: OpenAI API (GPT-4 or successor) with structured context management
- **Auth**: Email/password + social login (Google). Magic links for low friction.
- **Task queue**: For async processing (lab result ingestion, AI responses, notifications)

### Integrations
- **Garmin**: OAuth 2.0 + webhook API
- **Lab partner**: PDF result parsing (AI-assisted extraction). No API integration for MVP.
- **Payments**: Stripe (supports Guatemala via cross-border) or local payment processor (Recurrente, Pagalo)

### Data & Privacy
- Health data encrypted at rest and in transit
- User owns their data — export and delete anytime
- Compliance: follow HIPAA-adjacent practices even though Guatemala doesn't mandate it (builds trust, prepares for expansion)
- AI conversations stored but never used for model training
- Lab results stored with medical-grade data handling practices

## 8. MVP Scope Boundaries

### In scope
- Web app with coach, lab results, activity views
- AI coach (onboarding, lab interpretation, weekly check-ins, Q&A)
- Garmin integration (OAuth 2.0)
- Lab order generation with unique codes (1–2 partner labs in Guatemala City)
- Lab result ingestion via PDF upload + AI-assisted parsing
- Basic bloodwork panel
- Subscription billing
- Spanish and English

### Out of scope (future phases)
- Native mobile app (iOS/Android)
- Apple Health / other wearable integrations
- WhatsApp as a channel
- Telemedicine / doctor consultations
- Specialist referrals
- Physical endurance testing (VO2Max lab test, body composition scan, strength benchmarks) — **key to the long-term value prop, first priority after MVP**
- Direct lab API integration (replaces PDF upload flow)
- Nutrition tracking / meal plans
- Community features
- B2B / corporate wellness
- Expansion beyond Guatemala

## 9. Success Metrics (MVP)

| Metric | Target | Why it matters |
|--------|--------|---------------|
| Registered users (month 1) | 100 | Validate demand in Guatemala City |
| Wearable connected (%) | 60% | Core to the coaching experience |
| First lab completed (%) | 40% | Key activation event — user trusts Nove with their health |
| Coach conversations/week/user | 3+ | Engagement with the core product |
| Month-2 retention | 50% | Are people coming back after first lab results? |
| NPS | 40+ | Would they recommend Nove? |
| Paid conversion (if freemium) | 15% | Willingness to pay |

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| PDF parsing unreliable | Bad data in the system, broken trust | OCR + AI extraction with confidence scoring. Human review queue for low-confidence values. Build template library per lab partner over time. Audit trail links extracted data to source PDF. |
| Garmin-only limits TAM | Most users in Guatemala use Apple Watch or no wearable | Design the product to work well without a wearable (lab-only). Add Apple Health as first post-MVP priority. |
| AI coach gives bad health advice | Trust destruction, legal risk | Strict guardrails on what the coach will/won't say. Medical disclaimer on all interactions. Human review of edge cases. |
| Low willingness to pay in Guatemala | Revenue won't sustain growth | Validate pricing with 50 pre-launch interviews. Consider freemium tier with limited coaching. |
| Lab partner doesn't deliver results reliably | Broken core loop | Sign 2 partners minimum. User can always self-upload their PDF. |
| Regulatory ambiguity | Could be forced to shut down or pivot | Nove is a wellness platform, not a medical provider. Legal review before launch. Don't make clinical claims. |

## 11. Launch Plan (Guatemala City)

### Phase 0 — Pre-launch
- Sign 1–2 lab partners (negotiate pricing, agree on results delivery format)
- 50 user interviews to validate pricing and value prop
- Landing page with waitlist
- Legal review of health data handling in Guatemala

### Phase 1 — Closed beta (invite-only)
- 50–100 users from waitlist
- Full MVP feature set
- High-touch: founders personally onboard users, collect feedback
- Iterate on AI coach quality and lab flow

### Phase 2 — Open launch (Guatemala City)
- Public sign-up
- Content marketing: health education content in Spanish
- Partnerships: gyms, CrossFit boxes, running clubs in Guatemala City
- Referral program: invite a friend, get a free lab test

### Phase 3 — Expand
- Add more lab partners (coverage outside Guatemala City)
- Add comprehensive lab panels
- Physical testing (VO2Max, body composition)
- Evaluate expansion to Mexico City, Bogotá, or Lima

## 12. Post-MVP Roadmap Priority

1. **Physical endurance testing** — VO2Max lab tests, body composition scans (DEXA/bioimpedance), strength benchmarks. This is central to the long-term value prop: Nove doesn't just track blood — it gives you a complete picture of your physical capacity. Requires partnerships with fitness testing facilities or equipping partner labs.
2. **Apple Health integration** — Expand wearable coverage to the dominant smartwatch ecosystem.
3. **Direct lab API integration** — Replace PDF upload with automated result delivery.
4. **Comprehensive lab panels** — Hormones, vitamins, inflammation markers.
5. **Native mobile app** — Better push notifications, wearable access, offline support.

## 13. Open Questions

1. **PDF result format consistency**: How standardized are lab result PDFs across Guatemalan labs? Are they mostly digitally generated or scanned? This determines OCR requirements and how quickly the pipeline stabilizes per partner.
2. **Payment processor**: Stripe works but charges cross-border fees. Is a local processor (Recurrente) better for Guatemala?
3. **Regulatory**: Does Guatemala have any health data regulations that apply to wellness platforms? Need legal review.
4. **AI model**: OpenAI vs. Anthropic vs. open-source for the coach? Cost, quality, and data privacy tradeoffs.
5. **Pricing validation**: Q150/month feels right for the target user, but needs real-world testing. Is there a price point where the prevention-focused segment activates?
6. **Physical testing partnerships**: For post-MVP endurance testing — are there existing facilities in Guatemala City, or does Nove need to equip partner locations?

---

*This is a living document. Updated as decisions are made and validated.*
