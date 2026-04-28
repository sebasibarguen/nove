// ABOUTME: Pulse terms of service. English, US audience, Pulse-specific.
// ABOUTME: Linked from the Garmin OAuth consent screen and Pulse footer.

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pulse — Terms of Service",
  robots: "noindex",
};

export default function TermsPage() {
  return (
    <main className="prose prose-invert mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-2 text-3xl font-bold">Terms of Service</h1>
      <p className="mb-8 text-sm text-muted-foreground">Last updated: April 27, 2026</p>

      <div className="space-y-6 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold">1. Agreement</h2>
          <p>
            By creating an account or using Pulse (pulse.nove.health), you
            agree to these Terms of Service and our{" "}
            <a href="/privacy" className="underline">Privacy Policy</a>. If you
            do not agree, do not use the service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. The service</h2>
          <p>
            Pulse is a Whoop-style recovery, strain, and sleep app for Garmin
            owners. We read daily summaries from your Garmin account, compute
            metrics, and display them in a minimal interface. Pulse is operated
            by Nove Health, Inc.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. Eligibility</h2>
          <p>
            You must be at least 18 years old to use Pulse. By using the
            service, you confirm that you meet this requirement.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. Your account</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>You are responsible for keeping your Google sign-in secure.</li>
            <li>Your account is personal and not transferable.</li>
            <li>You agree to provide accurate information and to keep it current.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. Acceptable use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Use Pulse for any unlawful purpose.</li>
            <li>Attempt to access another user&apos;s data.</li>
            <li>Reverse engineer, scrape, or interfere with the service.</li>
            <li>Resell or redistribute the service or its data.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">6. Health disclaimer</h2>
          <p>
            <strong>Pulse is not a medical device and is not a substitute for
            professional medical care.</strong> Metrics and recommendations are
            informational only and do not constitute medical diagnosis,
            treatment, or advice. Always consult a qualified healthcare
            professional for medical decisions. In an emergency, contact local
            emergency services immediately.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">7. Garmin data</h2>
          <p>
            Pulse accesses your Garmin Health data only with your explicit
            consent through Garmin&apos;s OAuth flow. We use the data solely to
            provide the service described here. You can revoke access at any
            time from pulse.nove.health/garmin or from your Garmin account
            settings.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">8. Intellectual property</h2>
          <p>
            Pulse, the Pulse name, the Nove name, and all related software,
            design, and trademarks are the property of Nove Health, Inc. Your
            health data is yours; we hold a limited license to process it under
            these terms. You may not copy, modify, or distribute our content
            without permission.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">9. Pricing and payment</h2>
          <p>
            Pulse is currently free to use during the beta. We will provide at
            least 30 days&apos; notice before introducing any paid plan, and
            existing users will not be billed without explicit opt-in.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">10. Termination</h2>
          <p>
            You can close your account at any time by emailing
            privacy@nove.health. We may suspend or terminate accounts that
            violate these terms. On termination, you may request export or
            deletion of your data per the Privacy Policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">11. Disclaimers and liability</h2>
          <p>
            The service is provided &quot;as is&quot; without warranties of any
            kind. To the maximum extent permitted by law, Nove Health is not
            liable for indirect, incidental, or consequential damages, and our
            total liability is limited to the amount you have paid us in the
            12 months preceding the claim (currently zero during beta).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">12. Changes</h2>
          <p>
            We may update these terms. Material changes will be announced
            in-app at least 30 days before they take effect. Continued use
            after the effective date constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">13. Governing law</h2>
          <p>
            These terms are governed by the laws of the State of Delaware,
            United States, without regard to conflict-of-law principles.
            Disputes will be resolved in courts located in Delaware.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">14. Contact</h2>
          <p>
            Questions about these terms: <strong>legal@nove.health</strong>.
          </p>
        </section>
      </div>
    </main>
  );
}
