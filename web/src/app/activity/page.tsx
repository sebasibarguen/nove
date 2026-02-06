// ABOUTME: Activity page showing Garmin wearable data.
// ABOUTME: Displays connection status, sleep trends, daily activity, and heart rate.

"use client";

import { useCallback, useEffect, useState } from "react";
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

  const fetchData = useCallback(async () => {
    const conn = await api<GarminConnection | null>("/garmin/connection");
    setConnection(conn);

    if (conn?.connected) {
      const [sleep, activity, stress] = await Promise.all([
        api<DataPoint[]>("/garmin/data?data_type=sleep&days=14"),
        api<DataPoint[]>("/garmin/data?data_type=activity&days=14"),
        api<DataPoint[]>("/garmin/data?data_type=stress&days=14"),
      ]);
      setSleepData(sleep);
      setActivityData(activity);
      setStressData(stress);
    }
  }, []);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

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
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Actividad</h1>
          <p className="text-muted-foreground">
            {connection?.connected
              ? "Datos de tu Garmin"
              : "Conecta tu dispositivo Garmin"}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          Volver
        </Button>
      </div>

      {!connection?.connected ? (
        <Card>
          <CardHeader>
            <CardTitle>Conectar Garmin</CardTitle>
            <CardDescription>
              Conecta tu reloj Garmin para ver tus datos de actividad, sueno,
              frecuencia cardiaca y mas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleConnect} disabled={connecting}>
              {connecting ? "Conectando..." : "Conectar Garmin"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium">Garmin conectado</p>
              {connection.last_sync_at && (
                <p className="text-xs text-muted-foreground">
                  Ultima sincronizacion:{" "}
                  {new Date(connection.last_sync_at).toLocaleString("es-GT")}
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleDisconnect}>
              Desconectar
            </Button>
          </div>

          {sleepData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Sueno</CardTitle>
                <CardDescription>Ultimos 14 dias</CardDescription>
              </CardHeader>
              <CardContent>
                <SleepChart data={sleepData} />
              </CardContent>
            </Card>
          )}

          {activityData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Actividad Diaria</CardTitle>
                <CardDescription>Pasos y distancia</CardDescription>
              </CardHeader>
              <CardContent>
                <ActivityChart data={activityData} />
              </CardContent>
            </Card>
          )}

          {stressData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Estres y Body Battery</CardTitle>
                <CardDescription>Niveles diarios</CardDescription>
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
                    Aun no hay datos sincronizados. Los datos apareceran
                    despues de la primera sincronizacion con Garmin.
                  </p>
                </CardContent>
              </Card>
            )}
        </div>
      )}
    </div>
  );
}
