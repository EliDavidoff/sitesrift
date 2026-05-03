import { LEGAL } from '../legal/placeholders.ts'

export function PrivacyPage() {
  return (
    <article className="space-y-8 text-pretty">
      <header className="space-y-3 border-b border-border pb-8">
        <p className="font-mono text-xs uppercase tracking-[0.42em] text-accent">Privacy</p>
        <h1 className="font-sans text-3xl font-medium tracking-tight text-foreground md:text-[2rem]">
          Privacy Policy
        </h1>
        <p className="font-mono text-xs text-muted">
          Last updated {LEGAL.lastUpdated}
        </p>
      </header>

      <section className="space-y-3" aria-labelledby="p1">
        <h2 id="p1" className="font-sans text-lg font-medium text-foreground">
          1. Operator
        </h2>
        <p>
          This policy describes how <strong className="text-foreground">{LEGAL.operatorName}</strong>, operating as{' '}
          {LEGAL.operatorCapacity}, handles information in connection with this website and the scan tool. Questions:{' '}
          <a
            className="text-accent underline underline-offset-4 hover:text-accent-strong"
            href={`mailto:${LEGAL.contactEmail}?subject=${encodeURIComponent('Privacy question')}`}
          >
            {LEGAL.contactEmail}
          </a>
          .
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="p2">
        <h2 id="p2" className="font-sans text-lg font-medium text-foreground">
          2. What you send us
        </h2>
        <p>
          When you run a scan, your browser sends an HTTP <strong className="text-foreground">POST</strong> to our API with
          a small JSON body (for example{' '}
          <code className="rounded bg-panel px-1.5 py-0.5 font-mono text-[13px] text-accent">
            {`{ "url": "https://example.com/path" }`}
          </code>
          ). The URL string is processed only to operate the snapshot. Request bodies above a modest size limit are
          rejected at the boundary to limit abuse — we do not use URLs alone to build personal profiles or sell identity
          data.
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="p3">
        <h2 id="p3" className="font-sans text-lg font-medium text-foreground">
          3. Network and server data
        </h2>
        <ul className="list-inside list-disc space-y-2 pl-1 marker:text-accent">
          <li>
            <strong className="text-foreground">Client IP address</strong> is visible to our hosting/API layer and used
            for <strong className="text-foreground">abuse prevention</strong>. In typical bundled deployments today, heavy
            repeat scanning from the same address may hit a throttle on the order of{' '}
            <strong className="text-foreground">~45 scan requests per IP per sliding minute</strong> — tuning may differ
            in production; contact us if you need enterprise limits.
          </li>
          <li>
            Each scan runs under a server-side timeout (on the order of tens of seconds) so stalled targets do not hold
            workers open indefinitely.
          </li>
          <li>
            In development-style environments, lightweight <strong className="text-foreground">console logs</strong> may
            record scan outcomes with the <strong className="text-foreground">hostname</strong> derived from your URL —
            not the full URL — to reduce accidental logging of sensitive query strings. Production logging posture may
            evolve; substantive changes belong in an updated revision date on this page.
          </li>
        </ul>
      </section>

      <section className="space-y-3" aria-labelledby="p4">
        <h2 id="p4" className="font-sans text-lg font-medium text-foreground">
          4. Cookies and analytics
        </h2>
        <p>
          The Sitesrift front-end <strong className="text-foreground">does not set analytics cookies</strong> in the
          shipped codebase today. If we add measurement later, we will refresh this policy and add consent flows where the
          law requires them.
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="p5">
        <h2 id="p5" className="font-sans text-lg font-medium text-foreground">
          5. Third-party services
        </h2>
        <p>
          Links may open third-party sites (for example donation or email handlers). Those services have their own
          policies; we do not control what they collect once you leave our origin.
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="p6">
        <h2 id="p6" className="font-sans text-lg font-medium text-foreground">
          6. Retention
        </h2>
        <p>
          We do not market a persisted “history of everyone’s scans” in the default product footprint: scan results render
          in your session. Operational logs depend on hosting — ephemeral console telemetry in preview, and configurable
          retention wherever you deploy (access logs, WAF trails, vendor dashboards). Align production retention with your
          own compliance posture and document it if you fork or self-host publicly.
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="p7">
        <h2 id="p7" className="font-sans text-lg font-medium text-foreground">
          7. Your rights
        </h2>
        <p>
          Depending on jurisdiction, you may have rights regarding access, correction, deletion, or restriction of data
          that identifies you — including IP-derived records where applicable law treats them as personal data. Email us at
          the address above with a concise request; we will respond within a reasonable timeframe and may need to verify
          identity for sensitive actions.
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="p8">
        <h2 id="p8" className="font-sans text-lg font-medium text-foreground">
          8. International users
        </h2>
        <p>
          If you use the Service from outside the geography where servers run, transmissions and any logs may cross
          borders. Detailed transfer mechanisms belong in a counsel-reviewed addendum matched to how you operate in
          production.
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="p9">
        <h2 id="p9" className="font-sans text-lg font-medium text-foreground">
          9. Governing framework
        </h2>
        <p>{LEGAL.governingLaw}</p>
      </section>

      <section className="space-y-3" aria-labelledby="p10">
        <h2 id="p10" className="font-sans text-lg font-medium text-foreground">
          10. Children
        </h2>
        <p>
          The Service is not directed at children under 13 (or the minimum digital consent age where you reside). Please
          do not use it if you are younger than that threshold.
        </p>
      </section>
    </article>
  )
}
