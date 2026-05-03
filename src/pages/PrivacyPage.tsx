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
          This policy describes how <strong className="text-foreground">{LEGAL.entity}</strong> (“we”, “us”) handles
          information in connection with Sitesrift. Questions:{' '}
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
          When you run a scan, your browser sends a request that includes the <strong className="text-foreground">URL</strong>{' '}
          you entered so our server can perform the snapshot. We use that string only to operate the Service — not to
          sell personal profiles from URLs alone.
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="p3">
        <h2 id="p3" className="font-sans text-lg font-medium text-foreground">
          3. Network and server data
        </h2>
        <ul className="list-inside list-disc space-y-2 pl-1 marker:text-accent">
          <li>
            <strong className="text-foreground">Client IP address</strong> may be seen by our hosting stack and is used
            for <strong className="text-foreground">abuse prevention</strong> (for example rate limiting repeated scan
            requests).
          </li>
          <li>
            In development / preview environments, minimal <strong className="text-foreground">console logs</strong>{' '}
            may record scan outcomes using the <strong className="text-foreground">hostname</strong> derived from your
            URL — not the full URL string — to avoid dumping query-heavy URLs into logs. Production logging behavior may
            evolve; we will update this policy if it materially changes.
          </li>
        </ul>
      </section>

      <section className="space-y-3" aria-labelledby="p4">
        <h2 id="p4" className="font-sans text-lg font-medium text-foreground">
          4. Cookies and analytics
        </h2>
        <p>
          The Sitesrift front-end <strong className="text-foreground">does not set analytics cookies</strong> in the
          current codebase. If we add measurement later, we will update this policy and, where required, your consent
          flows.
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="p5">
        <h2 id="p5" className="font-sans text-lg font-medium text-foreground">
          5. Third-party services
        </h2>
        <p>
          Links may open third-party sites (for example donation pages or email). Those services have their own
          policies; we do not control what they collect when you leave Sitesrift.
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="p6">
        <h2 id="p6" className="font-sans text-lg font-medium text-foreground">
          6. Retention
        </h2>
        <p>
          Retention depends on deployment. Development logs are ephemeral console output. Production retention should be
          documented here once hosting choices are final — <strong className="text-foreground">update this paragraph</strong>{' '}
          with counsel.
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="p7">
        <h2 id="p7" className="font-sans text-lg font-medium text-foreground">
          7. Your rights
        </h2>
        <p>
          Depending on where you live, you may have rights to access, correct, delete, or restrict processing of personal
          data. Email us at the address above. We will respond within a reasonable time and may need to verify requests.
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="p8">
        <h2 id="p8" className="font-sans text-lg font-medium text-foreground">
          8. International users
        </h2>
        <p>
          If you access the Service from outside the country where servers operate, your information may be processed
          where infrastructure runs. Cross-border transfers should be described precisely with counsel for your setup.
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="p9">
        <h2 id="p9" className="font-sans text-lg font-medium text-foreground">
          9. Children
        </h2>
        <p>
          The Service is not directed at children under 13 (or the minimum age in your jurisdiction). Do not use it if
          you are below that age.
        </p>
      </section>
    </article>
  )
}
