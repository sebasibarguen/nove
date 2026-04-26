// ABOUTME: Root homepage — Nove as a healthspan platform with three products.
// ABOUTME: Each product card links to its dedicated landing page.

import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nove — the healthspan platform",
  description: "Three products that turn your data into the years you live healthy. Pulse, Records, and Labs.",
};

interface Product {
  name: string;
  tagline: string;
  description: string;
  href: string;
  status: string;
  cta: string;
}

const PRODUCTS: Product[] = [
  {
    name: "Pulse",
    tagline: "360° healthspan for Garmin owners",
    description:
      "Recovery, strain, and sleep — every morning, from the Garmin you already wear. Built for the daily habits that move healthspan forward.",
    href: "/pulse",
    status: "Early access",
    cta: "Explore Pulse",
  },
  {
    name: "Records",
    tagline: "Your health, organized — ask anything",
    description:
      "Labs, prescriptions, doctor notes, wearable data — all in one timeline. An AI agent that answers questions about your health, grounded in your own data.",
    href: "/records",
    status: "In development",
    cta: "Explore Records",
  },
  {
    name: "Labs",
    tagline: "Biomarkers, on a schedule",
    description:
      "A blood-test membership for healthspan. Comprehensive quarterly panels, AI interpretation, biomarkers tracked over time — not just one snapshot.",
    href: "/labs",
    status: "In development",
    cta: "Explore Labs",
  },
];

export default function Home() {
  return (
    <main>
      <section className="px-6 pt-24 pb-16 text-center md:pt-36 md:pb-24">
        <p className="mb-6 text-sm font-semibold uppercase tracking-widest text-primary">
          Nove
        </p>
        <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight md:text-7xl">
          Healthspan, in three products.
        </h1>
        <p className="mx-auto mt-8 max-w-2xl text-xl text-muted-foreground md:text-2xl">
          Lifespan is how long you live. Healthspan is how long you live well.
          Nove turns the data your body is already producing into the daily
          habits that extend it.
        </p>
      </section>

      <section className="bg-muted/30 px-6 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 md:grid-cols-3 md:gap-8">
            {PRODUCTS.map((product) => (
              <Link
                key={product.name}
                href={product.href}
                className="group flex flex-col rounded-2xl border bg-background p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-lg md:p-10"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {product.status}
                </span>
                <h2 className="mt-3 text-3xl font-bold md:text-4xl">
                  {product.name}
                </h2>
                <p className="mt-2 text-base font-medium text-foreground md:text-lg">
                  {product.tagline}
                </p>
                <p className="mt-4 flex-1 text-muted-foreground leading-relaxed">
                  {product.description}
                </p>
                <span className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary transition group-hover:gap-3">
                  {product.cta}
                  <span aria-hidden>→</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold md:text-4xl">
              Across every Nove product
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Two things every Nove product ships with — because healthspan
              is built on data you trust and answers you can actually use.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 md:gap-8">
            <div className="rounded-2xl border bg-background p-8">
              <h3 className="text-xl font-bold">
                An AI coach for your healthspan
              </h3>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                A specialized health-records agent with access to your
                connected data — labs, wearables, doctor notes, prescriptions.
                Ask anything in plain language. Every week, get personalized
                actions ("add 1 strength session", "shift bedtime 30 min
                earlier") grounded in your own numbers — not generic advice.
              </p>
            </div>
            <div className="rounded-2xl border bg-background p-8">
              <h3 className="text-xl font-bold">
                The highest standards for your data
              </h3>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Encrypted at rest and in transit. Read-only or
                minimum-necessary access to everything we connect to.
                Never sold, never shared. One-click export, one-click
                delete — your data, on your terms.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-muted/30 px-6 py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold md:text-4xl">
            Built around what actually moves healthspan.
          </h2>
          <p className="mt-6 text-lg text-muted-foreground md:text-xl">
            Cardio fitness. Strength training. Sleep and recovery. Biomarkers
            that catch drift before symptoms. Each Nove product covers one
            slice of that picture, on hardware and habits you already have.
          </p>
        </div>
      </section>
    </main>
  );
}
