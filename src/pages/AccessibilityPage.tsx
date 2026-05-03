import { LEGAL } from '../legal/placeholders.ts'

export function AccessibilityPage() {
  return (
    <article className="space-y-8 text-pretty">
      <header className="space-y-3 border-b border-border pb-8">
        <p className="font-mono text-xs uppercase tracking-[0.42em] text-accent">Accessibility</p>
        <h1 className="font-sans text-3xl font-medium tracking-tight text-foreground md:text-[2rem]">
          Accessibility statement
        </h1>
        <p className="font-mono text-xs text-muted">
          Last reviewed {LEGAL.lastUpdated}
        </p>
      </header>

      <section className="space-y-3" aria-labelledby="a1">
        <h2 id="a1" className="font-sans text-lg font-medium text-foreground">
          Commitment
        </h2>
        <p>
          We aim for Sitesrift to be usable by people who rely on keyboards, screen readers, and other assistive
          technologies. Our <strong className="text-foreground">design target</strong> is WCAG 2.2 Level AA for the parts
          of the experience we control; we have not claimed third-party certification unless stated elsewhere.
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="a2">
        <h2 id="a2" className="font-sans text-lg font-medium text-foreground">
          What we already ship
        </h2>
        <ul className="list-inside list-disc space-y-2 pl-1 marker:text-accent">
          <li>Visible focus styles for interactive controls (accent-colored outlines).</li>
          <li>Semantic headings and landmarks on primary flows.</li>
          <li>
            Help for scan snapshot metrics via toggle buttons with <code className="rounded bg-panel px-1.5 py-0.5 font-mono text-xs text-foreground">aria-expanded</code>,{' '}
            <code className="rounded bg-panel px-1.5 py-0.5 font-mono text-xs text-foreground">aria-controls</code>, and keyboard dismissal where implemented.
          </li>
          <li>Reduced-motion preferences respected for major transitions where wired.</li>
        </ul>
      </section>

      <section className="space-y-3" aria-labelledby="a3">
        <h2 id="a3" className="font-sans text-lg font-medium text-foreground">
          Known limitations
        </h2>
        <p>
          Third-party destinations opened from Sitesrift (for example external donation flows) are outside our control.
          Some decorative visuals remain purely visual and do not convey exclusive meaning.
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="a4">
        <h2 id="a4" className="font-sans text-lg font-medium text-foreground">
          Feedback
        </h2>
        <p>
          Tell us what blocks you and we will prioritize fixes we can ship in-product:{' '}
          <a
            className="text-accent underline underline-offset-4 hover:text-accent-strong"
            href={`mailto:${LEGAL.contactEmail}?subject=${encodeURIComponent('Accessibility feedback')}`}
          >
            {LEGAL.contactEmail}
          </a>
          .
        </p>
      </section>

      <p className="border-t border-border pt-6 font-mono text-xs text-muted">
        Statement may be updated as the product evolves.
      </p>
    </article>
  )
}
