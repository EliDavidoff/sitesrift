import { LEGAL } from '../legal/placeholders.ts'

export function TermsPage() {
  return (
    <article className="space-y-8 text-pretty">
      <header className="space-y-3 border-b border-border pb-8">
        <p className="font-mono text-xs uppercase tracking-[0.42em] text-accent">Legal</p>
        <h1 className="font-sans text-3xl font-medium tracking-tight text-foreground md:text-[2rem]">
          Terms of Use
        </h1>
        <p className="font-mono text-xs text-muted">
          Effective as noted · Last updated {LEGAL.lastUpdated}
        </p>
      </header>

      <section className="space-y-3" aria-labelledby="s1">
        <h2 id="s1" className="font-sans text-lg font-medium text-foreground">
          1. Who we are
        </h2>
        <p>
          These Terms govern your use of the Sitesrift web experience (the “Service”) operated by{' '}
          <strong className="text-foreground">{LEGAL.entity}</strong>. Contact:{' '}
          <a
            className="text-accent underline underline-offset-4 hover:text-accent-strong"
            href={`mailto:${LEGAL.contactEmail}`}
          >
            {LEGAL.contactEmail}
          </a>
          . This page is a practical draft — have counsel align it with your entity and jurisdiction.
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="s2">
        <h2 id="s2" className="font-sans text-lg font-medium text-foreground">
          2. What the Service does
        </h2>
        <p>
          Sitesrift provides an <strong className="text-foreground">outside-in snapshot</strong> of a{' '}
          <strong className="text-foreground">public URL</strong> you choose: a bounded fetch of HTML and related
          signals (such as robots rules as implemented). Outputs include heuristic scores and explanatory copy —{' '}
          <strong className="text-foreground">
            not a guarantee of rankings, security clearance, or AI visibility
          </strong>
          , and not penetration testing or legal advice.
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="s3">
        <h2 id="s3" className="font-sans text-lg font-medium text-foreground">
          3. Acceptable use
        </h2>
        <ul className="list-inside list-disc space-y-2 pl-1 marker:text-accent">
          <li>Use the Service only for URLs you are authorized to test and that comply with applicable law.</li>
          <li>
            Do not misuse scans to harass, overload third-party infrastructure, or probe networks outside what the
            Service explicitly performs.
          </li>
          <li>
            Respect robots directives and site policies where applicable; we still fetch minimal public resources as
            described in our Privacy Policy.
          </li>
        </ul>
      </section>

      <section className="space-y-3" aria-labelledby="s4">
        <h2 id="s4" className="font-sans text-lg font-medium text-foreground">
          4. Disclaimers
        </h2>
        <p>
          The Service is provided <strong className="text-foreground">“as is”</strong>. To the fullest extent permitted
          by law, we disclaim warranties of merchantability, fitness for a particular purpose, and non-infringement.
          Snapshots may be incomplete or stale the moment after they run.
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="s5">
        <h2 id="s5" className="font-sans text-lg font-medium text-foreground">
          5. Limitation of liability
        </h2>
        <p>
          To the maximum extent permitted by law, <strong className="text-foreground">{LEGAL.entity}</strong> and its
          contributors will not be liable for indirect, incidental, special, consequential, or punitive damages, or for
          any loss of profits or data, arising from your use of the Service. Cap and carve-outs depend on your
          jurisdiction — <strong className="text-foreground">have counsel tune this section</strong>.
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="s6">
        <h2 id="s6" className="font-sans text-lg font-medium text-foreground">
          6. Changes
        </h2>
        <p>
          We may update these Terms; material changes belong on this page with an updated date. Continued use after
          changes constitutes acceptance where allowed by law.
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="s7">
        <h2 id="s7" className="font-sans text-lg font-medium text-foreground">
          7. Governing law
        </h2>
        <p>
          <strong className="text-foreground">{LEGAL.governingLaw}</strong>
        </p>
      </section>
    </article>
  )
}
