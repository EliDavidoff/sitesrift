/** Demo-only illustrative scan output — Phase B swaps in a hardened server-backed scan */

export type Severity = 'good' | 'info' | 'warn' | 'bad'

export type Finding = {
  id: string
  category: 'seo' | 'security'
  title: string
  detail: string
  severity: Severity
}

export type ScanReport = {
  canonicalUrl: string
  seoScore: number
  securityScore: number
  findings: Finding[]
  meta: {
    statusCode: number
    serverBanner: string
    tlsNote: string
  }
}

function hashString(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function scoreFromSeed(seed: number, salt: number) {
  return clamp(Math.round(58 + ((seed >>> salt) % 37)), 62, 98)
}

/** Deterministic illustrative report keyed by canonical URL */
export function buildMockReport(rawUrl: string): ScanReport {
  let canonicalUrl = rawUrl.trim()
  if (!/^https?:\/\//i.test(canonicalUrl)) {
    canonicalUrl = `https://${canonicalUrl}`
  }

  canonicalUrl = canonicalUrl.replace(/^http:\/\//i, 'https://')

  const seed = hashString(canonicalUrl.toLowerCase())
  const flip = (bit: number) => ((seed >> bit) & 1) === 1

  const seoFindings: Finding[] = [
    {
      id: 'title',
      category: 'seo',
      title: 'Title tag',
      detail:
        flip(1) && canonicalUrl.length % 7 !== 0
          ? `<title> is present but a bit generic for rich results snippets. Aim for intent plus differentiation near ~50–60 characters where possible.`
          : `Solid <title> clarity assumed in demo mode — keep anchored to primary search intent.`,
      severity: flip(3) ? 'warn' : 'good',
    },
    {
      id: 'desc',
      category: 'seo',
      title: 'Meta description',
      detail:
        flip(5) || canonicalUrl.endsWith('/') === false
          ? `Demo assumption: meta description coverage looks uneven. Aim for specificity and CTR-forward language (~140–155 characters).`
          : `Meta description signal reads healthy under simulated extraction.`,
      severity: flip(7) ? 'warn' : 'good',
    },
    {
      id: 'canonical',
      category: 'seo',
      title: 'Canonical consolidation',
      detail: flip(9)
        ? `Potential duplicate-entry risk: canonical tightening may be incomplete (apex vs www, trailing slashes). Prefer one authoritative URL everywhere.`
        : `Canonical strategy appears plausible in illustrative checks.`,
      severity: flip(9) ? 'info' : 'good',
    },
    {
      id: 'og',
      category: 'seo',
      title: 'Open Graph / previews',
      detail:
        flip(11)
          ? `Open Graph scaffolding looks incomplete for share cards. Prefer og:title, og:description, og:image (+ stable dimensions where you can).`
          : `Open Graph tags look reasonably complete in simulated scraping.`,
      severity: flip(11) ? 'warn' : 'good',
    },
    {
      id: 'h1',
      category: 'seo',
      title: 'Heading structure',
      detail: flip(13)
        ? `Assume a single decisive H1 and an outline aligned to page intent — avoid competing H1 collisions.`
        : `Heading scaffolding appears orderly in illustrative mode.`,
      severity: flip(13) ? 'info' : 'good',
    },
  ]

  const securityFindings: Finding[] = [
    {
      id: 'https',
      category: 'security',
      title: 'Transport security',
      detail: /^https:/i.test(canonicalUrl)
        ? `HTTPS-shaped URL assumed. Phase B verifies redirects, downgrade paths, certificates, and HSTS rollout against the live endpoint.`
        : `Prefer HTTPS everywhere (redirect aggressively) and bake HSTS with a safe ramp.`,
      severity: /^https:/i.test(canonicalUrl) ? 'good' : 'bad',
    },
    {
      id: 'hsts',
      category: 'security',
      title: 'Strict-Transport-Security',
      detail: flip(17)
        ? `No long-lived HSTS header assumed yet. Tune max-age intentionally, then evaluate preload eligibility cautiously.`
        : `HSTS appears plausible in mocked response headers.`,
      severity: flip(17) ? 'warn' : 'good',
    },
    {
      id: 'csp',
      category: 'security',
      title: 'Content-Security-Policy',
      detail: flip(18)
        ? `CSP is missing or permissive in simulation. Tighten directives iteratively — avoid permanent unsafe-inline anchors.`
        : `Baseline CSP posture appears plausible under illustrative assumptions.`,
      severity: flip(18) ? 'bad' : 'info',
    },
    {
      id: 'xfo',
      category: 'security',
      title: 'Clickjacking controls',
      detail: flip(21)
        ? `Frame control may rely on legacy primitives. Prefer CSP frame-ancestors framing policy with explicit scope.`
        : `Framing controls look plausible in illustrative mode.`,
      severity: flip(21) ? 'info' : 'good',
    },
    {
      id: 'refpol',
      category: 'security',
      title: 'Referrer-Policy',
      detail:
        flip(23)
          ? `Referrer posture may disclose more metadata than intended. Decide cross-origin leakage explicitly for sensitive routes.`
          : `Referrer-Policy stance looks deliberate in illustrative mode.`,
      severity: 'info',
    },
  ]

  const findings = [...seoFindings, ...securityFindings]

  return {
    canonicalUrl,
    seoScore: scoreFromSeed(seed, 2),
    securityScore: scoreFromSeed(seed, 4),
    findings,
    meta: {
      statusCode: flip(31) ? 301 : 200,
      serverBanner: flip(27)
        ? 'nginx'
        : flip(33)
          ? 'cloudflare'
          : `edge-${String((seed % 9) + 1)}`,
      tlsNote: flip(35)
        ? `TLS handshake appears modern in simulation (preferred suites + sane defaults). Phase B validates the real chain.`
        : `TLS stance looks acceptable in illustrative mode.`,
    },
  }
}
