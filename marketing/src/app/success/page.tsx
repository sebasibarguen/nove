// ABOUTME: Success page shown after lead form submission.
// ABOUTME: Fires Google Ads conversion event and serves as tracking URL.

import { Button } from "@/components/ui/button";
import Script from "next/script";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nove — ¡Registro exitoso!",
  robots: "noindex",
};

type Lang = "es" | "en";

const STRINGS: Record<Lang, { headline: string; subtext: string; back: string }> = {
  es: {
    headline: "¡Listo!",
    subtext: "Te enviaremos más información sobre cómo Nove puede ayudarte a cuidar tu salud.",
    back: "Volver al inicio",
  },
  en: {
    headline: "You're in.",
    subtext: "We'll email you when Pulse is ready. Thanks for signing up early.",
    back: "Back to home",
  },
};

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang } = await searchParams;
  const t = STRINGS[lang === "en" ? "en" : "es"];
  const hasMetaPixel = Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID);
  const hasRedditPixel = Boolean(process.env.NEXT_PUBLIC_REDDIT_PIXEL_ID);

  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <Script id="gtag-conversion" strategy="afterInteractive">
        {`gtag('event', 'conversion', { send_to: 'AW-18030108336' });`}
      </Script>
      {hasMetaPixel && (
        <Script id="fbq-lead" strategy="afterInteractive">
          {`if (typeof fbq === 'function') fbq('track', 'Lead');`}
        </Script>
      )}
      {hasRedditPixel && (
        <Script id="rdt-lead" strategy="afterInteractive">
          {`if (typeof rdt === 'function') rdt('track', 'Lead');`}
        </Script>
      )}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
        <span className="text-3xl text-emerald-600">&#10003;</span>
      </div>
      <h1 className="text-3xl font-bold">{t.headline}</h1>
      <p className="max-w-md text-lg text-muted-foreground">
        {t.subtext}
      </p>
      <Button asChild variant="outline" className="rounded-full">
        <a href="/">{t.back}</a>
      </Button>
    </main>
  );
}
