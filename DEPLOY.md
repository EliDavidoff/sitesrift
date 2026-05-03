# Deploying Sitesrift (SPA routes)

Legal routes (`/terms`, `/privacy`, `/accessibility`) are client-side routes. The host must serve `index.html` for unknown paths so refreshes and deep links work.

- **Vercel:** [`vercel.json`](vercel.json) includes a catch-all rewrite to `index.html`.
- **Netlify:** [`public/_redirects`](public/_redirects) maps `/*` → `/index.html` with `200` (SPA fallback).

For **`vite preview`** locally, opening `/terms` directly may 404 depending on version; use in-app navigation or deploy to verify deep links.

## SEO / crawlers (SPA reality)

Primary HTML is **`index.html`** meta tags unless you adopt SSR/prerender. `index.html` includes description + OG fields; **`public/robots.txt`** allows crawling by default — add a line **`Sitemap: https://YOUR_DOMAIN/sitemap.xml`** once the canonical origin exists and you publish a generated sitemap.

`index.html` also contains a **`noscript`** blurb so extremely limited clients still see positioning copy and footer links rendered in markup (update those strings if positioning changes).

Scan API **`POST /api/scan`** ships with dev middleware defaults (rate-limit order-of-magnitude: ~45 requests per originating IP per rolling minute — see **`vite-plugin-scan-api.ts`**). Retune (`RATE_LIMIT_MAX`, window, server timeout, body limits) before public launch.
