import {
  ArrowRight,
  ExternalLink,
  Gauge,
  Lock,
  Loader2,
  Mail,
  MousePointerSquareDashed,
  ShieldCheck,
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { JSX } from 'react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { Finding, Severity } from './lib/mock-report.ts'
import { buildMockReport } from './lib/mock-report.ts'
import { cn } from './lib/cn.ts'

/** Replace these with real donation + contact URLs when you publish */
const CONTACT_EMAIL = 'hello@sitesrift.com'
const PAYPAL_DONATE_URL = 'https://www.paypal.com/donate/'
const MAILTO_CONTACT = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Sitesrift full report')}&body=${encodeURIComponent('Hi — here is my URL and donation receipt info:\n\nURL:\nReceipt reference:\n')}`

const SCAN_PHASES = [
  'Fingerprinting hostname',
  'Fetching simulated response envelope',
  'Parsing SEO & preview signals',
  'Reviewing security headers',
] as const

type Phase = 'idle' | 'scanning' | 'report'

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
      return 'text-bad border-bad/38 bg-bad-bg ring-1 ring-inset ring-bad/20'
    default:
      return 'text-muted border-border bg-panel'
  }
}

function SeverityDot({ severity }: { severity: Severity }) {
  return (
    <span
      className={cn(
        'mr-3 mt-2 inline-flex h-2.5 w-2.5 flex-none shrink-0 rounded-full',
        severity === 'good' && 'bg-good shadow-[0_0_0_4px] shadow-good/15',
        severity === 'info' && 'bg-info shadow-[0_0_0_4px] shadow-info/14',
        severity === 'warn' && 'bg-warn shadow-[0_0_0_4px] shadow-warn/17',
        severity === 'bad' && 'bg-bad shadow-[0_0_0_4px] shadow-bad/18',
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

function FindingRow({ finding, index }: { finding: Finding; index: number }) {
  const detailId = `${finding.id}-detail`
  return (
    <details
      id={finding.id}
      className="group rounded-xl border border-border bg-well/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl"
      open={index === 0}
    >
      <summary className="flex cursor-pointer list-none gap-4 px-5 py-[18px] text-left [&::-webkit-details-marker]:hidden focus-visible:[outline:solid] outline-offset-[-2px]">
        <SeverityDot severity={finding.severity} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.34em] text-muted">
              {finding.category}
            </p>
            <span
              className={cn(
                'rounded-full border px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em]',
                severityStyles(finding.severity),
              )}
            >
              {finding.severity}
            </span>
          </div>
          <p className="text-base leading-snug text-foreground">{finding.title}</p>
        </div>
        <div className="ml-auto flex-none font-mono text-xs text-accent">
          <span className="opacity-85 transition-colors group-hover:opacity-100 group-open:hidden">+</span>
          <span className="hidden group-open:inline-flex">−</span>
        </div>
      </summary>
      <div
        id={detailId}
        className="border-t border-white/10 px-5 pb-[18px] pt-4 text-[15px] leading-relaxed text-muted"
      >
        {finding.detail}
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
  const active = SCAN_PHASES[Math.min(stepIndex, SCAN_PHASES.length - 1)] ?? ''

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
        Scanning in progress — current stage {active}.
      </p>
      <div className="flex items-center gap-4">
        <div className="relative flex size-14 items-center justify-center rounded-2xl border border-accent/40 bg-well">
          <div className="absolute inset-[3px] rounded-[14px] border border-accent/30" aria-hidden />
          <Loader2
            className="size-8 text-accent"
            strokeWidth={1.85}
            aria-hidden
          />
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
          <p className="font-mono text-xs uppercase tracking-[0.42em] text-muted">
            System status
          </p>
          <p className="mt-3 font-mono text-lg tracking-tight text-foreground">{active}</p>
        </div>
      </div>
      <div className="mt-8 grid gap-3">
        {SCAN_PHASES.map((label, idx) => {
          const done = idx < stepIndex
          const current = idx === stepIndex
          return (
            <div key={label} className="flex items-center gap-3">
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
                  idx <= stepIndex ? 'text-foreground' : 'text-muted',
                )}
              >
                {label}
              </p>
            </div>
          )
        })}
      </div>
      <p className="mt-8 rounded-lg border border-dashed border-border bg-well/85 px-4 py-3 font-mono text-xs leading-snug text-muted">
        Heads up: this sprint is illustrative only — deterministic mock output until the Phase B ingest service ships.
      </p>
    </motion.div>
  )
}

export default function App() {
  const prefersReducedMotion = useReducedMotion()
  const headerRef = useRef<HTMLElement>(null)

  const [phase, setPhase] = useState<Phase>('idle')
  const [draftUrl, setDraftUrl] = useState('')
  const [submissionError, setSubmissionError] = useState<string | null>(null)

  const [scanUrlUsed, setScanUrlUsed] = useState<string | null>(null)
  const [scanPhaseIndex, setScanPhaseIndex] = useState(0)
  const [report, setReport] = useState<ReturnType<typeof buildMockReport> | null>(null)

  const heroCopy = useMemo(
    () => ({
      eyebrow: 'Sitesrift inspector',
      title: 'Point. Scan. Read the fracture lines.',
      sub:
        'An opinionated fusion of crawl-time SEO scaffolding and surfaced security posture — packaged like a cockpit, not another boring audit PDF.',
      legal:
        'For now this build is deterministic mock data keyed by what you typed. Reach out once you approve the UX and well wire hardened scans.',
    }),
    [],
  )

  useEffect(() => {
    if (phase !== 'scanning') return

    let cancelled = false
    const stepDelayMs = prefersReducedMotion ? 40 : 720
    const finishPadMs = prefersReducedMotion ? 120 : 920
    const timers: ReturnType<typeof setTimeout>[] = []

    SCAN_PHASES.forEach((_, idx) => {
      timers.push(
        window.setTimeout(() => {
          if (!cancelled) setScanPhaseIndex(idx)
        }, idx * stepDelayMs),
      )
    })

    const finishDelay = SCAN_PHASES.length * stepDelayMs + finishPadMs
    timers.push(
      window.setTimeout(() => {
        if (cancelled) return
        const next = scanUrlUsed ? buildMockReport(scanUrlUsed) : buildMockReport('demo.local')
        setReport(next)
        setPhase('report')
      }, finishDelay),
    )

    return () => {
      cancelled = true
      for (const timer of timers) clearTimeout(timer)
    }
  }, [phase, prefersReducedMotion, scanUrlUsed])

  const handleInspect = () => {
    setSubmissionError(null)
    headerRef.current?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' })

    const normalized = normalizeUrlCandidate(draftUrl)
    if (!normalized.ok) {
      setSubmissionError(normalized.message)
      return
    }

    setScanUrlUsed(normalized.url)
    setScanPhaseIndex(0)
    setReport(null)
    setPhase('scanning')
  }

  let body: JSX.Element | null

  if (phase === 'scanning') {
    body = (
      <ScanningPanel stepIndex={scanPhaseIndex} prefersReducedMotion={prefersReducedMotion} />
    )
  } else if (phase === 'report' && report) {
    body = (
      <motion.section
        className="mt-14 w-full text-left"
        initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: prefersReducedMotion ? 0 : 0.52,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        <div className="flex flex-col gap-4 border-b border-border pb-10 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl space-y-4">
            <p className="font-mono text-xs uppercase tracking-[0.46em] text-muted">
              Session bundle
            </p>
            <h2 className="text-balance font-sans text-3xl tracking-tight text-foreground md:text-4xl">
              Console-grade readout derived from illustrative extraction.
            </h2>
            <p className="font-mono text-sm leading-relaxed text-accent/90">{report.canonicalUrl}</p>
            <div className="flex flex-wrap gap-3 pt-4">
              <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-well px-4 py-2 font-mono text-xs text-muted">
                Response <span className="text-foreground">{report.meta.statusCode}</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-well px-4 py-2 font-mono text-xs text-muted">
                Plane <span className="capitalize text-foreground">{report.meta.serverBanner}</span>
              </div>
              <div className="inline-flex flex-1 min-w-[min(440px,calc(100%-1rem))] items-center rounded-lg border border-border bg-well px-4 py-3 font-mono text-xs leading-relaxed text-muted">
                {report.meta.tlsNote}
              </div>
            </div>
          </div>
          <motion.button
            type="button"
            onClick={() => {
              setDraftUrl('')
              setPhase('idle')
              setReport(null)
              setScanUrlUsed(null)
              setSubmissionError(null)
              setScanPhaseIndex(0)
            }}
            className="mt-8 inline-flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-panel px-6 py-[14px] font-mono text-sm text-foreground transition hover:border-accent hover:text-accent md:mt-0 md:w-auto"
            whileHover={prefersReducedMotion ? undefined : { y: -1 }}
            transition={{ duration: 0.2 }}
          >
            <ShieldCheck aria-hidden size={17} strokeWidth={1.7} />
            New scan
          </motion.button>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-[minmax(0,420px)_1fr]">
          <ScoreTile
            title="SEO posture"
            value={report.seoScore}
            subtitle="Simulated coherence of meta, canonical, previews, headings."
            prefersReducedMotion={prefersReducedMotion}
          />
          <ScoreTile
            title="Security posture"
            value={report.securityScore}
            subtitle="Hypothesized stance on HTTPS, CSP, framing, referrer policy."
            prefersReducedMotion={prefersReducedMotion}
          />
        </div>

        <div className="mt-12 grid gap-10 xl:grid-cols-2">
          {(['seo', 'security'] as const).map((bucket) => (
            <div key={bucket} className="space-y-4">
              <div className="flex items-center gap-3">
                {bucket === 'seo' ? (
                  <Gauge className="size-7 text-accent" strokeWidth={1.7} aria-hidden />
                ) : (
                  <MousePointerSquareDashed
                    className="size-7 text-accent"
                    strokeWidth={1.7}
                    aria-hidden
                  />
                )}
                <h3 className="font-sans text-2xl tracking-tight text-foreground capitalize">
                  {bucket} findings
                </h3>
              </div>
              <div className="flex flex-col gap-3">
                {report.findings
                  .filter((f) => f.category === bucket)
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
              <p className="font-mono text-xs uppercase tracking-[0.44em] text-muted">
                Full analyst packet
              </p>
              <h3 className="mt-6 text-balance text-3xl font-medium tracking-tight text-foreground">
                Locked behind human coordination — not autopilot checkout.
              </h3>
              <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">
                Donate whatever feels fair via PayPal, then ping us through email with receipt + URLs.
                We manually assemble remediation-grade notes for teams that prefer operator-level depth.
              </p>
              <ul className="mt-8 grid gap-3 font-mono text-sm text-muted">
                <li className="rounded-lg border border-border bg-well/95 px-4 py-3">
                  <span className="text-accent">01</span> · PayPal support keeps things transparent.
                </li>
                <li className="rounded-lg border border-border bg-well/95 px-4 py-3">
                  <span className="text-accent">02</span> · Email thread aligns scope + SLA expectations.
                </li>
              </ul>
            </div>
            <div className="flex flex-col justify-between gap-4">
              <div className="relative overflow-hidden rounded-2xl border border-border bg-black/55 p-[1px] shadow-[inset_0_0_0px_1px_rgba(255,255,255,0.06)] backdrop-blur-3xl">
                <div className="relative rounded-[calc(1rem-1px)] bg-well px-8 py-8">
                  <div className="flex items-start gap-3">
                    <Lock className="mt-1 size-6 text-accent/90" strokeWidth={1.7} aria-hidden />
                    <div>
                      <p className="font-mono text-xs uppercase tracking-[0.36em] text-muted">
                        Teaser corpus
                      </p>
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
          Demo mode — illustrative scores + findings keyed off your typed URL · not authoritative security telemetry.
        </p>
      </motion.section>
    )
  } else {
    body = (
      <>
        <motion.div
          className="mx-auto mt-[72px] w-full max-w-4xl"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="font-mono text-xs uppercase tracking-[0.46em] text-muted">
            {heroCopy.eyebrow}
          </p>
          <h2 className="mt-10 text-pretty bg-gradient-to-b from-foreground via-foreground/90 to-muted bg-clip-text font-sans text-4xl font-medium tracking-tight text-transparent md:text-[3.06rem] md:leading-[1.06] md:tracking-tight">
            {heroCopy.title}
          </h2>
          <p className="mt-8 max-w-2xl text-pretty font-sans text-lg leading-snug text-muted md:text-xl">
            {heroCopy.sub}
          </p>
          <div className="mt-14 flex flex-wrap justify-center gap-4">
            <div className="inline-flex rounded-full border border-border bg-well/95 px-4 py-[9px] font-mono text-[11px] uppercase tracking-[0.28em] text-muted">
              Live mock · SSRF ingest later
            </div>
          </div>
        </motion.div>

        <motion.div
          className="relative mx-auto mt-[56px] w-full max-w-3xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: prefersReducedMotion ? 0 : 0.15, duration: prefersReducedMotion ? 0 : 0.52 }}
        >
          <label className="sr-only" htmlFor="url-bar">
            URL to inspect
          </label>
          <div className="group relative isolate overflow-hidden rounded-[22px] border border-accent/55 bg-well/92 p-[14px] shadow-glow-accent">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_52%_-20%,rgba(34,211,238,0.22),transparent_61%)]" />
            <div className="pointer-events-none absolute inset-0 noise-soft opacity-80" />

            <div className="relative flex flex-col gap-4 px-6 py-10 md:flex-row md:items-stretch md:gap-8 md:p-14">
              <div className="flex flex-1 items-center rounded-2xl border border-border-strong bg-black/52 px-[18px] py-[18px] font-mono text-base text-foreground shadow-inner shadow-black/60 md:text-lg md:tracking-tight">
                <ShieldCheck aria-hidden size={26} strokeWidth={1.6} className="mr-6 text-accent" />
                <input
                  id="url-bar"
                  value={draftUrl}
                  spellCheck={false}
                  placeholder="stripe.com/blog"
                  onChange={(evt) => {
                    setSubmissionError(null)
                    setDraftUrl(evt.target.value)
                  }}
                  onKeyDown={(evt) => {
                    if (evt.key === 'Enter') handleInspect()
                  }}
                  autoComplete="url"
                  className="w-full rounded-none bg-transparent px-2 py-[6px] text-inherit caret-accent outline-none ring-0 focus:ring-0"
                />
              </div>

              <motion.button
                type="button"
                disabled={draftUrl.trim() === ''}
                onClick={handleInspect}
                className={cn(
                  'inline-flex shrink-0 items-center justify-center gap-[10px]',
                  'rounded-2xl border border-accent-strong bg-accent px-10 py-[21px]',
                  'font-mono text-sm font-semibold tracking-[0.14em] text-canvas uppercase',
                  'shadow-[0_0_62px_-20px_rgb(34,211,238)] disabled:opacity-55 disabled:blur-[1px]',
                )}
                whileHover={prefersReducedMotion ? undefined : { y: -1.5 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.986 }}
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
                  HTTPS assumed when you omit the scheme · We never scrape here — all mock choreography for now ·{' '}
                  <button
                    type="button"
                    className="text-accent underline underline-offset-4 hover:text-accent-strong"
                    onClick={() => setDraftUrl('https://sitesrift.app')}
                  >
                    Try Sitesrift staging
                  </button>
                  .
                  <span className="mt-6 block">{heroCopy.legal}</span>
                </p>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </>
    )
  }

  const statusLabel =
    phase === 'idle' ? 'Ready' : phase === 'scanning' ? 'Analyzing envelope' : 'Report compiled'

  return (
    <div className="relative mx-auto flex min-h-[100svh] w-[min(1180px,100%)] flex-col px-6 pb-[52px] text-center md:px-10">
      <div className="pointer-events-none absolute inset-x-[-12%] bottom-[-20%] h-[560px] blur-[118px]" aria-hidden>
        <div className="h-full rounded-[420px] bg-[radial-gradient(circle,rgba(34,211,238,0.12),transparent_73%)]" />
      </div>

      <header
        ref={headerRef}
        className="sticky top-6 z-[9] isolate mb-[-10px]"
      >
        <div className="flex items-center gap-6 rounded-[20px] border border-border-strong bg-well/93 px-[22px] py-[17px] font-mono text-xs uppercase tracking-[0.56em] text-muted shadow-[0_20px_60px_-30px_black] backdrop-blur-3xl backdrop-saturate-150">
          <div className="flex items-center gap-3 text-accent">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-pulse rounded-full bg-accent opacity-95" />
              <span className="relative inline-flex size-2.5 rounded-full border border-accent/60 bg-well" />
            </span>
            Demo
          </div>
          <div className="hidden h-[18px] w-px shrink-0 bg-border md:inline-block" />
          <span className="truncate text-muted">
            inspector <span className="text-accent/90">{statusLabel}</span>
          </span>
          <div className="ml-auto hidden items-center gap-3 font-mono text-[10px] normal-case tracking-[0.06em] text-muted md:flex">
            <Gauge strokeWidth={1.6} className="size-4 shrink-0 text-accent" aria-hidden /> SEO / surface security
          </div>
        </div>
      </header>

      <motion.main
        className="surface-grid relative isolate flex flex-1 flex-col overflow-hidden rounded-br-[calc(var(--radius-card)+34px)] rounded-bl-[calc(var(--radius-card)+34px)] border border-t-0 border-border bg-well/94 px-10 pt-[84px] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-lg md:px-[84px]"
        layout
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.section
            key={phase === 'idle' ? 'landing' : phase === 'scanning' ? 'scan' : 'report'}
            layout
            className={cn('relative z-[1]', phase === 'report' ? 'flex flex-1 flex-col' : '')}
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
          <motion.div className="pointer-events-none absolute left-[-8%] top-[30%]" aria-hidden animate={{ opacity: [0.18, 0.35, 0.19] }} transition={{ repeat: Infinity, duration: 7 }}>
            <span className="block h-[150px] w-[150px] rounded-full blur-[118px]" style={{ backgroundColor: '#22d3ee', opacity: 0.06 }} />
          </motion.div>
        ) : null}
      </motion.main>

      <p className="relative z-[4] px-10 pt-9 text-[11px] font-mono uppercase tracking-[0.38em] text-muted">
        © {new Date().getFullYear()} Sitesrift · illustrative tech preview
      </p>
    </div>
  )
}
