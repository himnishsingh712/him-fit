# HimFit

A personal food, supplement and habit tracker. Installable on any phone from a link, works offline, syncs to the cloud.

**Stack:** Vite + JavaScript · PWA (vite-plugin-pwa) · Supabase (Postgres, Auth, Row Level Security) · Vercel hosting

## What it does
- Logs a fixed, label-verified food list (calories, macros and ~28 micronutrients per item)
- Water, supplements on a schedule, weight, sleep, training, bong hits, cigarettes, drinks with mixers
- Nutrients vs targets with top contributors, processed-food share (NOVA 4)
- Trends over 7 / 30 / 90 days and rule-based insights (fixed statistics, no AI)
- Rule flags: protein under target, gaining too fast, missed supplements, upcoming schedule changes

## Run it locally
```bash
npm install
npm run dev                  # http://localhost:5173
npm run build                # production build in dist/
```

## Install on a phone
- **Android (Chrome):** open the link → menu → **Install app**
- **iPhone (Safari):** open the link → **Share** → **Add to Home Screen**

## Project layout
```
src/data.js       food, drink and supplement database (per 100 g / 100 ml)
src/app.js        screens, nutrition engine, offline-first sync, login
src/supabase.js   database client
src/style.css     Midnight Chai theme
supabase/migrations/   database schema + security rules
docs/HOW-IT-WORKS.md   how each piece works, in plain words
```
