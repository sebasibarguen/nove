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
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const [error, setError] = useState(code ? "" : "Authorization code missing");

  useEffect(() => {
    if (!code) return;

    // The backend embeds an optional return_to brand in state as "<nonce>:<brand>".
    // We use it to route Pulse users back to pulse.* and main users to /dashboard.
    const returnTo = state?.includes(":") ? state.split(":", 2)[1] : null;

    (async () => {
      try {
        const resp = await fetch(`${API_BASE}/auth/google/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, state }),
        });

        if (!resp.ok) {
          const data = await resp.json().catch(() => ({ detail: "Error" }));
          setError(data.detail || "Could not sign in with Google");
          return;
        }

        const tokens = await resp.json();
        localStorage.setItem("access_token", tokens.access_token);
        localStorage.setItem("refresh_token", tokens.refresh_token);
        await refreshUser();

        // When return_to=pulse, the backend set redirect_uri to the pulse subdomain,
        // so this callback runs on pulse.* and tokens are stored there. Route to pulse home.
        // If the callback somehow ends up on the wrong host (e.g. pulse redirect_uri not
        // registered in Google Console yet), fall back to /dashboard so the user still lands signed in.
        if (returnTo === "pulse" && window.location.host.startsWith("pulse.")) {
          router.replace("/");
        } else {
          router.replace("/dashboard");
        }
      } catch {
        setError("Connection error");
      }
    })();
  }, [code, state, router, refreshUser]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <button
            onClick={() => router.push("/login")}
            className="text-sm underline"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Signing in with Google…</p>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
