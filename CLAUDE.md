# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Race weather dashboard for the Florida NICA (National Interscholastic Cycling Association) mountain bike season. Provides real-time weather monitoring, risk assessment (lightning, trail damage, wind, heat), and go/no-go decision support for league directors and event staff.

## Commands

- `npm run dev` — Start Vite dev server on port 3000 (auto-opens browser)
- `npm run build` — Production build to `dist/`
- `npm run preview` — Preview production build locally

No test framework, linter, or formatter is configured.

## Architecture

**Vanilla JS + Vite** — No framework. ES modules with manual DOM manipulation. All UI rendering functions take a container element and imperatively set `innerHTML` or append children.

### Data Flow

1. `src/main.js` orchestrates: finds next race → parallel-fetches weather for all remaining races → runs risk assessment → renders UI
2. Weather data flows through a centralized **Store** (`src/state/store.js`) — a simple pub/sub state container keyed by race ID
3. Risk scores (0-100) are computed per-category by pure functions in `src/config/riskAssessment.js`, then mapped to GREEN (<30) / YELLOW (30-60) / RED (>60) levels

### Key Modules

- **`src/config/raceSchedule.js`** — Season schedule with GPS coordinates per venue. **Update this file each season** with new dates/venues.
- **`src/config/riskAssessment.js`** — Pure scoring functions: `scoreLightning`, `scoreTrailDamage`, `scoreWind`, `scoreHeatRisk`. Overall = max(lightning, trailDamage, wind×0.5, heat). NWS alerts (Tornado/Severe Thunderstorm Warning) auto-override to RED.
- **`src/config/constants.js`** — All thresholds (CAPE, WBGT, trail moisture, wind), API URLs, weather code mappings, refresh intervals.
- **`src/api/openMeteo.js`** — Open-Meteo forecast API (hourly + daily + 7-day past data + soil moisture). Also 15-min nowcast for races within 2 days.
- **`src/api/nwsAlerts.js`** — NWS Alerts API integration, filtered to race time windows.
- **`src/api/openMeteoClimate.js`** — Climate normals for rainfall departure calculation.
- **`src/ui/`** — Rendering functions. Each exports a `render*` function that targets a DOM container from `index.html`.

### API Dependencies

- **Open-Meteo** (no API key): Forecasts, nowcast, climate normals
- **NWS API** (no API key, requires User-Agent header): Active weather alerts

### Auto-Refresh

Normal: 15 min. Race day: 5 min. Configurable in `src/config/constants.js`.

### State Persistence

Unit preferences (temp/speed) persist to localStorage. Risk notification preferences and previous risk levels also use localStorage (keys in `STORAGE_KEYS`).

## Workflow

- Always commit and push after making code changes. Do not wait for the user to ask.

## Domain Context

- NICA weather policy: Lightning within 10 miles stops activity; 30-min wait after last strike before resuming
- Races are typically 2-day events (Saturday setup/pre-ride, Sunday racing) with race hours 8am-4pm
- Trail conditions matter significantly — Florida sandy soil saturates differently than clay; soil moisture thresholds are tuned for this
- WBGT (Wet Bulb Globe Temperature) thresholds follow NICA heat safety guidelines
- The dashboard supports deep-linking to specific races via URL hash
