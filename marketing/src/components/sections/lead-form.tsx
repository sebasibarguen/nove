// ABOUTME: Email capture form with UTM parameter tracking.
// ABOUTME: Posts to /api/leads, redirects to /success on submit.

"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function LeadFormInner({ slug, ctaText }: { slug: string; ctaText?: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

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
      router.push("/success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-lg flex-col gap-3 sm:flex-row">
      <Input
        type="email"
        placeholder="tu@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="h-12 flex-1 rounded-full px-5"
      />
      <Button type="submit" disabled={status === "loading"} className="h-12 rounded-full px-8">
        {status === "loading" ? "Enviando..." : (ctaText ?? "Registrarme")}
      </Button>
      {status === "error" && (
        <p className="text-sm text-destructive">Hubo un error. Intenta de nuevo.</p>
      )}
    </form>
  );
}

export function LeadForm({ slug, ctaText }: { slug: string; ctaText?: string }) {
  return (
    <section id="registro" className="flex flex-col items-center gap-6 px-6 py-16 md:py-24">
      <Suspense fallback={null}>
        <LeadFormInner slug={slug} ctaText={ctaText} />
      </Suspense>
    </section>
  );
}
