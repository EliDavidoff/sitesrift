import {
  ArrowRight,
  ChevronDown,
  ExternalLink,
  Gauge,
  Lock,
  Loader2,
  Mail,
  MousePointerSquareDashed,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { JSX } from 'react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { AnimatedUrlHint } from './components/AnimatedUrlHint.tsx'
import { ScanMetaChip } from './components/ScanMetaChip.tsx'
import { SiteFooter } from './components/SiteFooter.tsx'
import { ScanSnapshotHero } from './components/ScanSnapshotHero.tsx'
import { cn } from './lib/cn.ts'
import { deductionsList } from './lib/score-breakdown.ts'
import { parseScanNdjsonStream } from './lib/scan-ndjson.ts'
import { DEDUCTION_BY_BAND } from './lib/scoring-rubric.ts'
import { buildScanSnapshotModel } from './lib/scan-summary.ts'
import { scanStageIndex } from './lib/scan-stages.ts'
import type { RiskBand, RiskLens, ScanFinding, ScanReport, Severity } from './lib/scan-types.ts'

/** Replace these with your real donation + contact links */
const CONTACT_EMAIL = 'hello@sitesrift.com'
const PAYPAL_DONATE_URL = 'https://www.paypal.com/donate/'
const MAILTO_CONTACT = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Sitesrift full report')}&body=${encodeURIComponent('Hi — here is my URL and donation receipt info:\n\nURL:\nReceipt reference:\n')}`

/** Lines up with server scan-stage stream order (see scan-stages.ts) */
const LIVE_NARRATION = [
  {
    title: 'Validating and normalizing the URL',
    sub: 'We enforce HTTPS for typing convenience and reject unsafe hosts before any fetch.',
  },
  {
    title: 'Fetching the public page',
    sub: 'One GET — redirects follow only up to our cap — then we read the HTML envelope.',
  },
  {
    title: 'Reading robots.txt',
    sub: 'Same host as the final address — small file cap — so crawl rules match the URL you scanned.',
  },
  {
    title: 'Running checks',
    sub: 'SEO, security headers/cookies, and assistant heuristics — all from that single pass.',
  },
] as const

const FINDINGS_BUCKET_LABEL: Record<'ai' | 'seo' | 'security', string> = {
  seo: 'SEO',
  security: 'Security',
  ai: 'AI & assistants',
}

function lensLabel(lens: RiskLens): string {
  switch (lens) {
    case 'visibility':
      return 'findability'
    case 'defense':
      return 'defense'
    case 'assistants':
      return 'assistants'
    default:
      return lens
  }
}

type Phase = 'idle' | 'scanning' | 'report'

/** Minimum time on the scanning panel so fast responses do not flash past unread narration */
const MIN_SCAN_DWELL_MS = 2000

function sleepWithAbort(ms: number, signal: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const id = window.setTimeout(finish, ms)
    function finish() {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }
    function onAbort() {
      clearTimeout(id)
      signal.removeEventListener('abort', onAbort)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal.addEventListener('abort', onAbort)
  })
}

function normalizeUrlCandidate(raw: string): { ok: true; url: string } | { ok: false; message: string } {
  const trimmed = raw.trim()
  if (!trimmed)
    return { ok: false, message: 'Enter a URL — something like apple.com.' }

  const hasProto = /^https?:\/\//i.test(trimmed)
  let candidate = hasProto ? trimmed : `https://${trimmed}`
  candidate = candidate.replace(/^http:\/\//i, 'https://')

  try {
    const parsed = new URL(candidate)
    if (!parsed.hostname || parsed.hostname.includes(' '))
      return { ok: false, message: 'That host name does not quite look reachable.' }

    return { ok: true, url: candidate }
  } catch {
    return { ok: false, message: 'We could not normalize that URL. Try copying it again.' }
  }
}

function severityStyles(sev: Severity) {
  switch (sev) {
    case 'good':
      return 'text-good border-good/35 bg-good-bg ring-1 ring-inset ring-good/15'
    case 'info':
      return 'text-info border-info/35 bg-info-bg ring-1 ring-inset ring-info/18'
    case 'warn':
      return 'text-warn border-warn/45 bg-warn-bg ring-1 ring-inset ring-warn/20'
    case 'bad':
      return 'text-bad border-bad/38 bg-bad-bg ring-1 ring-inset ring-bad/18'
    default:
      return 'text-muted border-border bg-panel'
  }
}

function riskBandStyles(band: RiskBand) {
  switch (band) {
    case 'high':
      return 'border-bad/45 bg-bad-bg text-bad'
    case 'medium':
      return 'border-warn/45 bg-warn-bg text-warn'
    default:
      return 'border-info/35 bg-info-bg text-info'
  }
}

function severityDotColor(sev: Severity) {
  switch (sev) {
    case 'good':
      return 'bg-good shadow-[0_0_0_4px] shadow-good/15'
    case 'info':
      return 'bg-info shadow-[0_0_0_4px] shadow-info/14'
    case 'warn':
      return 'bg-warn shadow-[0_0_0_4px] shadow-warn/17'
    case 'bad':
      return 'bg-bad shadow-[0_0_0_4px] shadow-bad/18'
    default:
      return 'bg-muted'
  }
}

function SeverityDot({ severity }: { severity: Severity }) {
  return (
    <span
      className={cn(
        'mr-3 mt-2 inline-flex h-2.5 w-2.5 flex-none shrink-0 rounded-full',
        severityDotColor(severity),
      )}
      aria-hidden
    />
  )
}

function ScoreTile({
  title,
  value,
  subtitle,
  prefersReducedMotion,
}: {
  title: string
  value: number
  subtitle: string
  prefersReducedMotion: boolean | null
}) {
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-border bg-panel px-6 py-5 text-left shadow-inner shadow-black/30">
      <div className="pointer-events-none absolute inset-[-40%] bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.12),transparent_55%)]" />
      <p className="font-mono text-[11px] font-medium uppercase tracking-[0.35em] text-muted">
        {title}
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <p className="font-mono text-5xl font-semibold tracking-tight text-foreground tabular-nums">
          {value}
        </p>
        <p className="font-mono text-sm text-accent">/{100}</p>
      </div>
      <p className="mt-3 font-mono text-xs leading-relaxed text-muted">{subtitle}</p>
      {!prefersReducedMotion ? (
        <motion.div
          layout
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-accent/45 to-transparent"
          initial={{ opacity: 0.6 }}
          animate={{ opacity: [0.4, 0.95, 0.45], x: [-20, 0, 24] }}
          transition={{ repeat: Infinity, duration: 4.9, ease: 'easeInOut' }}
        />
      ) : (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent opacity-85" />
      )}
    </div>
  )
}

