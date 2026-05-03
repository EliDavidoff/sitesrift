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
          These Terms govern use of the Sitesrift web experience (the “Service”) offered by{' '}
          <strong className="text-foreground">{LEGAL.operatorName}</strong>, {LEGAL.operatorCapacity} Contact:{' '}
          <a
            className="text-accent underline underline-offset-4 hover:text-accent-strong"
            href={`mailto:${LEGAL.contactEmail}`}
          >
            {LEGAL.contactEmail}
          </a>
          . Have counsel reconcile this draft with your final entity facts before relying on it in regulated contexts.
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="s2">
        <h2 id="s2" className="font-sans text-lg font-medium text-foreground">
          2. What the Service does
        </h2>
        <p>
          Sitesrift provides an <strong className="text-foreground">outside-in snapshot</strong> of a{' '}
          <strong className="text-foreground">public URL</strong> you choose. In typical operation that means constrained
          fetches across the stages described in-product (for example: normalize the URL; fetch HTML with redirect caps and
          a server timeout; read <code className="font-mono text-[13px] text-accent">robots.txt</code> expectations on the
          same host envelope; probe reachable tab/touch icons with byte caps matching the shipped scanner; derive heuristic
          checklist scores).
        </p>
        <p>
          Outputs are explanatory summaries —{' '}
          <strong className="text-foreground">
            not guarantees of rankings, security clearance certificates, penetration testing verdicts, or AI visibility.
          </strong>
          They are based on signals visible from bounded requests, not a whole-site crawl and not legal advice.
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="s3">
        <h2 id="s3" className="font-sans text-lg font-medium text-foreground">
          3. Acceptable use
        </h2>
        <ul className="list-inside list-disc space-y-2 pl-1 marker:text-accent">
          <li>Use the Service only for URLs you are authorized to test and under applicable law.</li>
          <li>
            Do not misuse scans to harass people, brute-force infrastructures, bypass authentication, run denial-of-wallet
            tests, or map networks beyond what the Service explicitly exposes.
          </li>
          <li>
            Automated or bursty scanning may encounter rate limiting tied to originating IP addresses and request sizes at
            the API boundary — abuse prevention reserves we describe at a high level in the Privacy Policy.
          </li>
          <li>
            Respect robots directives and site policies; we still retrieve minimal public resources needed to populate the
            readout described in-product.
          </li>
        </ul>
      </section>

      <section className="space-y-3" aria-labelledby="s4">
        <h2 id="s4" className="font-sans text-lg font-medium text-foreground">
          4. Disclaimers
        </h2>
        <p>
          The Service is provided <strong className="text-foreground">“as is”</strong>. To the fullest extent permitted
          by applicable law, we disclaim implied warranties including merchantability, fitness for a particular purpose, and
          non-infringement. Outputs may lag reality the moment after they compute.
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="s5">
        <h2 id="s5" className="font-sans text-lg font-medium text-foreground">
          5. Limitation of liability
        </h2>
        <p>
          To the maximum extent permitted by law,{' '}
          <strong className="text-foreground">{LEGAL.operatorName}</strong>, its successors, licensors, contributors, and
          volunteers are not liable for indirect, incidental, special, consequential, or punitive damages, or for lost
          profits or data, arising from your use of the Service. Mandatory consumer rights where you live survive only to
          the extent they cannot validly be waived — <strong className="text-foreground">have counsel tune caps and carve-outs</strong>{' '}
          after entity formation.
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="s6">
        <h2 id="s6" className="font-sans text-lg font-medium text-foreground">
          6. Changes
        </h2>
        <p>
          We may revise these Terms. Material edits appear on this route with an updated “Last updated” stamp. Continued use
          where law permits may constitute renewed assent once any required notice deadlines pass.
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="s7">
        <h2 id="s7" className="font-sans text-lg font-medium text-foreground">
          7. Governing framework
        </h2>
        <p>{LEGAL.governingLaw}</p>
      </section>
    </article>
  )
}
