import { LEGAL } from '../legal/placeholders.ts'

const MAILTO_DEV = `mailto:${LEGAL.contactEmail}?subject=${encodeURIComponent(
  'Sitesrift — website build inquiry',
)}&body=${encodeURIComponent(
  `Hi Eli,\n\nI’d like help with a website/app.\n\nProject:\nTimeline:\nBudget range:\nLinks / references:\n\nThanks!`,
)}`

function SectionHeading({ children, id }: { children: string; id: string }) {
  return (
    <h2 id={id} className="font-sans text-lg font-medium text-foreground">
      {children}
    </h2>
  )
}

export function DevelopersPage() {
  return (
    <article className="space-y-10 text-pretty">
      <header className="space-y-3 border-b border-border pb-8">
        <p className="font-mono text-xs uppercase tracking-[0.42em] text-accent">
          Developers
        </p>
        <h1 className="font-sans text-3xl font-medium tracking-tight text-foreground md:text-[2rem]">
          Engineering-led websites, shipped with real code.
        </h1>
        <p className="font-mono text-xs text-muted">
          More than a decade building production websites and web apps — with clean handoffs and no lock-in.
        </p>
      </header>

      <section className="space-y-3" aria-labelledby="d1">
        <SectionHeading id="d1">What we do</SectionHeading>
        <p>
          If you want a site that feels fast, stays maintainable, and can be handed to any engineer without drama — we
          build that. You get working software, not a mystery theme bundle.
        </p>
        <ul className="list-inside list-disc space-y-2 pl-1 marker:text-accent">
          <li>
            <strong className="text-foreground">Marketing websites</strong> with strong performance and crisp UX.
          </li>
          <li>
            <strong className="text-foreground">Product front-ends</strong> (React) with clean components and state.
          </li>
          <li>
            <strong className="text-foreground">Back-end endpoints</strong> when the site needs real functionality.
          </li>
          <li>
            <strong className="text-foreground">Launch and upkeep</strong>: DNS, SSL, deployment, monitoring basics.
          </li>
        </ul>
      </section>

      <section className="space-y-3" aria-labelledby="d2">
        <SectionHeading id="d2">How we work (end-to-end)</SectionHeading>
        <ol className="mt-4 space-y-3">
          <li className="rounded-xl border border-border bg-panel px-5 py-4">
            <p className="font-mono text-xs uppercase tracking-[0.34em] text-muted">01 · Scope</p>
            <p className="mt-2">
              We define what “done” means: pages, flows, integrations, constraints, and success metrics.
            </p>
          </li>
          <li className="rounded-xl border border-border bg-panel px-5 py-4">
            <p className="font-mono text-xs uppercase tracking-[0.34em] text-muted">02 · Design</p>
            <p className="mt-2">
              Wireframes first, then polished UI. We optimize for clarity, conversion, accessibility, and speed.
            </p>
          </li>
          <li className="rounded-xl border border-border bg-panel px-5 py-4">
            <p className="font-mono text-xs uppercase tracking-[0.34em] text-muted">03 · Build</p>
            <p className="mt-2">
              Real code in a real repo: components, tests where it matters, and clean structure. No fragile page-builder
              glue.
            </p>
          </li>
          <li className="rounded-xl border border-border bg-panel px-5 py-4">
            <p className="font-mono text-xs uppercase tracking-[0.34em] text-muted">04 · QA</p>
            <p className="mt-2">
              Mobile/desktop checks, performance passes, and “does this confuse a human?” review before launch.
            </p>
          </li>
          <li className="rounded-xl border border-border bg-panel px-5 py-4">
            <p className="font-mono text-xs uppercase tracking-[0.34em] text-muted">05 · Launch</p>
            <p className="mt-2">
              Deploy, wire domain + HTTPS, verify analytics (optional), and write a short runbook for the next person.
            </p>
          </li>
          <li className="rounded-xl border border-border bg-panel px-5 py-4">
            <p className="font-mono text-xs uppercase tracking-[0.34em] text-muted">06 · Maintain</p>
            <p className="mt-2">
              Updates, new pages/features, performance tuning, and security hygiene without re-building from scratch.
            </p>
          </li>
        </ol>
      </section>

      <section className="space-y-3" aria-labelledby="d3">
        <SectionHeading id="d3">What you get (no lock-in)</SectionHeading>
        <ul className="list-inside list-disc space-y-2 pl-1 marker:text-accent">
          <li>
            <strong className="text-foreground">The repository</strong> (source code, not screenshots) and clean handoff.
          </li>
          <li>
            <strong className="text-foreground">Deployment notes</strong> so the site can be moved to another host later.
          </li>
          <li>
            <strong className="text-foreground">Transparent choices</strong>: we explain trade-offs and keep the stack simple.
          </li>
          <li>
            <strong className="text-foreground">Baseline SEO + performance</strong> (titles, previews, speed, mobile).
          </li>
        </ul>
      </section>

      <section
        className="rounded-[var(--radius-card)] border border-border bg-gradient-to-br from-panel via-well to-canvas px-6 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:px-8"
        aria-labelledby="d4"
      >
        <SectionHeading id="d4">Let’s talk</SectionHeading>
        <p className="mt-2">
          Email{' '}
          <a
            className="text-accent underline underline-offset-4 hover:text-accent-strong"
            href={MAILTO_DEV}
          >
            {LEGAL.contactEmail}
          </a>{' '}
          with a short description and any links you have. If you paste budget and timeline, you’ll get a sharper answer
          fast.
        </p>
      </section>
    </article>
  )
}

