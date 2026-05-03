import { load } from 'cheerio'
import type { FetchPageResult } from './fetch-page.ts'
import type { RobotsFetchResult } from './robots.ts'
import { checkAiCrawlers } from './robots.ts'
import type {
  RiskBand,
  ScanFinding,
  ScanMeta,
  ScanReport,
  Severity,
} from '../src/lib/scan-types.ts'
import { scoreBucketForCategory } from '../src/lib/scoring-rubric.ts'

function collectSetCookie(h: Headers): string[] {
  const anyHeaders = h as Headers & { getSetCookie?: () => string[] }
  if (typeof anyHeaders.getSetCookie === 'function') {
    return anyHeaders.getSetCookie()
  }
  const single = h.get('set-cookie')
  return single ? [single] : []
}

function riskToSeverity(risk: RiskBand, positive: boolean): Severity {
  if (positive) return 'good'
  if (risk === 'high') return 'bad'
  if (risk === 'medium') return 'warn'
  return 'info'
}

function push(
  list: ScanFinding[],
  finding: Omit<ScanFinding, 'severity'> & { severity?: Severity },
) {
  list.push({
    ...finding,
    severity: finding.severity ?? riskToSeverity(finding.riskBand, false),
  })
}

function looksLikeHtml(ct: string, body: string) {
  if (ct.includes('text/html')) return true
  const head = body.trimStart().slice(0, 500).toLowerCase()
  return head.includes('<html') || head.includes('<!doctype html')
}

