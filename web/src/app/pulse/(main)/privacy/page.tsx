// ABOUTME: Pulse privacy policy. English, US audience, Pulse-specific.
// ABOUTME: Linked from the Garmin OAuth consent screen and Pulse footer.

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pulse — Privacy Policy",
  robots: "noindex",
};

export default function PrivacyPage() {
  return (
    <main className="prose prose-invert mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-2 text-3xl font-bold">Privacy Policy</h1>
      <p className="mb-8 text-sm text-muted-foreground">Last updated: April 27, 2026</p>

      <div className="space-y-6 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold">1. Who we are</h2>
          <p>
            Pulse is a product of Nove Health, Inc. (&quot;Pulse&quot;, &quot;we&quot;, &quot;us&quot;).
            This policy explains what data we collect when you use Pulse at
            pulse.nove.health, why we collect it, and the choices you have.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. Data we collect</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Account information.</strong> Email and name from Google
              when you sign in. We never see your Google password.
            </li>
            <li>
              <strong>Garmin health data.</strong> When you connect Garmin, we
              receive read-only access to daily summaries: steps, sleep
              duration and stages, resting heart rate, HRV, body battery, stress
              levels, and intensity minutes. We do not write to your Garmin
              account.
            </li>
            <li>
              <strong>Journal entries.</strong> Daily habit selections and
              optional notes you choose to log.
            </li>
            <li>
              <strong>Usage logs.</strong> Standard server logs (IP, user agent,
              request paths) for debugging and abuse prevention.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. How we use it</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>Compute your recovery, strain, and sleep metrics, and our proprietary recovery score.</li>
            <li>Show you trends, charts, and journal correlations.</li>
            <li>Provide customer support when you reach out.</li>
            <li>Operate the service securely and prevent abuse.</li>
          </ul>
          <p className="mt-3">
            We do not sell your personal data, and we do not share it with
            advertisers or data brokers.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. Service providers</h2>
          <p>
            We use a small set of vendors to run Pulse. They process data only
            on our behalf and only to deliver the service:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Supabase (Postgres database hosting)</li>
            <li>Railway (backend hosting)</li>
            <li>Vercel (web hosting)</li>
            <li>AWS S3 (file storage)</li>
            <li>Anthropic (AI coach features, when used)</li>
            <li>Google (sign-in)</li>
            <li>Garmin Health API (wearable data, with your consent)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. Security</h2>
          <p>
            Data is encrypted in transit (TLS) and at rest. Access is limited to
            personnel who need it to operate the service. We follow industry
            standards for credential storage and key rotation.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">6. Your rights</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Disconnect Garmin</strong> at any time from
              pulse.nove.health/garmin. We stop receiving new data immediately.
            </li>
            <li>
              <strong>Export</strong> or <strong>delete</strong> your data by
              emailing privacy@nove.health. We respond within 30 days.
            </li>
            <li>
              <strong>Close your account</strong> by emailing the same address.
              We delete your account data within 30 days, except where law
              requires retention.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">7. Health disclaimer</h2>
          <p>
            Pulse provides informational metrics for personal awareness. It is
            not a medical device and is not intended to diagnose, treat, or
            prevent any condition. For medical decisions, consult a qualified
            healthcare professional.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">8. Children</h2>
          <p>
            Pulse is not directed at children under 18. We do not knowingly
            collect data from anyone under 18.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">9. Changes to this policy</h2>
          <p>
            We may update this policy. Material changes will be posted at this
            URL and announced in-app at least 30 days before they take effect.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">10. Contact</h2>
          <p>
            Questions or requests: <strong>privacy@nove.health</strong>.
          </p>
        </section>
      </div>
    </main>
  );
}
