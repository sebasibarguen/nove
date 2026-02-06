// ABOUTME: Garmin OAuth callback handler page.
// ABOUTME: Exchanges authorization code with backend, then redirects to activity page.

"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
      setError("Parametros de autorizacion faltantes");
      return;
    }

    api("/garmin/callback", {
      method: "POST",
      body: JSON.stringify({ code, state }),
    })
      .then(() => {
        router.replace("/activity");
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Error al conectar con Garmin");
        }
      });
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <button
            onClick={() => router.push("/activity")}
            className="text-sm underline"
          >
            Volver a actividad
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Conectando con Garmin...</p>
    </div>
  );
}

export default function GarminCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