function ScoreHowItWorks({ report }: { report: ScanReport }) {
  const pillars = [
    { key: 'seo' as const, label: 'SEO posture', score: report.seoScore },
    { key: 'security' as const, label: 'Security posture', score: report.securityScore },
    { key: 'ai' as const, label: 'Assistant readiness', score: report.aiScore },
  ]

  return (
    <details className="mt-8 rounded-[var(--radius-card)] border border-border bg-panel/80 px-6 py-5 text-left shadow-inner shadow-black/25 backdrop-blur-sm md:px-8 md:py-6">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-mono text-sm text-foreground [&::-webkit-details-marker]:hidden">
        <span className="uppercase tracking-[0.28em] text-muted">Score checklist</span>
        <span className="inline-flex items-center gap-2 text-accent">
          How these numbers work
          <ChevronDown className="size-4 shrink-0 opacity-90" aria-hidden />
        </span>
      </summary>
      <div className="mt-6 space-y-6 font-mono text-sm leading-relaxed text-muted">
        <p>
          Each pillar starts at <span className="text-foreground">100</span>. We subtract points for findings that are{' '}
          <strong className="font-semibold text-foreground">not</strong> marked{' '}
          <span className="text-good">good</span> — a checklist from what we observed, not a verdict from Google or any
          single AI provider.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <span className="text-bad">High</span> risk −{DEDUCTION_BY_BAND.high} ·{' '}
            <span className="text-warn">Medium</span> −{DEDUCTION_BY_BAND.medium} ·{' '}
            <span className="text-info">Low</span> −{DEDUCTION_BY_BAND.low}
          </li>
          <li>
            Rows marked <span className="text-good">good</span> subtract 0 — we still show them as helpful confirmations.
          </li>
        </ul>
        <p className="text-[13px] text-muted">
          If you see <span className="font-medium text-foreground">noindex</span> under SEO, many assistants treat that
          as “not meant for broad public indexing” — overlap between search and assistant readiness, not two separate
          bugs.
        </p>
        <div className="grid gap-8 md:grid-cols-3">
          {pillars.map((p) => {
            const rows = deductionsList(report.findings, p.key)
            return (
              <div key={p.key}>
                <p className="border-b border-border pb-2 font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
                  {p.label} · <span className="tabular-nums text-foreground">{p.score}</span>/100
                </p>
                {rows.length === 0 ? (
                  <p className="mt-3 text-[13px] text-muted">No deductions — only positives or light notes here.</p>
                ) : (
                  <ul className="mt-3 space-y-2 text-[13px]">
                    {rows.map((r) => (
                      <li key={r.id} className="border-l-2 border-accent/35 pl-3">
                        <span className="tabular-nums text-accent">−{r.points}</span>{' '}
                        <span className="text-foreground">{r.title}</span>{' '}
                        <span className="text-muted">({r.riskBand})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </details>
  )
}

function FindingRow({ finding, index }: { finding: ScanFinding; index: number }) {
  const detailId = `${finding.id}-detail`
  return (
    <details
      id={finding.id}
      className="group rounded-xl border border-border bg-well/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl"
      open={index === 0}
    >
      <summary className="flex cursor-pointer list-none gap-4 px-5 py-[18px] text-left [&::-webkit-details-marker]:hidden focus-visible:[outline:solid] outline-offset-[-2px]">
        <SeverityDot severity={finding.severity} />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.34em] text-muted">
              {finding.category} · {lensLabel(finding.lens)}
            </p>
            <span
              className={cn(
                'rounded-full border px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em]',
                severityStyles(finding.severity),
              )}
            >
              {finding.severity}
            </span>
            <span
              className={cn(
                'rounded-full border px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em]',
                riskBandStyles(finding.riskBand),
              )}
            >
              Risk · {finding.riskBand}
            </span>
          </div>
          <p className="text-base leading-snug text-foreground">{finding.title}</p>
          <p className="text-sm leading-relaxed text-muted">{finding.riskWhy}</p>
        </div>
        <div className="ml-auto flex-none font-mono text-xs text-accent">
          <span className="opacity-85 transition-colors group-hover:opacity-100 group-open:hidden">+</span>
          <span className="hidden group-open:inline-flex">−</span>
        </div>
      </summary>
      <div
        id={detailId}
        className="space-y-4 border-t border-white/10 px-5 pb-[18px] pt-4 text-left text-[15px] leading-relaxed text-muted"
      >
        <p>{finding.detail}</p>
        <div className="rounded-lg border border-border bg-well/90 px-4 py-3 font-mono text-sm text-foreground">
          <span className="text-accent">Next step · </span>
          {finding.remedy}
        </div>
        {finding.detailTechnical ? (
          <details className="rounded-lg border border-dashed border-border bg-black/25 px-4 py-3 font-mono text-xs text-muted">
            <summary className="cursor-pointer text-accent">Technical detail</summary>
            <p className="mt-3 whitespace-pre-wrap">{finding.detailTechnical}</p>
          </details>
        ) : null}
      </div>
    </details>
  )
}

function ScanningPanel({
  stepIndex,
  prefersReducedMotion,
}: {
  stepIndex: number
  prefersReducedMotion: boolean | null
}) {
  const liveId = useId()
  const idx = stepIndex % LIVE_NARRATION.length
  const active = LIVE_NARRATION[idx]

  return (
    <motion.div
      layout
      className="mx-auto mt-14 w-full max-w-xl rounded-[var(--radius-card)] border border-border bg-panel px-10 py-10 text-left shadow-glow-accent"
      initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.43, ease: [0.16, 1, 0.3, 1] }}
      role="status"
      aria-live="polite"
      aria-labelledby={liveId}
    >
      <p id={liveId} className="sr-only">
        Scan in progress — {active.title}.
      </p>
      <div className="flex items-center gap-4">
        <div className="relative flex size-14 items-center justify-center rounded-2xl border border-accent/40 bg-well">
          <div className="absolute inset-[3px] rounded-[14px] border border-accent/30" aria-hidden />
          <Loader2 className="size-8 text-accent" strokeWidth={1.85} aria-hidden />
          <motion.span
            className="pointer-events-none absolute inset-[-10px] rounded-3xl border border-accent/15"
            animate={
              prefersReducedMotion
                ? undefined
                : { rotate: [0, 320, 680], opacity: [0.3, 0.12, 0.28] }
            }
            transition={{ repeat: Infinity, duration: 5.9, ease: 'linear' }}
          />
        </div>
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.42em] text-muted">What we are doing</p>
          <p className="mt-3 font-mono text-lg tracking-tight text-foreground">{active.title}</p>
          <p className="mt-2 font-sans text-sm leading-relaxed text-muted">{active.sub}</p>
        </div>
      </div>
      <div className="mt-8 grid gap-3">
        {LIVE_NARRATION.map((step, i) => {
          const done = i < idx
          const current = i === idx
          return (
            <div key={step.title} className="flex items-center gap-3">
              <span
                className={cn(
                  'flex size-[11px] items-center justify-center rounded-full ring-4 ring-well',
                  done && 'border border-accent/60 bg-accent/80 shadow-[0_0_28px_-4px_rgb(34,211,238)]',
                  current &&
                    !done &&
                    'border border-accent bg-accent animate-pulse shadow-[0_0_48px_-6px_rgb(34,211,238)]',
                  !done &&
                    !current &&
                    'border border-white/14 bg-well',
                )}
                aria-hidden
              />
              <p
                className={cn(
                  'flex-1 font-mono text-sm',
                  i <= idx ? 'text-foreground' : 'text-muted',
                )}
              >
                {step.title}
              </p>
            </div>
          )
        })}
      </div>
      <p className="mt-8 rounded-lg border border-dashed border-border bg-well/85 px-4 py-3 font-mono text-xs leading-snug text-muted">
        We only fetch what is needed for this readout — no aggressive crawling, no password guessing.
      </p>
    </motion.div>
  )
}

const riskWeight = (b: RiskBand) => (b === 'high' ? 3 : b === 'medium' ? 2 : 1)

export default function InspectorApp() {
  const prefersReducedMotion = useReducedMotion()
  const headerRef = useRef<HTMLElement>(null)
  const reportRef = useRef<HTMLElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const [phase, setPhase] = useState<Phase>('idle')
  const [draftUrl, setDraftUrl] = useState('')
  const [urlBarFocused, setUrlBarFocused] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)

  const [scanPhaseIndex, setScanPhaseIndex] = useState(0)
  /** `server` = NDJSON stage events drive the checklist; `timer` = rotate narration while waiting */
  const [scanProgressMode, setScanProgressMode] = useState<'timer' | 'server'>('timer')
  const [report, setReport] = useState<ScanReport | null>(null)

  const heroCopy = useMemo(
    () => ({
      eyebrow: 'Sitesrift inspector',
      title: 'Point. Scan. Read the fracture lines.',
      sub:
        'SEO hygiene, browser-facing security, and honest assistant signals (robots + structured data hints) — not a PDF, not a “% chance to appear in ChatGPT.”',
      legal:
        'We open your public page once, read the HTML, and try the site robots file. Scores are checklists from what we could see — not promises.',
    }),
    [],
  )

  const landingHeroContainerVariants = useMemo(
    () => ({
      hidden: {},
      visible: prefersReducedMotion
        ? {}
        : {
            transition: {
              staggerChildren: 0.09,
              delayChildren: 0.05,
            },
          },
    }),
    [prefersReducedMotion],
  )

  const landingHeroItemVariants = useMemo(
    () => ({
      hidden: prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 },
      visible: prefersReducedMotion
        ? { opacity: 1, y: 0 }
        : {
            opacity: 1,
            y: 0,
            transition: { duration: 0.52, ease: [0.16, 1, 0.3, 1] as const },
          },
    }),
    [prefersReducedMotion],
  )

  useEffect(() => {
    if (phase !== 'scanning') return
    if (scanProgressMode !== 'timer') return
    const tick = prefersReducedMotion ? 2200 : 1600
    const id = window.setInterval(() => {
      setScanPhaseIndex((v) => (v + 1) % LIVE_NARRATION.length)
    }, tick)
    return () => clearInterval(id)
  }, [phase, scanProgressMode, prefersReducedMotion])

  useEffect(() => {
    if (phase !== 'report') return
    const id = requestAnimationFrame(() => {
      reportRef.current?.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start',
      })
    })
    return () => cancelAnimationFrame(id)
  }, [phase, report, prefersReducedMotion])

  const resetSession = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setDraftUrl('')
    setPhase('idle')
    setReport(null)
    setSubmissionError(null)
    setScanPhaseIndex(0)
    setScanProgressMode('timer')
  }, [])

  const handleInspect = async () => {
    setSubmissionError(null)
    headerRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    })

    const normalized = normalizeUrlCandidate(draftUrl)
    if (!normalized.ok) {
      setSubmissionError(normalized.message)
      return
    }

    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    setScanPhaseIndex(0)
    setScanProgressMode('timer')
    setReport(null)
    setPhase('scanning')
    const scanStartedAt = performance.now()

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/x-ndjson, application/json',
        },
        body: JSON.stringify({ url: normalized.url }),
        signal: ac.signal,
      })

      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as { error?: string }
        setSubmissionError(
          typeof errJson.error === 'string' ? errJson.error : 'That scan could not finish — try another URL.',
        )
        setPhase('idle')
        return
      }

      const ct = res.headers.get('content-type') ?? ''
      let data: ScanReport

      try {
        if (ct.includes('ndjson')) {
          setScanProgressMode('server')
          data = await parseScanNdjsonStream(res, (stage) => {
            setScanPhaseIndex(scanStageIndex(stage))
          })
        } else {
          data = (await res.json()) as ScanReport
        }
      } catch (parseErr) {
        setScanProgressMode('timer')
        const msg = parseErr instanceof Error ? parseErr.message : 'Scan failed.'
        setSubmissionError(msg)
        setPhase('idle')
        return
      }

      const elapsed = performance.now() - scanStartedAt
      try {
        await sleepWithAbort(Math.max(0, MIN_SCAN_DWELL_MS - elapsed), ac.signal)
      } catch {
        return
      }

      setReport(data)
      setPhase('report')
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      if (e instanceof Error && e.name === 'AbortError') return
      setSubmissionError('Network hiccup — check your connection and try again.')
      setPhase('idle')
    }
  }

  const topRisks = useMemo(() => {
    if (!report) return []
    return [...report.findings]
      .filter((f) => f.severity !== 'good')
      .sort((a, b) => riskWeight(b.riskBand) - riskWeight(a.riskBand))
      .slice(0, 3)
  }, [report])

  const snapshotModel = useMemo(
    () => (report ? buildScanSnapshotModel(report) : null),
    [report],
  )

  let body: JSX.Element | null

  if (phase === 'scanning') {
    body = (
      <ScanningPanel stepIndex={scanPhaseIndex} prefersReducedMotion={prefersReducedMotion} />
    )
  } else if (phase === 'report' && report) {
    body = (
      <motion.section
        ref={reportRef}
        className="mt-14 w-full scroll-mt-28 text-left"
        initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: prefersReducedMotion ? 0 : 0.52,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        <div className="flex flex-col gap-4 border-b border-border pb-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl space-y-4">
            {snapshotModel ? (
              <ScanSnapshotHero model={snapshotModel} prefersReducedMotion={prefersReducedMotion} />
            ) : null}
            <p className="font-mono text-sm leading-relaxed text-accent/90">
              Typed · {report.canonicalUrl}
            </p>
            <p className="font-mono text-sm leading-relaxed text-muted">
              Landed on · {report.meta.finalUrl}
            </p>
            <div className="flex flex-wrap gap-3 pt-4">
              <ScanMetaChip
                helpLabel="HTTP response status"
                hint="HTTP status from our single GET to this URL after following redirects up to the scanner’s limit. For example, 200 means the server returned a response successfully."
              >
                Response <span className="text-foreground">{report.meta.statusCode}</span>
              </ScanMetaChip>
              <ScanMetaChip
                helpLabel="Redirect hops"
                hint="How many HTTP redirects we followed before reaching the final URL in this report. Fewer hops usually mean a simpler landing URL."
              >
                Redirect hops <span className="text-foreground">{report.meta.redirectCount}</span>
              </ScanMetaChip>
              <ScanMetaChip
                helpLabel="Content-Type header"
                hint="MIME type declared for the response body we analyzed. This snapshot expects HTML; other types may limit what we could inspect."
              >
                Content-Type <span className="break-all text-foreground">{report.meta.contentType}</span>
              </ScanMetaChip>
              <ScanMetaChip
                helpLabel="Server header"
                hint="A rough signal from the Server response header when the origin sends one—often a CDN or stack hint, not a complete infrastructure inventory."
              >
                Edge server <span className="capitalize text-foreground">{report.meta.serverBanner}</span>
              </ScanMetaChip>
              <ScanMetaChip
                variant="stretch"
                helpLabel="HTTPS observation"
                hint="Summarizes what we could observe about HTTPS on this pass from headers and transport—not a full certificate audit or penetration test."
              >
                {report.meta.tlsNote}
              </ScanMetaChip>
              {report.meta.scanDurationMs != null ? (
                <ScanMetaChip
                  helpLabel="Server timing"
                  hint="Wall-clock time for the server to complete this scan (milliseconds), when the API reports it."
                >
                  Server pass <span className="tabular-nums text-foreground">{report.meta.scanDurationMs}</span> ms
                </ScanMetaChip>
              ) : null}
            </div>
          </div>
          <motion.button
            type="button"
            onClick={resetSession}
            className="mt-8 inline-flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-panel px-6 py-[14px] font-mono text-sm text-foreground transition hover:border-accent hover:text-accent md:mt-0 md:w-auto"
            whileHover={prefersReducedMotion ? undefined : { y: -1 }}
            transition={{ duration: 0.2 }}
          >
            <ShieldCheck aria-hidden size={17} strokeWidth={1.7} />
            New scan
          </motion.button>
        </div>

        {topRisks.length > 0 ? (
          <div className="mt-10 rounded-[var(--radius-card)] border border-border bg-well/90 px-6 py-6 md:px-8">
            <p className="font-mono text-xs uppercase tracking-[0.42em] text-muted">Top risks to eyeball</p>
            <ul className="mt-4 grid gap-3 md:grid-cols-3">
              {topRisks.map((f) => (
                <li key={f.id} className="rounded-xl border border-border bg-panel px-4 py-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
                    Risk · {f.riskBand}
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">{f.title}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted">{f.riskWhy}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <ScoreTile
            title="SEO posture"
            value={report.seoScore}
            subtitle="Based on titles, previews, canonical hints, mobile viewport — not keyword rankings."
            prefersReducedMotion={prefersReducedMotion}
          />
          <ScoreTile
            title="Security posture"
            value={report.securityScore}
            subtitle="Based on HTTPS signals and headers we could read from one response — not penetration testing."
            prefersReducedMotion={prefersReducedMotion}
          />
          <ScoreTile
            title="Assistant readiness"
            value={report.aiScore}
            subtitle="Heuristic checklist: robots.txt path rules + JSON-LD we saw — not a prediction of chat mentions."
            prefersReducedMotion={prefersReducedMotion}
          />
        </div>

        <ScoreHowItWorks report={report} />

        <div className="mt-12 grid gap-10 xl:grid-cols-3">
          {(['seo', 'security', 'ai'] as const).map((bucket) => (
            <div key={bucket} id={`findings-${bucket}`} className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-3">
                {bucket === 'seo' ? (
                  <Gauge className="size-7 text-accent" strokeWidth={1.7} aria-hidden />
                ) : bucket === 'security' ? (
                  <MousePointerSquareDashed className="size-7 text-accent" strokeWidth={1.7} aria-hidden />
                ) : (
                  <Sparkles className="size-7 text-accent" strokeWidth={1.7} aria-hidden />
                )}
                <h3 className="font-sans text-2xl tracking-tight text-foreground">
                  {FINDINGS_BUCKET_LABEL[bucket]} findings
                </h3>
              </div>
              <div className="flex flex-col gap-3">
                {report.findings
                  .filter((f) => f.category === bucket)
                  .sort((a, b) => riskWeight(b.riskBand) - riskWeight(a.riskBand))
                  .map((finding, index) => (
                    <FindingRow key={finding.id} finding={finding} index={index} />
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div className="relative mt-16 overflow-hidden rounded-[var(--radius-card)] border border-border bg-gradient-to-br from-panel via-well to-canvas px-10 py-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl md:px-12 md:py-12">
          <div className="pointer-events-none absolute inset-[-20%] bg-[radial-gradient(circle_at_15%_-10%,rgba(59,125,237,0.25),transparent_62%)]" />
          <div className="pointer-events-none absolute inset-0 noise-soft opacity-65" />

          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(260px,0.75fr)]">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.44em] text-muted">Full analyst packet</p>
              <h3 className="mt-6 text-balance text-3xl font-medium tracking-tight text-foreground">
                Want hands-on help after this snapshot?
              </h3>
              <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">
                Donate via PayPal if you want to support deeper work, then email us with your URL and receipt
                note. We coordinate manually — no instant PDF wizard here yet. Donations are appreciation for the
                project, not a paid SLA or guaranteed turnaround; free snapshots on this page stay illustrative
                heuristics, not warranties.
              </p>
              <ul className="mt-8 grid gap-3 font-mono text-sm text-muted">
                <li className="rounded-lg border border-border bg-well/95 px-4 py-3">
                  <span className="text-accent">01</span> · PayPal keeps the trail simple.
                </li>
                <li className="rounded-lg border border-border bg-well/95 px-4 py-3">
                  <span className="text-accent">02</span> · Email us so expectations stay human.
                </li>
              </ul>
            </div>
            <div className="flex flex-col justify-between gap-4">
              <div className="relative overflow-hidden rounded-2xl border border-border bg-black/55 p-[1px] shadow-[inset_0_0_0px_1px_rgba(255,255,255,0.06)] backdrop-blur-3xl">
                <div className="relative rounded-[calc(1rem-1px)] bg-well px-8 py-8">
                  <div className="flex items-start gap-3">
                    <Lock className="mt-1 size-6 text-accent/90" strokeWidth={1.7} aria-hidden />
                    <div>
                      <p className="font-mono text-xs uppercase tracking-[0.36em] text-muted">Teaser corpus</p>
                      <p className="mt-5 space-y-2 font-mono text-xs leading-relaxed text-muted blur-[10px]">
                        Remediation packet · Header diff playbook · Canonical graph · SSRF sniff tests ·
                        Posture regressions checklist · Appendix for engineering handoff...
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid gap-3">
                <a
                  href={PAYPAL_DONATE_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={cn(
                    'inline-flex items-center justify-center gap-3 rounded-xl border border-accent bg-accent px-8 py-[15px]',
                    'font-mono text-sm font-semibold tracking-[0.04em] text-canvas shadow-glow-accent',
                    'transition hover:-translate-y-0.5 hover:border-accent-strong hover:bg-accent-strong',
                  )}
                >
                  Donate via PayPal
                  <ExternalLink aria-hidden size={17} strokeWidth={1.7} />
                </a>
                <a
                  href={MAILTO_CONTACT}
                  className="inline-flex items-center justify-center gap-3 rounded-xl border border-border bg-panel px-8 py-[15px] font-mono text-sm text-foreground transition hover:border-accent hover:text-accent"
                >
                  Email {CONTACT_EMAIL}
                  <Mail aria-hidden size={17} strokeWidth={1.7} />
                </a>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-10 pb-8 text-center font-mono text-xs text-muted">
          Educational snapshot — not legal or pentesting advice. Assistant scores are surface signals only, not
          predictions. Validate anything critical with your team.
        </p>
      </motion.section>
    )
  } else {
    const showAnimatedUrlHint =
      phase === 'idle' && draftUrl.trim() === '' && !urlBarFocused

    body = (
      <>
        <motion.div
          className="mx-auto mt-[72px] flex w-full max-w-4xl flex-col items-center text-center"
          variants={landingHeroContainerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.p
            variants={landingHeroItemVariants}
            className="font-mono text-xs uppercase tracking-[0.46em] text-muted"
          >
            {heroCopy.eyebrow}
          </motion.p>
          <motion.h2
            variants={landingHeroItemVariants}
            className="mt-10 w-full text-pretty bg-gradient-to-b from-foreground via-foreground/90 to-muted bg-clip-text font-sans text-4xl font-medium tracking-tight text-transparent md:text-[3.06rem] md:leading-[1.06] md:tracking-tight"
          >
            {heroCopy.title}
          </motion.h2>
          <motion.p
            variants={landingHeroItemVariants}
            className="mt-8 w-full max-w-2xl text-pretty font-sans text-lg leading-snug text-muted md:text-xl"
          >
            {heroCopy.sub}
          </motion.p>
          <motion.div
            variants={landingHeroItemVariants}
            className="mt-14 flex flex-wrap justify-center gap-4"
          >
            <div className="inline-flex rounded-full border border-border bg-well/95 px-4 py-[9px] font-mono text-[11px] uppercase tracking-[0.28em] text-muted">
              Live scan · 4-stage pipeline · HTML + robots.txt
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          className="relative mx-auto mt-[56px] w-full max-w-3xl"
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: prefersReducedMotion ? 0 : 0.22,
            duration: prefersReducedMotion ? 0 : 0.5,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <label className="sr-only" htmlFor="url-bar">
            URL to inspect
          </label>
          <motion.div
            className="group relative isolate overflow-hidden rounded-[22px] border border-accent/55 bg-well/92 p-[14px] shadow-glow-accent"
            whileHover={prefersReducedMotion ? undefined : { scale: 1.004, y: -1 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.998 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
          >
            <div className="pointer-events-none absolute inset-0 animate-inspector-glow bg-[radial-gradient(circle_at_52%_-20%,rgba(34,211,238,0.22),transparent_61%)] will-change-transform" />
            <div className="pointer-events-none absolute inset-0 noise-soft opacity-80" />

            <div className="relative grid grid-cols-1 gap-4 px-6 py-10 md:grid-cols-[minmax(0,1fr)_auto] md:gap-8 md:p-14">
              <div className="inspector-url-focus flex h-14 min-w-0 items-center rounded-2xl border border-border-strong bg-black/52 px-[18px] font-mono text-base text-foreground shadow-inner shadow-black/60 md:h-[4.5rem] md:text-lg md:tracking-tight">
                <motion.span
                  className="mr-5 inline-flex shrink-0 text-accent md:mr-6"
                  aria-hidden
                  animate={
                    prefersReducedMotion || draftUrl.trim() !== '' || urlBarFocused
                      ? { scale: 1, opacity: 1 }
                      : {
                          scale: [1, 1.06, 1],
                          opacity: [0.9, 1, 0.9],
                        }
                  }
                  transition={
                    prefersReducedMotion || draftUrl.trim() !== '' || urlBarFocused
                      ? { duration: 0.2 }
                      : {
                          duration: 2.7,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }
                  }
                >
                  <ShieldCheck aria-hidden size={26} strokeWidth={1.6} />
                </motion.span>
                <div className="relative min-w-0 flex-1">
                  {showAnimatedUrlHint ? (
                    <AnimatedUrlHint
                      reducedMotion={!!prefersReducedMotion}
                      className="pointer-events-none absolute inset-y-0 left-2 right-2 flex items-center overflow-hidden text-left font-mono text-base leading-normal text-muted/55 md:text-lg"
                    />
                  ) : null}
                  <input
                    id="url-bar"
                    value={draftUrl}
                    spellCheck={false}
                    placeholder={showAnimatedUrlHint ? '' : 'stripe.com/blog'}
                    onChange={(evt) => {
                      setSubmissionError(null)
                      setDraftUrl(evt.target.value)
                    }}
                    onFocus={() => setUrlBarFocused(true)}
                    onBlur={() => setUrlBarFocused(false)}
                    onKeyDown={(evt) => {
                      if (evt.key === 'Enter') void handleInspect()
                    }}
                    autoComplete="url"
                    className={cn(
                      'relative z-[1] min-h-0 w-full rounded-none border-0 bg-transparent px-2 py-0 text-base leading-normal outline-none ring-0 focus:ring-0',
                      showAnimatedUrlHint
                        ? 'text-transparent caret-transparent'
                        : 'text-inherit caret-accent',
                    )}
                  />
                </div>
              </div>

              <motion.button
                type="button"
                disabled={draftUrl.trim() === ''}
                onClick={() => void handleInspect()}
                animate={
                  prefersReducedMotion
                    ? undefined
                    : {
                        filter:
                          draftUrl.trim() !== ''
                            ? 'brightness(1.06) saturate(1.06)'
                            : 'brightness(1) saturate(1)',
                      }
                }
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  'flex h-14 w-full items-center justify-center gap-[10px]',
                  'md:h-[4.5rem] md:w-auto md:min-w-[12rem] md:px-10',
                  'rounded-2xl border border-accent-strong bg-accent px-8',
                  'font-mono text-sm font-semibold leading-none tracking-[0.14em] text-canvas uppercase',
                  'shadow-[0_0_62px_-20px_rgb(34,211,238)] disabled:opacity-45 disabled:grayscale',
                )}
                whileHover={prefersReducedMotion ? undefined : { scale: 1.025 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
              >
                Run scan <ArrowRight size={21} aria-hidden strokeWidth={1.7} />
              </motion.button>
            </div>

            <AnimatePresence>
              {submissionError ? (
                <motion.p
                  key={submissionError}
                  initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: prefersReducedMotion ? 0 : 6 }}
                  className="relative px-[34px] pb-8 text-center font-mono text-sm text-bad md:px-[58px]"
                >
                  {submissionError}
                </motion.p>
              ) : (
                <p className="relative px-[34px] pb-[30px] text-center font-mono text-[11px] leading-relaxed text-muted md:px-[58px]">
                  HTTPS assumed when you omit the scheme · We fetch one public HTML response and try
                  robots.txt on the same host — no whole-site crawl ·{' '}
                  <button
                    type="button"
                    className="text-accent underline underline-offset-4 hover:text-accent-strong"
                    onClick={() => setDraftUrl('https://example.com')}
                  >
                    Try example.com
                  </button>
                  .
                  <span className="mt-6 block">{heroCopy.legal}</span>
                </p>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </>
    )
  }

  const statusLabel =
    phase === 'idle' ? 'Ready' : phase === 'scanning' ? 'Scanning' : 'Report ready'

  return (
    <div
      className={cn(
        'relative mx-auto flex w-[min(1180px,100%)] flex-col px-6 pb-10 text-center md:px-10',
        phase !== 'report' && 'min-h-[100svh]',
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-[-12%] bottom-0 h-[min(560px,50svh)] blur-[118px]"
        aria-hidden
      >
        <div className="h-full rounded-[420px] bg-[radial-gradient(circle,rgba(34,211,238,0.12),transparent_73%)]" />
      </div>

      <header ref={headerRef} className="sticky top-6 z-[9] isolate mb-[-10px]">
        <div className="flex items-center gap-6 rounded-[20px] border border-border-strong bg-well/93 px-[22px] py-[17px] font-mono text-xs uppercase tracking-[0.56em] text-muted shadow-[0_20px_60px_-30px_black] backdrop-blur-3xl backdrop-saturate-150">
          <div className="flex items-center gap-3 text-accent">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-pulse rounded-full bg-accent opacity-95" />
              <span className="relative inline-flex size-2.5 rounded-full border border-accent/60 bg-well" />
            </span>
            Beta
          </div>
          <div className="hidden h-[18px] w-px shrink-0 bg-border md:inline-block" />
          <span className="truncate text-muted">
            inspector <span className="text-accent/90">{statusLabel}</span>
          </span>
          <div className="ml-auto hidden items-center gap-2 font-mono text-[10px] normal-case tracking-[0.06em] text-muted md:flex">
            <Gauge strokeWidth={1.6} className="size-4 shrink-0 text-accent" aria-hidden />
            SEO · security · <Sparkles className="size-3.5 shrink-0 text-accent" aria-hidden /> assistants
          </div>
        </div>
      </header>

      <motion.main
        key={phase === 'report' ? 'report-main' : 'flow-main'}
        className={cn(
          'surface-grid relative isolate flex min-h-0 flex-col items-start overflow-hidden rounded-br-[calc(var(--radius-card)+34px)] rounded-bl-[calc(var(--radius-card)+34px)] border border-t-0 border-border bg-well/94 px-10 pt-[84px] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-lg md:px-[84px]',
          phase === 'report' ? '!h-auto grow-0' : 'flex-1',
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.section
            key={phase === 'idle' ? 'landing' : phase === 'scanning' ? 'scan' : 'report'}
            className="relative z-[1] w-full"
            initial={{
              opacity: prefersReducedMotion ? 1 : 0,
              y: prefersReducedMotion ? 0 : phase === 'scanning' ? 10 : -8,
              filter: prefersReducedMotion ? undefined : 'blur(6px)',
            }}
            animate={{
              opacity: 1,
              y: 0,
              filter: prefersReducedMotion ? undefined : 'blur(0px)',
            }}
            exit={{
              opacity: prefersReducedMotion ? 1 : 0,
              y: prefersReducedMotion ? 0 : -10,
              filter: prefersReducedMotion ? undefined : 'blur(12px)',
            }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.36, ease: [0.16, 1, 0.3, 1] }}
          >
            {body}
          </motion.section>
        </AnimatePresence>

        {!prefersReducedMotion ? (
          <motion.div
            className="pointer-events-none absolute left-[-8%] top-[30%]"
            aria-hidden
            animate={{ opacity: [0.18, 0.35, 0.19] }}
            transition={{ repeat: Infinity, duration: 7 }}
          >
            <span
              className="block h-[150px] w-[150px] rounded-full blur-[118px]"
              style={{ backgroundColor: '#22d3ee', opacity: 0.06 }}
            />
          </motion.div>
        ) : null}
      </motion.main>

      <SiteFooter className="relative z-[4]" />
    </div>
  )
}
