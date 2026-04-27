// ABOUTME: Garmin connection page for managing the wearable integration.
// ABOUTME: Connect/disconnect, request data backfill, and display synced data.

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

interface BackfillResult {
  requested_types: string[];
  successful: number;
  total: number;
}

const DATA_TYPES = ["activity", "sleep", "stress", "vo2max"] as const;

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (key.toLowerCase().includes("seconds") && typeof value === "number") {
    const h = Math.floor(value / 3600);
    const m = Math.floor((value % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }
  if (typeof value === "number") {
    return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1);
  }
  return String(value);
}

const SUMMARY_FIELDS: Record<string, string[]> = {
  activity: [
    "steps",
    "distanceInMeters",
    "activeTimeInSeconds",
    "floorsClimbed",
    "activeKilocalories",
    "averageHeartRateInBeatsPerMinute",
    "restingHeartRateInBeatsPerMinute",
    "maxHeartRateInBeatsPerMinute",
  ],
  sleep: [
    "durationInSeconds",
    "deepSleepDurationInSeconds",
    "lightSleepDurationInSeconds",
    "remSleepInSeconds",
    "awakeDurationInSeconds",
    "averageSpO2Value",
  ],
  stress: [
    "averageStressLevel",
    "maxStressLevel",
    "restStressDurationInSeconds",
    "activityStressDurationInSeconds",
    "bodyBatteryChargedValue",
    "bodyBatteryDrainedValue",
  ],
  vo2max: ["vo2Max", "fitnessAge"],
};

function DataCard({ type, points }: { type: string; points: DataPoint[] }) {
  const [expanded, setExpanded] = useState(false);
  const fields = SUMMARY_FIELDS[type] || [];

  if (points.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="capitalize">{type}</CardTitle>
          <CardDescription>Sin datos</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="capitalize">{type}</CardTitle>
        <CardDescription>
          {points.length} punto{points.length !== 1 && "s"} — ultimos 7 dias
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {points.map((point) => (
          <div key={point.date} className="rounded-lg border p-3">
            <p className="mb-2 text-sm font-medium">{point.date}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {fields.map((field) => {
                const value = point.data[field];
                if (value === undefined) return null;
                return (
                  <div key={field} className="flex justify-between">
                    <span className="text-muted-foreground">
                      {field.replace(/InSeconds|InMeters|InBeatsPerMinute/g, "").replace(/([A-Z])/g, " $1").trim()}
                    </span>
                    <span className="font-mono">{formatValue(field, value)}</span>
                  </div>
                );
              })}
            </div>
            {expanded && (
              <pre className="mt-2 max-h-48 overflow-auto rounded bg-muted p-2 text-xs">
                {JSON.stringify(point.data, null, 2)}
              </pre>
            )}
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Ocultar JSON" : "Ver JSON crudo"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function GarminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [connection, setConnection] = useState<GarminConnection | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<BackfillResult | null>(null);
  const [dataByType, setDataByType] = useState<Record<string, DataPoint[]>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  const fetchConnection = useCallback(async () => {
    const conn = await api<GarminConnection | null>("/garmin/connection");
    setConnection(conn);
    return conn;
  }, []);

  const fetchAllData = useCallback(async () => {
    const results: Record<string, DataPoint[]> = {};
    await Promise.all(
      DATA_TYPES.map(async (type) => {
        results[type] = await api<DataPoint[]>(
          `/garmin/data?data_type=${type}&days=7`
        );
      })
    );
    setDataByType(results);
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchConnection().then((conn) => {
      if (conn?.connected) fetchAllData();
    });
  }, [user, fetchConnection, fetchAllData]);

  async function handleConnect() {
    setConnecting(true);
    setError("");
    try {
      const { url } = await api<{ url: string; state: string }>(
        "/garmin/connect-url"
      );
      window.location.href = url;
    } catch {
      setError("Error al generar URL de conexion");
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    await api("/garmin/connection", { method: "DELETE" });
    setConnection(null);
    setDataByType({});
    setBackfillResult(null);
  }

  async function handleBackfill() {
    setBackfilling(true);
    setError("");
    setBackfillResult(null);
    try {
      const result = await api<BackfillResult>("/garmin/backfill", {
        method: "POST",
      });
      setBackfillResult(result);
    } catch {
      setError("Error al solicitar datos historicos");
    } finally {
      setBackfilling(false);
    }
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
          <h1 className="text-2xl font-bold">Garmin</h1>
          <p className="text-muted-foreground">
            {connection?.connected
              ? "Conectado — los datos se actualizan automaticamente"
              : "Conecta tu dispositivo Garmin"}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          Volver
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!connection?.connected ? (
        <Card>
          <CardHeader>
            <CardTitle>Conectar Garmin</CardTitle>
            <CardDescription>
              Autoriza el acceso a tus datos de salud de Garmin Connect.
              Los datos se reciben automaticamente cuando Garmin los envia.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleConnect} disabled={connecting}>
              {connecting ? "Redirigiendo..." : "Conectar con Garmin"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conexion activa</CardTitle>
              <CardDescription>
                ID: {connection.garmin_user_id} — Conectado desde{" "}
                {new Date(connection.created_at).toLocaleDateString("es-GT")}
                {connection.last_sync_at && (
                  <>
                    {" "}— Ultima actualizacion:{" "}
                    {new Date(connection.last_sync_at).toLocaleString("es-GT")}
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Garmin envia tus datos automaticamente. Si necesitas datos
                historicos, solicita un backfill.
              </p>
              <div className="flex gap-3">
                <Button onClick={handleBackfill} disabled={backfilling}>
                  {backfilling ? "Solicitando..." : "Solicitar datos historicos"}
                </Button>
                <Button variant="outline" onClick={handleDisconnect}>
                  Desconectar
                </Button>
              </div>
            </CardContent>
          </Card>

          {backfillResult && (
            <Card>
              <CardHeader>
                <CardTitle>Backfill solicitado</CardTitle>
                <CardDescription>
                  {backfillResult.successful}/{backfillResult.total} tipos
                  solicitados correctamente. Los datos llegaran en los proximos
                  minutos via webhook.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Tipos: {backfillResult.requested_types.join(", ")}
                </p>
              </CardContent>
            </Card>
          )}

          {DATA_TYPES.map((type) => (
            <DataCard
              key={type}
              type={type}
              points={dataByType[type] || []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
