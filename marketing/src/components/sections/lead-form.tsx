// ABOUTME: Email capture form with UTM parameter tracking.
// ABOUTME: Posts to /api/leads, reads UTM from URL search params.

"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function LeadFormInner({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

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
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <p className="text-center text-lg font-medium text-primary">
        ¡Listo! Te enviaremos más información pronto.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
      <Input
        type="email"
        placeholder="tu@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="flex-1"
      />
      <Button type="submit" disabled={status === "loading"}>
        {status === "loading" ? "Enviando..." : "Registrarme"}
      </Button>
      {status === "error" && (
        <p className="text-sm text-destructive">Hubo un error. Intenta de nuevo.</p>
      )}
    </form>
  );
}

export function LeadForm({ slug }: { slug: string }) {
  return (
    <section id="registro" className="flex flex-col items-center gap-6 px-6 py-16 md:py-24">
      <Suspense fallback={null}>
        <LeadFormInner slug={slug} />
      </Suspense>
    </section>
  );
}
