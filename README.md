# Sitesrift

**Outside-in snapshot** for a single public URL: technical SEO-ish signals visible from one HTML response, security headers surfaced on that pass, and lightweight robots/assistants cues — staged as checklist scores plus explanations, **not** a site-wide crawl or a promise about Google/AI rankings.

## What it does today

- **Client:** React 19 + TypeScript + Vite + Tailwind CSS + Motion (`src/App.tsx`, `src/pages/*`).
- **Scan API:** Vite dev middleware `POST /api/scan` with optional NDJSON staging (`vite-plugin-scan-api.ts` → `scan-api/`): URL normalization → HTML fetch with redirect/step limits → robots.txt read → analysis.
- **Abuse knobs (bundled defaults):** request body cap, per-IP throttle on the scan route, hostname-only structured console logs in preview-style setups — tune before any public blast.

## Prerequisites

- **Node.js** 20+ recommended (aligned with toolchain used in development).

## Run locally

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173/`. SPA routes `/terms`, `/privacy`, `/accessibility` work under `npm run dev` when navigated inside the app.

### Phone or a shareable `https://…` link (dev)

I can’t host your machine from the cloud for you, but you can get a **temporary public URL** that tunnels to your laptop:

1. **Terminal A:** `npm run dev` (leave it running).
2. **Terminal B:** `npm run tunnel` — it prints a URL like `https://something.loca.lt`. Open that on your iPhone (Safari). The first visit may show a **localtunnel** click-through banner.

**Same Wi‑Fi only (no tunnel):** `npm run dev:lan`, then on the phone open `http://YOUR_MAC_IP:5173` (your Mac’s LAN IP from System Settings → Network).

For a **stable** link, deploy (e.g. Vercel/Netlify) — see **[DEPLOY.md](DEPLOY.md)**.

```bash
npm run build && npm run preview
```

Production build output is `dist/` (static assets + `index.html`).

### Quality gates

```bash
npm run lint
npm run test   # Vitest smoke when tests exist
```

## Deploy notes

Legal and marketing deep links rely on SPA history fallback — see **[DEPLOY.md](DEPLOY.md)** for `_redirects` / `vercel.json` summaries.

SEO and crawlers: the shell is **`index.html` + client JS**. Add SSR/prerender later if you want link-preview parity without JS execution everywhere; **`public/robots.txt`** is minimal and can gain a canonical `Sitemap:` line once the production origin is known.

## Contributing / fork hygiene

Forks should revise email addresses, placeholders in `src/legal/placeholders.ts`, PayPal/email CTAs (`src/App.tsx`), and telemetry language in Privacy/Terms to match what you actually operate.