export function analyzeEnvelope(
  canonicalInput: string,
  page: FetchPageResult,
  robotsResult: RobotsFetchResult,
): ScanReport {
  if (!looksLikeHtml(page.contentType, page.bodyText)) {
    throw new Error('That URL did not return a normal HTML page we could read.')
  }

  const $ = load(page.bodyText)
  const findings: ScanFinding[] = []

  const finalUrl = page.finalUrl
  const finalParsed = new URL(finalUrl)

  const titleText = $('title').first().text().replace(/\s+/g, ' ').trim()
  if (!titleText) {
    push(findings, {
      id: 'seo-title',
      category: 'seo',
      title: 'Page title',
      detail:
        'We could not find a clear <title> on the homepage HTML. Search results often pull from this text — without it, snippets look unfinished.',
      riskBand: 'medium',
      riskWhy:
        'People may skip your link in Google because the preview looks blank or generic.',
      remedy: 'Add a concise title that matches what the page is about (roughly one short line).',
      detailTechnical: 'Missing <title> element in fetched HTML.',
      lens: 'visibility',
    })
  } else if (titleText.length < 15) {
    push(findings, {
      id: 'seo-title-short',
      category: 'seo',
      title: 'Page title looks very short',
      detail:
        'The title exists but is quite short. Short titles can look generic in search previews.',
      riskBand: 'low',
      riskWhy: 'Search previews may not explain your page well, so fewer people click.',
      remedy: 'Expand the title slightly with the specific topic people search for.',
      lens: 'visibility',
    })
  } else if (titleText.length > 70) {
    push(findings, {
      id: 'seo-title-long',
      category: 'seo',
      title: 'Page title is long',
      detail:
        'Very long titles often get cut off in search results — readers only see the beginning.',
      riskBand: 'low',
      riskWhy: 'Important words at the end may never get seen in Google.',
      remedy: 'Move the key phrase toward the front and trim repetition.',
      lens: 'visibility',
    })
  } else {
    push(findings, {
      id: 'seo-title-ok',
      category: 'seo',
      title: 'Page title looks present',
      detail: `We saw a reasonable title: “${titleText.slice(0, 120)}${titleText.length > 120 ? '…' : ''}”.`,
      riskBand: 'low',
      riskWhy: 'No major issue spotted here for preview text.',
      remedy: 'Keep it updated when you change the page focus.',
      lens: 'visibility',
      severity: 'good',
    })
  }

  const metaDesc =
    $('meta[name="description"]').attr('content')?.replace(/\s+/g, ' ').trim() ?? ''
  if (!metaDesc) {
    push(findings, {
      id: 'seo-meta-desc',
      category: 'seo',
      title: 'Meta description',
      detail:
        'There is no meta description. Many search engines use this text for the snippet under your title.',
      riskBand: 'medium',
      riskWhy: 'Your snippet may be auto-filled with random text from the page — often messier and less clickable.',
      remedy: 'Add a short plain sentence describing the page and who it helps.',
      lens: 'visibility',
    })
  } else if (metaDesc.length < 50) {
    push(findings, {
      id: 'seo-meta-desc-short',
      category: 'seo',
      title: 'Meta description is short',
      detail: 'A description exists but it is quite brief — snippets may still feel thin.',
      riskBand: 'low',
      riskWhy: 'You may miss an opportunity to explain value in the preview.',
      remedy: 'Add one more concrete sentence with the main benefit.',
      lens: 'visibility',
    })
  } else {
    push(findings, {
      id: 'seo-meta-desc-ok',
      category: 'seo',
      title: 'Meta description present',
      detail: 'We found a meta description with usable length for previews.',
      riskBand: 'low',
      riskWhy: 'Low friction for basic snippet hygiene.',
      remedy: 'Refresh it when campaigns or offers change.',
      lens: 'visibility',
      severity: 'good',
    })
  }

  const viewport = $('meta[name="viewport"]').attr('content')?.trim()
  if (!viewport) {
    push(findings, {
      id: 'seo-viewport',
      category: 'seo',
      title: 'Mobile viewport tag',
      detail:
        'No viewport meta tag was found. Without it, many phones zoom awkwardly by default.',
      riskBand: 'medium',
      riskWhy: 'Hard-to-read mobile pages lose visitors quickly — search engines notice unhappy users.',
      remedy: 'Add a standard viewport meta tag for responsive layouts.',
      detailTechnical: 'Missing meta[name=viewport].',
      lens: 'visibility',
    })
  } else {
    push(findings, {
      id: 'seo-viewport-ok',
      category: 'seo',
      title: 'Viewport tag present',
      detail: 'The page includes a viewport meta tag — good baseline for phones.',
      riskBand: 'low',
      riskWhy: 'Less accidental “tiny text” trouble on mobile.',
      remedy: 'Keep layouts responsive at common breakpoints.',
      lens: 'visibility',
      severity: 'good',
    })
  }

  const canonicalHref = $('link[rel="canonical"]').attr('href')?.trim()
  if (!canonicalHref) {
    push(findings, {
      id: 'seo-canonical',
      category: 'seo',
      title: 'Canonical URL',
      detail:
        'No canonical link found. Canonical tags help search engines pick one official URL when duplicates exist.',
      riskBand: 'low',
      riskWhy: 'Duplicate URLs can split signals across www/non-www or trailing slash variants.',
      remedy: 'Add <link rel="canonical"> pointing to the preferred URL.',
      lens: 'visibility',
    })
  } else {
    let canonAbsolute = canonicalHref
    try {
      canonAbsolute = new URL(canonicalHref, finalUrl).href
    } catch {
      /* ignore */
    }
    const mismatch = canonAbsolute.split('#')[0] !== finalUrl.split('#')[0]
    if (mismatch) {
      push(findings, {
        id: 'seo-canonical-mismatch',
        category: 'seo',
        title: 'Canonical differs from final URL',
        detail: `Final URL we landed on: ${finalUrl}\nCanonical tag points to: ${canonAbsolute}`,
        riskBand: 'medium',
        riskWhy: 'Mixed signals can confuse indexing about which URL is “the real one.”',
        remedy: 'Align redirects and canonical so they agree on one primary address.',
        lens: 'visibility',
      })
    } else {
      push(findings, {
        id: 'seo-canonical-ok',
        category: 'seo',
        title: 'Canonical matches final URL',
        detail: 'Canonical tag lines up with the address we ended on — cleaner consolidation story.',
        riskBand: 'low',
        riskWhy: 'Less duplicate-content ambiguity from this hop.',
        remedy: 'Keep redirects tidy if marketing adds campaign parameters.',
        lens: 'visibility',
        severity: 'good',
      })
    }
  }

  const robots = $('meta[name="robots"]').attr('content')?.toLowerCase() ?? ''
  if (robots.includes('noindex')) {
    push(findings, {
      id: 'seo-robots-noindex',
      category: 'seo',
      title: 'Robots: indexing hints',
      detail:
        'This page asks not to be indexed (noindex). That can be intentional — but it blocks normal search visibility.',
      riskBand: 'medium',
      riskWhy: 'If this was accidental, the page will not show up in Google results.',
      remedy: 'Remove noindex on pages you want visible; keep it for staging or private pages.',
      lens: 'visibility',
    })
  }

  const ogTitle = $('meta[property="og:title"]').attr('content')?.trim()
  const ogDesc = $('meta[property="og:description"]').attr('content')?.trim()
  const ogImage = $('meta[property="og:image"]').attr('content')?.trim()
  const ogMissing = [!ogTitle, !ogDesc, !ogImage].filter(Boolean).length
  if (ogMissing === 3) {
    push(findings, {
      id: 'seo-og',
      category: 'seo',
      title: 'Link previews (Open Graph)',
      detail:
        'Open Graph tags look incomplete. Social apps use these for title/description/image when links are shared.',
      riskBand: 'medium',
      riskWhy: 'Shares may look blank or random — fewer clicks from social traffic.',
      remedy: 'Add og:title, og:description, and og:image pointing to a stable image URL.',
      lens: 'visibility',
    })
  } else if (ogMissing > 0) {
    push(findings, {
      id: 'seo-og-partial',
      category: 'seo',
      title: 'Link previews partially filled',
      detail: 'Some Open Graph tags exist, but not the full trio we look for on day one.',
      riskBand: 'low',
      riskWhy: 'Some platforms still guess missing preview fields.',
      remedy: 'Fill missing og:title / og:description / og:image for consistent cards.',
      lens: 'visibility',
    })
  } else {
    push(findings, {
      id: 'seo-og-ok',
      category: 'seo',
      title: 'Open Graph basics present',
      detail: 'Core Open Graph tags exist — better odds for rich previews when links are shared.',
      riskBand: 'low',
      riskWhy: 'Healthier sharing appearance on many platforms.',
      remedy: 'Keep og:image updated when branding changes.',
      lens: 'visibility',
      severity: 'good',
    })
  }

  const lang = $('html').attr('lang')?.trim()
  if (!lang) {
    push(findings, {
      id: 'seo-lang',
      category: 'seo',
      title: 'Language attribute',
      detail:
        'The <html lang> attribute is missing. Screen readers and translation tools use it.',
      riskBand: 'low',
      riskWhy: 'Accessibility suffers slightly; search engines also prefer explicit language hints.',
      remedy: 'Set lang on <html> (for example en or en-US).',
      lens: 'visibility',
    })
  }

  const h1Count = $('h1').length
  if (h1Count === 0) {
    push(findings, {
      id: 'seo-h1-missing',
      category: 'seo',
      title: 'Main heading (H1)',
      detail:
        'No H1 heading detected. Pages usually benefit from one clear top heading that states the topic.',
      riskBand: 'low',
      riskWhy: 'Visitors may feel unclear what the page is about — weak topical signal.',
      remedy: 'Add a single descriptive H1 near the top of main content.',
      lens: 'visibility',
    })
  } else if (h1Count > 1) {
    push(findings, {
      id: 'seo-h1-many',
      category: 'seo',
      title: 'Multiple H1 headings',
      detail: `We counted ${h1Count} H1 elements — many sites prefer exactly one main H1 per page.`,
      riskBand: 'low',
      riskWhy: 'Extra H1s can dilute the main topic signal if they compete.',
      remedy: 'Demote secondary headings to H2/H3 unless design truly needs multiple top headings.',
      lens: 'visibility',
    })
  }

  const headers = page.responseHeaders
  const get = (k: string) => headers.get(k) ?? headers.get(k.toLowerCase())

  const https = finalParsed.protocol === 'https:'
  if (!https) {
    push(findings, {
      id: 'sec-https',
      category: 'security',
      title: 'HTTPS',
      detail:
        'Final URL is not HTTPS. Without encryption, passwords and cookies travel in cleartext on many networks.',
      riskBand: 'high',
      riskWhy: 'Higher chance of snooping or tampering on public Wi‑Fi and weak networks.',
      remedy: 'Serve the site over HTTPS and redirect HTTP visitors to HTTPS.',
      lens: 'defense',
    })
  } else {
    push(findings, {
      id: 'sec-https-ok',
      category: 'security',
      title: 'HTTPS',
      detail: 'We ended on HTTPS — transportation is encrypted for typical browsers.',
      riskBand: 'low',
      riskWhy: 'Baseline protection against casual network snooping.',
      remedy: 'Keep certificates renewed and redirect HTTP to HTTPS everywhere.',
      lens: 'defense',
      severity: 'good',
    })
  }

  const hsts = get('strict-transport-security')
  if (https && !hsts) {
    push(findings, {
      id: 'sec-hsts',
      category: 'security',
      title: 'Strict Transport Security (HSTS)',
      detail:
        'No HSTS header on this HTTPS response. HSTS tells browsers to prefer HTTPS automatically on future visits.',
      riskBand: 'medium',
      riskWhy:
        'Without HSTS, some downgrade or sslstrip-style tricks remain easier on misconfigured links.',
      remedy: 'Add Strict-Transport-Security with a cautious max-age rollout.',
      lens: 'defense',
    })
  } else if (https && hsts) {
    push(findings, {
      id: 'sec-hsts-ok',
      category: 'security',
      title: 'HSTS header present',
      detail: 'Browsers get a prompt to stick with HTTPS on return visits.',
      riskBand: 'low',
      riskWhy: 'Shrinks window for accidental HTTP connections.',
      remedy: 'Tune max-age gradually and understand preload implications before opting in.',
      lens: 'defense',
      severity: 'good',
    })
  }

  const csp = get('content-security-policy')
  if (!csp) {
    push(findings, {
      id: 'sec-csp',
      category: 'security',
      title: 'Content Security Policy (CSP)',
      detail:
        'No Content-Security-Policy header found. CSP reduces risky inline scripts and unexpected asset loads.',
      riskBand: 'medium',
      riskWhy:
        'Without CSP, XSS issues (if they ever appear) are easier to weaponize in browsers.',
      remedy: 'Introduce a CSP in report-only mode first, then tighten based on real asset needs.',
      lens: 'defense',
    })
  } else if (/unsafe-inline/i.test(csp) || /\*/g.test(csp)) {
    push(findings, {
      id: 'sec-csp-loose',
      category: 'security',
      title: 'CSP exists but looks permissive',
      detail:
        'CSP is present but contains broad patterns (like unsafe-inline or wildcards) that weaken protection.',
      riskBand: 'medium',
      riskWhy: 'Attackers get more room if a script injection bug exists.',
      remedy: 'Remove unsafe-inline where possible and scope domains narrowly.',
      detailTechnical: `CSP snapshot (truncated): ${csp.slice(0, 240)}${csp.length > 240 ? '…' : ''}`,
      lens: 'defense',
    })
  } else {
    push(findings, {
      id: 'sec-csp-ok',
      category: 'security',
      title: 'CSP header present',
      detail: 'A Content-Security-Policy header exists — good baseline for reducing XSS blast radius.',
      riskBand: 'low',
      riskWhy: 'Browsers get explicit rules about what can run or load.',
      remedy: 'Iterate carefully when adding third-party widgets.',
      lens: 'defense',
      severity: 'good',
    })
  }

  const xfo = get('x-frame-options')
  const frameAncestors = csp && /frame-ancestors[^;]+/i.test(csp)
  if (!frameAncestors && !xfo) {
    push(findings, {
      id: 'sec-framing',
      category: 'security',
      title: 'Clickjacking protections',
      detail:
        'No X-Frame-Options and no CSP frame-ancestors directive spotted — embedding may be easier.',
      riskBand: 'medium',
      riskWhy:
        'Attackers sometimes lure users into invisible iframes to hijack clicks on sensitive actions.',
      remedy: 'Prefer CSP frame-ancestors none or specific allowlists.',
      lens: 'defense',
    })
  } else {
    push(findings, {
      id: 'sec-framing-ok',
      category: 'security',
      title: 'Framing controls',
      detail:
        frameAncestors
          ? 'CSP frame-ancestors appears to control iframe embedding.'
          : 'X-Frame-Options is present — legacy clickjacking mitigation.',
      riskBand: 'low',
      riskWhy: 'Harder to trap the site in surprise embeds.',
      remedy: 'Prefer modern CSP framing rules long-term.',
      lens: 'defense',
      severity: 'good',
    })
  }

  const refPol = get('referrer-policy')
  if (!refPol) {
    push(findings, {
      id: 'sec-referrer',
      category: 'security',
      title: 'Referrer policy',
      detail:
        'No Referrer-Policy header — browsers fall back to defaults that may leak full URLs cross-origin.',
      riskBand: 'low',
      riskWhy: 'Sensitive paths or tokens in URLs can leak to third parties via Referer.',
      remedy: 'Set Referrer-Policy to match how much URL data you want to share.',
      lens: 'defense',
    })
  }

  const ppc = get('permissions-policy') ?? get('feature-policy')
  if (!ppc) {
    push(findings, {
      id: 'sec-perms',
      category: 'security',
      title: 'Permissions Policy',
      detail:
        'No Permissions-Policy header — browser features (camera, mic, geolocation) default wide open unless constrained elsewhere.',
      riskBand: 'low',
      riskWhy: 'Third-party scripts could request powerful APIs if other protections fail.',
      remedy: 'Explicitly disable powerful features you do not need.',
      lens: 'defense',
    })
  }

  const cookieLines = collectSetCookie(headers)
  if (cookieLines.length > 0) {
    let fragile = false
    for (const line of cookieLines) {
      const lower = line.toLowerCase()
      const secure = lower.includes('secure')
      const httpOnly = lower.includes('httponly')
      const sameSite = lower.includes('samesite')
      if (https && !secure) fragile = true
      if (!httpOnly && /session|auth|token/i.test(line)) fragile = true
      if (!sameSite) fragile = true
    }
    if (fragile) {
      push(findings, {
        id: 'sec-cookie-flags',
        category: 'security',
        title: 'Cookie flags',
        detail:
          'Some Set-Cookie headers look missing Secure, HttpOnly, or SameSite attributes — depending on what the cookie does, that can increase risk.',
        riskBand: 'medium',
        riskWhy:
          'Session cookies without HttpOnly are easier to steal via certain script bugs; missing Secure can leak them over HTTP mistakes.',
        remedy: 'Add Secure + HttpOnly for auth cookies and choose an explicit SameSite policy.',
        lens: 'defense',
      })
    }
  }

  const server = get('server')
  if (server) {
    push(findings, {
      id: 'sec-server-banner',
      category: 'security',
      title: 'Server banner',
      detail: `The Server header advertises “${server}”. That is normal but tells attackers what software to research.`,
      riskBand: 'low',
      riskWhy: 'Information disclosure makes targeted probing slightly easier — rarely catastrophic alone.',
      remedy: 'Trim verbose banners at the edge if your hosting stack allows it.',
      detailTechnical: `Server: ${server}`,
      lens: 'defense',
    })
  }

  const pathname = finalParsed.pathname || '/'
  addAiFindings($, findings, pathname, robotsResult)

  const seoScore = scoreBucketForCategory(findings, 'seo')
  const securityScore = scoreBucketForCategory(findings, 'security')
  const aiScore = scoreBucketForCategory(findings, 'ai')

  const meta: ScanMeta = {
    statusCode: page.statusCode,
    serverBanner: server ?? 'Not advertised',
    tlsNote: https
      ? 'HTTPS endpoint observed on the final hop — certificate chain not deeply validated in this pass.'
      : 'Final hop was not HTTPS — encryption may be missing for visitors.',
    contentType: page.contentType || 'unknown',
    finalUrl,
    redirectCount: page.redirectCount,
  }

  return {
    canonicalUrl: canonicalInput,
    seoScore,
    securityScore,
    aiScore,
    findings,
    meta,
  }
}

