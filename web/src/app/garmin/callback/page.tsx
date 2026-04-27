// ABOUTME: Garmin OAuth callback handler page.
// ABOUTME: Exchanges authorization code with backend, then redirects to activity page.

"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const [error, setError] = useState(
    code && state ? "" : "Authorization parameters missing"
  );

  useEffect(() => {
    if (!code || !state) return;

    // /garmin works on both hosts: on pulse.* the proxy rewrites it to
    // /pulse/garmin, on main hosts it serves the top-level page.
    api("/garmin/callback", {
      method: "POST",
      body: JSON.stringify({ code, state }),
    })
      .then(() => {
        router.replace("/garmin");
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Could not connect to Garmin");
        }
      });
  }, [code, state, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <button
            onClick={() => router.push("/activity")}
            className="text-sm underline"
          >
            Back to activity
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Connecting to Garmin…</p>
    </div>
  );
}

export default function GarminCallbackPage() {
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
