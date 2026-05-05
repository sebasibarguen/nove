// ABOUTME: Pulse-branded Garmin connection management page.
// ABOUTME: Triggers OAuth with return_to=pulse so the callback lands on pulse.*.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth";
import { api, ApiError } from "@/lib/api";

interface GarminConnection {
  garmin_user_id: string;
  connected: boolean;
  last_sync_at: string | null;
  created_at: string;
}

export default function PulseGarminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [connection, setConnection] = useState<GarminConnection | null>(null);
  const [fetching, setFetching] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api<GarminConnection | null>("/garmin/connection")
      .then((conn) => {
        if (!cancelled) setConnection(conn);
      })
      .catch((err: ApiError) => {
        console.error("garmin connection fetch failed", err);
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function handleConnect() {
    setBusy(true);
    setError("");
    try {
      const { url } = await api<{ url: string; state: string }>(
        "/garmin/connect-url?return_to=pulse"
      );
      window.location.href = url;
    } catch {
      setError("Could not start Garmin sign-in. Please try again.");
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    setBusy(true);
    setError("");
    try {
      await api("/garmin/connection", { method: "DELETE" });
      setConnection(null);
    } catch {
      setError("Could not disconnect.");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Garmin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {connection?.connected
            ? "Pulse is reading your Garmin data automatically."
            : "Connect your Garmin so Pulse can read your daily metrics."}
        </p>
      </section>

      <p className="text-xs text-muted-foreground">
        Powered by{" "}
        <a
          href="https://www.garmin.com/en-US/health/connect-iq/apps/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          Garmin Health API
        </a>
        . Garmin is a trademark of Garmin Ltd.
      </p>

      {error && (
        <p className="text-sm text-rose-400">{error}</p>
      )}

      <div className="rounded-2xl border border-border bg-card p-6">
        {fetching ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : connection?.connected ? (
          <div className="space-y-4">
            <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                  Garmin user
                </dt>
                <dd className="mt-1 font-mono">{connection.garmin_user_id}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                  Connected since
                </dt>
                <dd className="mt-1">
                  {new Date(connection.created_at).toLocaleDateString("en-US")}
                </dd>
              </div>
              {connection.last_sync_at && (
                <div className="md:col-span-2">
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                    Last sync
                  </dt>
                  <dd className="mt-1">
                    {new Date(connection.last_sync_at).toLocaleString("en-US")}
                  </dd>
                </div>
              )}
            </dl>
            <button
              onClick={handleDisconnect}
              disabled={busy}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
            >
              {busy ? "Working…" : "Disconnect Garmin"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Pulse uses read-only access to your Garmin daily summaries —
              steps, sleep, HRV, body battery. We never write to your account.
            </p>
            <button
              onClick={handleConnect}
              disabled={busy}
              className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Redirecting…" : "Connect with Garmin"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
