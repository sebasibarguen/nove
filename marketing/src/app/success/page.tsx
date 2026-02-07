// ABOUTME: Success page shown after lead form submission.
// ABOUTME: Serves as conversion tracking URL for Google Ads and Meta Pixel.

import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nove — ¡Registro exitoso!",
  robots: "noindex",
};

export default function SuccessPage() {
  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
        <span className="text-3xl text-emerald-600">&#10003;</span>
      </div>
      <h1 className="text-3xl font-bold">¡Listo!</h1>
      <p className="max-w-md text-lg text-muted-foreground">
        Te enviaremos más información sobre cómo Nove puede ayudarte a cuidar tu salud.
      </p>
      <Button asChild variant="outline" className="rounded-full">
        <a href="/">Volver al inicio</a>
      </Button>
    </main>
  );
}