function addAiFindings(
  $: ReturnType<typeof load>,
  findings: ScanFinding[],
  pathname: string,
  robotsResult: RobotsFetchResult,
) {
  const jsonLdCount = $('script[type="application/ld+json"]').length
  if (jsonLdCount > 0) {
    push(findings, {
      id: 'ai-jsonld-present',
      category: 'ai',
      lens: 'assistants',
      title: 'Structured data (JSON-LD) on the page',
      detail: `We found ${jsonLdCount} JSON-LD script block(s). Assistants and rich surfaces often reuse machine-readable facts when they are accurate.`,
      riskBand: 'low',
      riskWhy: 'Clear facts can be cited more consistently than scraped guesses.',
      remedy: 'Keep JSON-LD aligned with what visitors actually see on the page.',
      severity: 'good',
    })
  } else {
    push(findings, {
      id: 'ai-jsonld-absent',
      category: 'ai',
      lens: 'assistants',
      title: 'No JSON-LD blocks on this HTML response',
      detail:
        'We did not see application/ld+json scripts here. Some assistants prefer explicit structured entities — absence is not fatal, just less explicit.',
      riskBand: 'low',
      riskWhy: 'Systems may rely more on plain text when structured facts are missing.',
      remedy: 'Add JSON-LD where it genuinely describes your primary entity or content type.',
      severity: 'info',
    })
  }

  if (!robotsResult.ok && robotsResult.reason === 'not_found') {
    push(findings, {
      id: 'ai-robots-missing',
      category: 'ai',
      lens: 'assistants',
      title: 'robots.txt not found at the root we checked',
      detail:
        'Some crawlers assume permissive defaults when no file exists; others apply their own policies. This is informational — not a ranking score.',
      riskBand: 'low',
      riskWhy: 'You have no single published rules file for bots that honor robots.txt.',
      remedy: 'Add a robots.txt if you want explicit crawl guidance at the domain root.',
      severity: 'info',
    })
    return
  }

  if (!robotsResult.ok) {
    const why =
      robotsResult.reason === 'timeout'
        ? 'Fetching robots.txt timed out.'
        : robotsResult.reason === 'redirect'
          ? 'robots.txt responded with a redirect — we do not follow redirects for this file in v1.'
          : 'We could not read robots.txt reliably for this scan.'
    push(findings, {
      id: 'ai-robots-unreadable',
      category: 'ai',
      lens: 'assistants',
      title: 'Could not read robots.txt',
      detail: `${why} Assistant-oriented checks that rely on that file are skipped.`,
      riskBand: 'low',
      riskWhy: 'We cannot describe crawler rules we did not observe.',
      remedy: 'Ensure /robots.txt returns plain text at the site root without blocking our fetch.',
      severity: 'info',
    })
    return
  }

  const checks = checkAiCrawlers(robotsResult.text, pathname)
  const blocked = checks.filter((c) => c.blocked)
  if (blocked.length > 0) {
    const listed = blocked.map((b) => b.agent).join(', ')
    const wild = blocked.some((b) => b.matchedWildcard)
    const band: RiskBand = blocked.length >= 6 ? 'high' : 'medium'
    push(findings, {
      id: 'ai-robots-path-blocked',
      category: 'ai',
      lens: 'assistants',
      title: 'robots.txt may restrict crawlers on this URL path',
      detail: `For “${pathname}”, these user-agents look disallowed by rules we parsed: ${listed}. Bots differ — some ignore robots.txt for certain products — so treat this as an observed file, not proof about every assistant experience.`,
      riskBand: band,
      riskWhy:
        'When reputable crawlers honor your rules, parts of your site may not feed training or retrieval surfaces that respect robots.',
      remedy: 'If blocking was unintentional for public marketing pages, loosen relevant Disallow lines after reviewing policy.',
      detailTechnical: wild ? 'Some matches used User-agent: * rules.' : undefined,
    })
  } else {
    push(findings, {
      id: 'ai-robots-path-open',
      category: 'ai',
      lens: 'assistants',
      title: 'robots.txt allows this path for the crawlers we checked',
      detail:
        'Parsed rules did not block the scanned path for our curated assistant-related user-agents (including wildcard rules). This does not guarantee inclusion anywhere — only what the file suggests.',
      riskBand: 'low',
      riskWhy: 'No explicit Disallow match showed up for this URL path in our parser.',
      remedy: 'Revisit robots.txt whenever you launch new sections that should stay public or private.',
      severity: 'good',
    })
  }
}

