# Deploying Sitesrift (SPA routes)

Legal routes (`/terms`, `/privacy`, `/accessibility`) are client-side routes. The host must serve `index.html` for unknown paths so refreshes and deep links work.

- **Vercel:** [`vercel.json`](vercel.json) includes a catch-all rewrite to `index.html`.
- **Netlify:** [`public/_redirects`](public/_redirects) maps `/*` → `/index.html` with `200` (SPA fallback).

For **`vite preview`** locally, opening `/terms` directly may 404 depending on version; use in-app navigation or deploy to verify deep links.
