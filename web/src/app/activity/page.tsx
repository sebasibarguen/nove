// ABOUTME: Activity page showing Garmin wearable data.
// ABOUTME: Displays connection status, sleep trends, daily activity, and heart rate.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SleepChart } from "./sleep-chart";
import { ActivityChart } from "./activity-chart";
import { HeartRateChart } from "./heart-rate-chart";

interface GarminConnection {
  garmin_user_id: string;
  connected: boolean;
  last_sync_at: string | null;
  created_at: string;
}

interface DataPoint {
  data_type: string;
  date: string;
  data: Record<string, unknown>;
}

export default function ActivityPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [connection, setConnection] = useState<GarminConnection | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [sleepData, setSleepData] = useState<DataPoint[]>([]);
  const [activityData, setActivityData] = useState<DataPoint[]>([]);
  const [stressData, setStressData] = useState<DataPoint[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const conn = await api<GarminConnection | null>("/garmin/connection");
      if (cancelled) return;
      setConnection(conn);

      if (conn?.connected) {
        const [sleep, activity, stress] = await Promise.all([
          api<DataPoint[]>("/garmin/data?data_type=sleep&days=14"),
          api<DataPoint[]>("/garmin/data?data_type=activity&days=14"),
          api<DataPoint[]>("/garmin/data?data_type=stress&days=14"),
        ]);
        if (cancelled) return;
        setSleepData(sleep);
        setActivityData(activity);
        setStressData(stress);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function handleConnect() {
    setConnecting(true);
    try {
      const { url } = await api<{ url: string; state: string }>(
        "/garmin/connect-url"
      );
      // Save state in sessionStorage for verification
      window.location.href = url;
    } catch {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    await api("/garmin/connection", { method: "DELETE" });
    setConnection(null);
    setSleepData([]);
    setActivityData([]);
    setStressData([]);
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Activity</h1>
          <p className="text-muted-foreground">
            {connection?.connected
              ? "Data from your Garmin"
              : "Connect your Garmin device"}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          Back
        </Button>
      </div>

      {!connection?.connected ? (
        <Card>
          <CardHeader>
            <CardTitle>Connect Garmin</CardTitle>
            <CardDescription>
              Connect your Garmin watch to see your activity, sleep, heart
              rate, and more.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleConnect} disabled={connecting}>
              {connecting ? "Connecting…" : "Connect Garmin"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium">Garmin connected</p>
              {connection.last_sync_at && (
                <p className="text-xs text-muted-foreground">
                  Last sync:{" "}
                  {new Date(connection.last_sync_at).toLocaleString("en-US")}
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleDisconnect}>
              Disconnect
            </Button>
          </div>

          {sleepData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Sleep</CardTitle>
                <CardDescription>Last 14 days</CardDescription>
              </CardHeader>
              <CardContent>
                <SleepChart data={sleepData} />
              </CardContent>
            </Card>
          )}

          {activityData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Daily Activity</CardTitle>
                <CardDescription>Steps and distance</CardDescription>
              </CardHeader>
              <CardContent>
                <ActivityChart data={activityData} />
              </CardContent>
            </Card>
          )}

          {stressData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Stress and Body Battery</CardTitle>
                <CardDescription>Daily levels</CardDescription>
              </CardHeader>
              <CardContent>
                <HeartRateChart data={stressData} />
              </CardContent>
            </Card>
          )}

          {sleepData.length === 0 &&
            activityData.length === 0 &&
            stressData.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    No synced data yet. Data will appear after the first sync
                    with Garmin.
                  </p>
                </CardContent>
              </Card>
            )}
        </div>
      )}
    </div>
  );
}
