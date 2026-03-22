# Healthspan Dashboard — Design Doc

## Goal

Replace the navigation-grid dashboard with a data-rich healthspan view inspired by WHOOP's home screen, grounded in Eric Topol's "Super Agers" longevity framework. Surface cardiovascular fitness, sleep quality, metabolic health, and stress/recovery in a single view connecting wearable data, lab biomarkers, and coaching.

## Single Snapshot Endpoint

`GET /api/v1/dashboard/snapshot` — returns everything the dashboard needs in one call.

**Why one endpoint**: avoids 6+ waterfall requests, lets backend optimize queries in a single DB session, keeps scoring logic server-side where the coach can also use it.

### Response Shape

```json
{
  "scores": {
    "recovery": { "value": 82, "label": "Recuperacion", "color": "green" },
    "strain":   { "value": 14.2, "label": "Esfuerzo", "color": "blue" },
    "sleep":    { "value": 91, "label": "Sueno", "color": "green" }
  },
  "nove_age": {
    "physiological": 28,
    "chronological": 32,
    "delta": -4,
    "inputs_used": 5,
    "last_updated": "2026-03-14"
  },
  "garmin": {
    "connected": true,
    "last_sync": "2026-03-21T06:30:00Z",
    "today": { ... },
    "trends_7d": { ... }
  },
  "biomarkers": { ... },
  "pillars": {
    "cardio":    { ... },
    "sleep":     { ... },
    "activity":  { ... },
    "metabolic": { ... },
    "stress":    { ... }
  }
}
```

## Three Hero Scores

| Score | Range | Key Inputs | Color Logic |
|-------|-------|-----------|-------------|
| **Recuperacion** (Recovery) | 0–100 | Sleep score 40%, resting HR vs baseline 30%, body battery charged 30% | ≥70 green, 40–69 yellow, <40 red |
| **Esfuerzo** (Strain) | 0–21 | Active time 40%, HR ratio 35%, body battery drained 25% | Gradient: 0–7 light blue, 8–14 medium, 15–21 deep blue |
| **Sueno** (Sleep) | 0–100 | Garmin `overallSleepScore`, or computed from duration/deep/REM/awake | ≥70 green, 40–69 yellow, <40 red |

### Recovery Score Formula

```
sleep_component   = clamp(garmin_sleep_score / 100, 0, 1) * 40
hr_component      = clamp(1 - abs(resting_hr - baseline_hr) / baseline_hr, 0, 1) * 30
battery_component = clamp(body_battery_charged / 100, 0, 1) * 30
recovery          = round(sleep_component + hr_component + battery_component)
```

- `baseline_hr` = 7-day rolling average of resting HR
- If any input is missing, redistribute its weight proportionally among available inputs

### Strain Score Formula

```
time_ratio    = clamp(active_minutes / 180, 0, 1)
hr_ratio      = clamp((avg_active_hr - resting_hr) / (max_hr - resting_hr), 0, 1)
battery_drain = clamp(body_battery_drained / 100, 0, 1)

strain = round((time_ratio * 0.40 + hr_ratio * 0.35 + battery_drain * 0.25) * 21, 1)
```

- `max_hr` = 220 - age (fallback 190 if age unknown)
- Minimum 1 input required

### Sleep Score

Use Garmin's `overallSleepScore` directly when available. Fallback computation:

```
duration_score = clamp(total_hours / 8, 0, 1) * 40
deep_score     = clamp(deep_hours / 1.5, 0, 1) * 25
rem_score      = clamp(rem_hours / 2.0, 0, 1) * 25
awake_penalty  = clamp(1 - awake_minutes / 60, 0, 1) * 10
sleep_score    = round(duration_score + deep_score + rem_score + awake_penalty)
```

## Nove Age

Physiological age estimate. Displayed as "Edad Nove: 28" vs "Edad real: 32" with delta.

### Weighted Inputs

| Input | Weight | Source |
|-------|--------|--------|
| Resting HR | 20% | Garmin activity |
| VO2 Max | 20% | Garmin vo2max |
| Sleep consistency | 15% | Garmin sleep (7d stdev of duration) |
| Activity level | 15% | Garmin activity (avg steps) |
| Fasting glucose | 10% | Lab biomarker `glucose` |
| HbA1c | 10% | Lab biomarker `hba1c` |
| Lipid composite | 10% | Lab biomarkers `ldl`, `hdl`, `triglycerides` |

- Minimum 2 inputs required to display
- Missing inputs redistribute weight proportionally
- Each input maps to an age delta via lookup tables (e.g., resting HR 50 → -3y, 80 → +3y)
- Updates weekly

### Age Delta Lookup (per input)

