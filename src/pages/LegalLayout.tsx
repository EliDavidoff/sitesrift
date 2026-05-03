import { Link } from 'react-router-dom'
import { Gauge, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { SiteFooter } from '../components/SiteFooter.tsx'

type Props = {
  children: ReactNode
}

export function LegalLayout({ children }: Props) {
  return (
    <div className="relative mx-auto flex min-h-[100svh] w-[min(1180px,100%)] flex-col px-6 pb-10 md:px-10">
      <div
        className="pointer-events-none absolute inset-x-[-12%] bottom-0 h-[min(560px,50svh)] blur-[118px]"
        aria-hidden
      >
        <div className="h-full rounded-[420px] bg-[radial-gradient(circle,rgba(34,211,238,0.12),transparent_73%)]" />
      </div>

      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[100] -translate-y-[180%] rounded-lg border border-accent bg-well px-4 py-2.5 font-mono text-xs text-foreground shadow-glow-accent transition focus:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        Skip to content
      </a>

      <header className="sticky top-6 z-[9] isolate mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-border-strong bg-well/93 px-[22px] py-[17px] font-mono text-xs uppercase tracking-[0.56em] text-muted shadow-[0_20px_60px_-30px_black] backdrop-blur-3xl backdrop-saturate-150">
          <Link
            to="/"
            className="flex min-w-0 flex-wrap items-center gap-4 transition hover:text-foreground"
          >
            <span className="relative flex size-2.5 shrink-0">
              <span className="absolute inline-flex size-full animate-pulse rounded-full bg-accent opacity-95" />
              <span className="relative inline-flex size-2.5 rounded-full border border-accent/60 bg-well" />
            </span>
            <span className="truncate text-accent">Beta</span>
            <span className="hidden h-[18px] w-px shrink-0 bg-border md:inline-block" aria-hidden />
            <span className="truncate text-muted">
              Sitesrift · <span className="text-accent/90">policies</span>
            </span>
          </Link>
          <div className="hidden items-center gap-2 font-mono text-[10px] normal-case tracking-[0.06em] text-muted md:flex">
            <Gauge strokeWidth={1.6} className="size-4 shrink-0 text-accent" aria-hidden />
            SEO · security · <Sparkles className="size-3.5 shrink-0 text-accent" aria-hidden /> assistants
          </div>
          <Link
            to="/"
            className="ml-auto shrink-0 rounded-lg border border-border bg-panel px-4 py-2.5 font-mono text-[10px] normal-case tracking-[0.12em] text-foreground transition hover:border-accent hover:text-accent md:text-xs"
          >
            Back to inspector
          </Link>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="surface-grid relative isolate z-[1] flex min-h-0 flex-col rounded-br-[calc(var(--radius-card)+34px)] rounded-bl-[calc(var(--radius-card)+34px)] border border-border bg-well/94 px-6 py-12 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-lg md:px-14 md:py-16"
      >
        <div className="mx-auto w-full max-w-2xl text-left text-[15px] leading-relaxed text-muted">
          {children}
        </div>
      </main>

      <SiteFooter className="mt-auto" />
    </div>
  )
}
