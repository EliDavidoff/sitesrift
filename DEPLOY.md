# Deploying Sitesrift (SPA routes)

Legal routes (`/terms`, `/privacy`, `/accessibility`) are client-side routes. The host must serve `index.html` for unknown paths so refreshes and deep links work.

- **Vercel:** [`vercel.json`](vercel.json) includes a catch-all rewrite to `index.html`.
- **Netlify:** [`public/_redirects`](public/_redirects) maps `/*` → `/index.html` with `200` (SPA fallback).

For **`vite preview`** locally, opening `/terms` directly may 404 depending on version; use in-app navigation or deploy to verify deep links.

## SEO / crawlers (SPA reality)

Primary HTML is **`index.html`** meta tags unless you adopt SSR/prerender. `index.html` includes description + OG fields; **`public/robots.txt`** allows crawling by default — add a line **`Sitemap: https://YOUR_DOMAIN/sitemap.xml`** once the canonical origin exists and you publish a generated sitemap.

`index.html` also contains a **`noscript`** blurb so extremely limited clients still see positioning copy and footer links rendered in markup (update those strings if positioning changes).

Scan API **`POST /api/scan`** is implemented as Vite dev/preview middleware — see **`vite-plugin-scan-api.ts`** and **`scan-api/`**.

Each scan also issues **bounded GETs** for declared tab/touch icon URLs plus a single **`/favicon.ico`** check when needed (`scan-api/favicon-probe.ts`), behind the same **SSRF guards** as HTML/robots fetches.

### Abuse controls (defaults + env)

| Tunable | Default | Env variable |
|---------|---------|----------------|
| Max scans per rolling window per IP key | 45/min | `SCAN_API_RATE_LIMIT_MAX` |
| Window length (ms) | 60 000 | `SCAN_API_RATE_LIMIT_WINDOW_MS` |
| Max scans running at once per process | 6 | `SCAN_API_MAX_CONCURRENT` |
| Max requests waiting for a slot | 96 → then **503** `overloaded` | `SCAN_API_MAX_WAIT_QUEUE` |
| Scan wall-clock abort (parent signal) | 28 000 ms | `SCAN_API_ABORT_MS` |

Rate-limit storage **prunes and caps** keys (`scan-api/rate-limit.ts`). Concurrency is **in-memory per Node worker** — it does **not** coordinate across replicas; use edge rate limits too.

### Client IP for rate limiting (important)

By default **`X-Forwarded-For` is ignored** — the TCP peer (`remoteAddress`) is used so callers cannot spoof a new synthetic key each request.

**Behind Cloudflare / nginx / another terminating proxy**, every client will otherwise look like **one LB IP**. Set **`SCAN_API_TRUST_PROXY=1`** (or `true` / `yes`) so the middleware resolves the visitor from, in order: **`CF-Connecting-IP`**, **`True-Client-IP`**, **`X-Real-IP`**, then the left segment of **`X-Forwarded-For`**. Enable this **only** if your edge **strips or overwrites client-supplied forward headers** before traffic reaches Node; otherwise attackers can spoof again.

Enforce coarse limits **at the edge** (WAF / cloud rate-limiting) for distributed abuse beyond a single worker.
