// ABOUTME: Healthspan dashboard showing hero scores, Nove Age, and health pillar cards.
// ABOUTME: Shows onboarding CTAs when data sources are missing, full view when populated.

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth";
import { api, API_BASE } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScoreDial } from "./score-dial";
import { NoveAgeCard } from "./nove-age-card";
import { CardioPillar } from "./cardio-pillar";
import { SleepPillar } from "./sleep-pillar";
import { ActivityPillar } from "./activity-pillar";
import { MetabolicPillar } from "./metabolic-pillar";
import { StressPillar } from "./stress-pillar";

interface DashboardSnapshot {
  scores: {
    recovery: { value: number | null; label: string; color: string | null };
    strain: { value: number | null; label: string; color: string | null };
    sleep: { value: number | null; label: string; color: string | null };
  };
  nove_age: {
    physiological: number | null;
    chronological: number | null;
    delta: number | null;
    inputs_used: number;
  };
  garmin: {
    connected: boolean;
    last_sync: string | null;
  };
  pillars: {
    cardio: {
      resting_hr: number | null;
      vo2_max: number | null;
      fitness_age: number | null;
      hr_trend: { date: string; value: number }[];
    } | null;
    sleep: {
      last_night_score: number | null;
      duration_hours: number | null;
      deep_pct: number | null;
      rem_pct: number | null;
      duration_trend: { date: string; value: number }[];
    } | null;
    activity: {
      steps: number | null;
      active_minutes: number | null;
      calories: number | null;
      steps_trend: { date: string; value: number }[];
    } | null;
    metabolic: {
      biomarkers: {
        code: string;
        name: string;
        value: number;
        unit: string;
        status: string;
        reference_range_low: number | null;
        reference_range_high: number | null;
      }[];
    } | null;
    stress: {
      avg_stress: number | null;
      body_battery: number | null;
      stress_trend: { date: string; value: number }[];
    } | null;
  };
  onboarding: {
    garmin_connected: boolean;
    has_lab_results: boolean;
    gmail_available: boolean;
  };
}

