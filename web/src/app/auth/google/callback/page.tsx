// ABOUTME: Google OAuth callback page.
// ABOUTME: Exchanges authorization code with backend, stores tokens, redirects to dashboard.

"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth";
import { API_BASE } from "@/lib/api";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");

    if (!code) {
      setError("Codigo de autorizacion faltante");
      return;
    }

    (async () => {
      try {
        const resp = await fetch(`${API_BASE}/auth/google/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        if (!resp.ok) {
          const data = await resp.json().catch(() => ({ detail: "Error" }));
          setError(data.detail || "Error al autenticar con Google");
          return;
        }

        const tokens = await resp.json();
        localStorage.setItem("access_token", tokens.access_token);
        localStorage.setItem("refresh_token", tokens.refresh_token);
        await refreshUser();
        router.replace("/dashboard");
      } catch {
        setError("Error de conexion");
      }
    })();
  }, [searchParams, router, refreshUser]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <button
            onClick={() => router.push("/login")}
            className="text-sm underline"
          >
            Volver a inicio de sesion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Autenticando con Google...</p>
    </div>
  );
}

export default function GoogleCallbackPage() {
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
