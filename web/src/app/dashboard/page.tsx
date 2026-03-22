// ABOUTME: Healthspan dashboard showing hero scores, Nove Age, and health pillar cards.
// ABOUTME: Fetches a single snapshot from the backend and renders the full view.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ScoreDial } from "./score-dial";
import { NoveAgeCard } from "./nove-age-card";
import { CardioPillar } from "./cardio-pillar";
import { SleepPillar } from "./sleep-pillar";
import { ActivityPillar } from "./activity-pillar";
import { MetabolicPillar } from "./metabolic-pillar";
import { StressPillar } from "./stress-pillar";
import { MissingDataCta } from "./missing-data-cta";

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
}

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
    if (!loading && user && !user.onboarding_completed) {
      router.replace("/onboarding");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    api<DashboardSnapshot>("/dashboard/snapshot")
      .then(setSnapshot)
      .catch(() => setError(true));
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
        <div className="space-y-6">
          {/* Hero Score Dials */}
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

          {/* Nove Age */}
          <NoveAgeCard
            physiological={snapshot.nove_age.physiological}
            chronological={snapshot.nove_age.chronological}
            delta={snapshot.nove_age.delta}
            inputsUsed={snapshot.nove_age.inputs_used}
          />

          {/* Health Pillars */}
          <div className="space-y-3">
            {!snapshot.garmin.connected ? (
              <MissingDataCta
                message="Conecta tu Garmin para ver tus datos de salud"
                href="/garmin"
                buttonLabel="Conectar Garmin"
              />
            ) : (
              <>
                {snapshot.pillars.cardio ? (
                  <CardioPillar data={snapshot.pillars.cardio} />
                ) : null}
                {snapshot.pillars.sleep ? (
                  <SleepPillar data={snapshot.pillars.sleep} />
                ) : null}
                {snapshot.pillars.activity ? (
                  <ActivityPillar data={snapshot.pillars.activity} />
                ) : null}
                {snapshot.pillars.stress ? (
                  <StressPillar data={snapshot.pillars.stress} />
                ) : null}
              </>
            )}

            {snapshot.pillars.metabolic ? (
              <MetabolicPillar data={snapshot.pillars.metabolic} />
            ) : (
              <MissingDataCta
                message="Sube tus resultados de laboratorio para ver tu perfil metabolico"
                href="/labs"
                buttonLabel="Subir resultados"
              />
            )}
          </div>

          {/* Quick Links */}
          <div className="flex justify-center gap-4 pt-4">
            <Link href="/chat">
              <Button variant="ghost" size="sm">Coach</Button>
            </Link>
            <Link href="/garmin">
              <Button variant="ghost" size="sm">Garmin</Button>
            </Link>
            <Link href="/labs">
              <Button variant="ghost" size="sm">Labs</Button>
            </Link>
            <Link href="/activity">
              <Button variant="ghost" size="sm">Actividad</Button>
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
