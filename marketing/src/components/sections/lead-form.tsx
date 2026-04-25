// ABOUTME: Email capture form with UTM parameter tracking.
// ABOUTME: Posts to /api/leads, redirects to /success on submit.

"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Lang = "es" | "en";

const STRINGS: Record<Lang, { placeholder: string; loading: string; error: string; defaultCta: string }> = {
  es: {
    placeholder: "tu@email.com",
    loading: "Enviando...",
    error: "Hubo un error. Intenta de nuevo.",
    defaultCta: "Quiero saber más",
  },
  en: {
    placeholder: "you@email.com",
    loading: "Sending...",
    error: "Something went wrong. Try again.",
    defaultCta: "Get early access",
  },
};

function LeadFormInner({ slug, ctaText, lang }: { slug: string; ctaText?: string; lang: Lang }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const t = STRINGS[lang];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          utmSource: searchParams.get("utm_source") ?? "",
          utmMedium: searchParams.get("utm_medium") ?? "",
          utmCampaign: searchParams.get("utm_campaign") ?? "",
          landingSlug: slug,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      router.push(`/success?lang=${lang}`);
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-lg flex-col gap-3 sm:flex-row">
      <Input
        type="email"
        placeholder={t.placeholder}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="h-12 flex-1 rounded-full px-5"
      />
      <Button type="submit" disabled={status === "loading"} className="h-12 rounded-full px-8">
        {status === "loading" ? t.loading : (ctaText ?? t.defaultCta)}
      </Button>
      {status === "error" && (
        <p className="text-sm text-destructive">{t.error}</p>
      )}
    </form>
  );
}

export function LeadForm({ slug, ctaText, lang = "es" }: { slug: string; ctaText?: string; lang?: Lang }) {
  return (
    <section id="registro" className="flex flex-col items-center gap-6 px-6 py-16 md:py-24">
      <Suspense fallback={null}>
        <LeadFormInner slug={slug} ctaText={ctaText} lang={lang} />
      </Suspense>
    </section>
  );
}