| Input | Optimal (−3y) | Good (−1y) | Neutral (0y) | Poor (+2y) | Bad (+4y) |
|-------|--------------|-----------|-------------|-----------|----------|
| Resting HR (bpm) | ≤52 | 53–60 | 61–70 | 71–80 | >80 |
| VO2 Max (mL/kg/min) | ≥50 | 42–49 | 35–41 | 28–34 | <28 |
| Sleep consistency (stdev hrs) | ≤0.3 | 0.3–0.5 | 0.5–1.0 | 1.0–1.5 | >1.5 |
| Steps/day | ≥12000 | 10000–11999 | 7000–9999 | 4000–6999 | <4000 |
| Fasting glucose (mg/dL) | ≤85 | 86–95 | 96–99 | 100–110 | >110 |
| HbA1c (%) | ≤5.0 | 5.1–5.4 | 5.5–5.6 | 5.7–6.0 | >6.0 |
| Lipid composite | All optimal | Mostly good | Mixed | Mostly poor | All poor |

## Health Pillar Cards (Topol Framework)

5 collapsible cards, each with summary row + expandable detail.

### 1. Corazon (Cardiovascular)
- **Summary**: Resting HR, VO2 Max, fitness age
- **Detail**: 7-day resting HR sparkline, HR zones breakdown
- **Source**: Garmin activity + vo2max data types

### 2. Sueno (Sleep)
- **Summary**: Last night score, duration, deep/REM %
- **Detail**: 7-day duration sparkline, sleep stage breakdown, consistency
- **Source**: Garmin sleep data type

### 3. Actividad (Activity)
- **Summary**: Today's steps, active minutes, calories
- **Detail**: 7-day steps sparkline, distance, intensity minutes
- **Source**: Garmin activity data type

### 4. Metabolismo (Metabolic)
- **Summary**: Latest fasting glucose, HbA1c, lipid panel status badges
- **Detail**: Individual biomarker values with reference ranges
- **Source**: Lab biomarker values (codes: `glucose`, `hba1c`, `ldl`, `hdl`, `triglycerides`)

### 5. Estres y Recuperacion (Stress & Recovery)
- **Summary**: Today's avg stress, body battery current level
- **Detail**: 7-day stress sparkline, body battery trend
- **Source**: Garmin stress data type

## Missing Data CTAs

When data source is unavailable, show actionable prompt instead of empty state:

| Missing | CTA |
|---------|-----|
| Garmin not connected | "Conecta tu Garmin para ver tus datos de salud" → /garmin |
| No Garmin data yet | "Sincroniza tu Garmin para ver tus metricas" → trigger sync |
| No lab results | "Sube tus resultados de laboratorio" → /labs |
| Specific biomarker missing | "Ordena un panel de laboratorio para completar tu perfil" → /labs |

## Files

### Backend (new)
- `backend/src/nove/dashboard/__init__.py`
- `backend/src/nove/dashboard/router.py` — snapshot endpoint
- `backend/src/nove/dashboard/schemas.py` — response models
- `backend/src/nove/dashboard/scoring.py` — pure scoring functions
- `backend/tests/test_dashboard.py`

### Frontend (new/modified)
- `web/src/app/dashboard/page.tsx` — rewrite
- `web/src/app/dashboard/score-dial.tsx` — SVG circular progress
- `web/src/app/dashboard/nove-age-card.tsx` — age comparison banner
- `web/src/app/dashboard/pillar-card.tsx` — generic collapsible card
- `web/src/app/dashboard/cardio-pillar.tsx`
- `web/src/app/dashboard/sleep-pillar.tsx`
- `web/src/app/dashboard/activity-pillar.tsx`
- `web/src/app/dashboard/metabolic-pillar.tsx`
- `web/src/app/dashboard/stress-pillar.tsx`
- `web/src/app/dashboard/missing-data-cta.tsx`
- `web/src/app/dashboard/sparkline.tsx` — inline SVG trend line

### Register
- `backend/src/nove/main.py` — add dashboard router

## Layout (Mobile-First)

```
┌─────────────────────────────┐
│  Hola, {name}        Logout │
├─────────────────────────────┤
│  ┌─────┐ ┌─────┐ ┌─────┐   │
│  │Recup│ │Esfue│ │Sueno│   │  ← 3 hero score dials
│  │ 82  │ │14.2 │ │ 91  │   │
│  └─────┘ └─────┘ └─────┘   │
├─────────────────────────────┤
│  Edad Nove: 28  Real: 32    │  ← Nove Age banner
│  ▼ 4 anos mas joven         │
├─────────────────────────────┤
│  ♥ Corazon          ▸ 62bpm │  ← Pillar cards
│  🌙 Sueno           ▸ 7.5h  │
│  🏃 Actividad       ▸ 8.2k  │
│  🧪 Metabolismo     ▸ 3/5   │
│  ⚡ Estres          ▸ 28    │
├─────────────────────────────┤
│  Coach · Garmin · Labs      │  ← Quick links
└─────────────────────────────┘
```

On `md:` breakpoint, hero dials sit in a 3-column grid and pillar cards in 2 columns.