function SetupChecklist({
  snapshot,
  onUploadComplete,
}: {
  snapshot: DashboardSnapshot;
  onUploadComplete: () => void;
}) {
  const { garmin_connected, has_lab_results, gmail_available } =
    snapshot.onboarding;
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const allDone = garmin_connected && has_lab_results;
  if (allDone) return null;

  async function handleUpload() {
    setUploadError("");
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Solo se aceptan archivos PDF");
      return;
    }
    setUploading(true);
    try {
      const token = localStorage.getItem("access_token");
      const formData = new FormData();
      formData.append("file", file);
      const resp = await fetch(`${API_BASE}/lab/results/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({ detail: "Error" }));
        setUploadError(data.detail || "Error al subir archivo");
        return;
      }
      if (fileRef.current) fileRef.current.value = "";
      onUploadComplete();
    } catch {
      setUploadError("Error al subir archivo");
    } finally {
      setUploading(false);
    }
  }

  async function handleGmailImport() {
    setImporting(true);
    try {
      await api("/lab/gmail-import", { method: "POST" });
      onUploadComplete();
    } catch {
      // Gmail import may fail silently if no results found
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Completa tu perfil de salud</h2>

      {/* Lab results upload */}
      {!has_lab_results && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Resultados de laboratorio</CardTitle>
            <CardDescription>
              Sube tus PDFs de laboratorio para crear tu historial y ver tus
              biomarcadores
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {uploadError && (
              <p className="text-destructive text-sm">{uploadError}</p>
            )}
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".pdf"
                ref={fileRef}
                className="flex-1"
              />
              <Button
                size="sm"
                disabled={uploading}
                onClick={handleUpload}
              >
                {uploading ? "Subiendo..." : "Subir PDF"}
              </Button>
            </div>
            {gmail_available && (
              <Button
                variant="outline"
                size="sm"
                disabled={importing}
                onClick={handleGmailImport}
                className="w-full"
              >
                {importing
                  ? "Buscando en Gmail..."
                  : "Buscar resultados en Gmail automaticamente"}
              </Button>
            )}
            <Link href="/labs" className="text-muted-foreground block text-xs hover:underline">
              O ve a Laboratorios para mas opciones
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Garmin connection */}
      {!garmin_connected && (
        <Link href="/garmin">
          <Card className="cursor-pointer transition-colors hover:bg-accent/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Conecta tu Garmin</CardTitle>
              <CardDescription>
                Sincroniza tus datos de actividad, sueno y estres para ver tus
                metricas diarias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="sm" variant="outline">
                Conectar Garmin
              </Button>
            </CardContent>
          </Card>
        </Link>
      )}
    </div>
  );
}

function hasAnyScores(snapshot: DashboardSnapshot): boolean {
  const { recovery, strain, sleep } = snapshot.scores;
  return (
    recovery.value != null || strain.value != null || sleep.value != null
  );
}

function hasAnyPillars(snapshot: DashboardSnapshot): boolean {
  const { cardio, sleep, activity, stress, metabolic } = snapshot.pillars;
  return (
    cardio != null ||
    sleep != null ||
    activity != null ||
    stress != null ||
    metabolic != null
  );
}

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [error, setError] = useState(false);

  function fetchSnapshot() {
    if (!user) return;
    api<DashboardSnapshot>("/dashboard/snapshot")
      .then(setSnapshot)
      .catch(() => setError(true));
  }

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
    if (!loading && user && !user.onboarding_completed) {
      router.replace("/onboarding");
    }
  }, [user, loading, router]);

  useEffect(() => {
    fetchSnapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hola, {user.full_name}</h1>
          <p className="text-muted-foreground">Tu salud de un vistazo</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            logout();
            router.push("/");
          }}
        >
          Cerrar sesion
        </Button>
      </div>

      {error && (
        <p className="text-destructive mb-4 text-sm">
          No se pudo cargar el dashboard. Intenta de nuevo.
        </p>
      )}

      {snapshot && (
        <div className="space-y-8">
          {/* Setup checklist — shown when data is missing */}
          <SetupChecklist
            snapshot={snapshot}
            onUploadComplete={fetchSnapshot}
          />

          {/* Hero Score Dials — only show when we have data */}
          {hasAnyScores(snapshot) && (
            <div className="flex justify-center gap-6">
              <ScoreDial
                value={snapshot.scores.recovery.value}
                label={snapshot.scores.recovery.label}
                color={snapshot.scores.recovery.color}
              />
              <ScoreDial
                value={snapshot.scores.strain.value}
                label={snapshot.scores.strain.label}
                color={snapshot.scores.strain.color}
                max={21}
              />
              <ScoreDial
                value={snapshot.scores.sleep.value}
                label={snapshot.scores.sleep.label}
                color={snapshot.scores.sleep.color}
              />
            </div>
          )}

          {/* Nove Age — only show when computed */}
          {snapshot.nove_age.physiological != null && (
            <NoveAgeCard
              physiological={snapshot.nove_age.physiological}
              chronological={snapshot.nove_age.chronological}
              delta={snapshot.nove_age.delta}
              inputsUsed={snapshot.nove_age.inputs_used}
            />
          )}

          {/* Health Pillars — only show when we have data */}
          {hasAnyPillars(snapshot) && (
            <div className="space-y-3">
              {snapshot.pillars.cardio && (
                <CardioPillar data={snapshot.pillars.cardio} />
              )}
              {snapshot.pillars.sleep && (
                <SleepPillar data={snapshot.pillars.sleep} />
              )}
              {snapshot.pillars.activity && (
                <ActivityPillar data={snapshot.pillars.activity} />
              )}
              {snapshot.pillars.stress && (
                <StressPillar data={snapshot.pillars.stress} />
              )}
              {snapshot.pillars.metabolic && (
                <MetabolicPillar data={snapshot.pillars.metabolic} />
              )}
            </div>
          )}

          {/* Quick Links */}
          <div className="flex justify-center gap-4 pt-4">
            <Link href="/chat">
              <Button variant="ghost" size="sm">
                Coach
              </Button>
            </Link>
            <Link href="/garmin">
              <Button variant="ghost" size="sm">
                Garmin
              </Button>
            </Link>
            <Link href="/labs">
              <Button variant="ghost" size="sm">
                Labs
              </Button>
            </Link>
            <Link href="/activity">
              <Button variant="ghost" size="sm">
                Actividad
              </Button>
            </Link>
          </div>
        </div>
      )}

      {!snapshot && !error && (
        <div className="flex justify-center py-12">
          <p className="text-muted-foreground">Cargando dashboard...</p>
        </div>
      )}
    </div>
  );
}
