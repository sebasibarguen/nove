// ABOUTME: Lab result detail page showing biomarker values and AI summary.
// ABOUTME: Displays individual values with status indicators and reference ranges.

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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

interface BiomarkerValue {
  id: string;
  biomarker_code: string;
  biomarker_name: string;
  value: number;
  unit: string;
  reference_range_low: number | null;
  reference_range_high: number | null;
  status: string;
  date: string;
}

interface LabResult {
  id: string;
  processing_status: string;
  ai_summary: string | null;
  confidence_score: number | null;
  reviewed_by: string | null;
  created_at: string;
  biomarker_values: BiomarkerValue[];
}

const STATUS_COLORS: Record<string, string> = {
  normal: "text-green-600 bg-green-50",
  borderline: "text-yellow-600 bg-yellow-50",
  flagged: "text-red-600 bg-red-50",
};

export default function ResultDetailPage() {
  const params = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [result, setResult] = useState<LabResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }
    if (user && params.id) {
      api<LabResult>(`/lab/results/${params.id}`)
        .then(setResult)
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router, params.id]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Resultado no encontrado</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Resultado de Laboratorio</h1>
        <Button variant="outline" asChild>
          <Link href="/labs">&larr; Laboratorios</Link>
        </Button>
      </div>

      {/* AI Summary */}
      {result.ai_summary && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-base">Resumen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{result.ai_summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Meta info */}
      <div className="mb-6 flex gap-4 text-sm text-muted-foreground">
        <span>
          Fecha: {new Date(result.created_at).toLocaleDateString("es-GT")}
        </span>
        {result.confidence_score !== null && (
          <span>
            Confianza: {(result.confidence_score * 100).toFixed(0)}%
          </span>
        )}
        {result.reviewed_by && <span>Revisado por: {result.reviewed_by}</span>}
      </div>

      {/* Biomarker Values */}
      {result.biomarker_values.length === 0 ? (
        <p className="text-muted-foreground">
          Los biomarcadores estan siendo procesados...
        </p>
      ) : (
        <div className="space-y-3">
          {result.biomarker_values.map((bm) => (
            <Card key={bm.id}>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">
                      {bm.biomarker_name}
                    </CardTitle>
                    <CardDescription className="font-mono text-xs">
                      {bm.biomarker_code}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">
                      {bm.value} {bm.unit}
                    </p>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[bm.status] || "text-gray-600 bg-gray-50"}`}
                    >
                      {bm.status === "normal"
                        ? "Normal"
                        : bm.status === "borderline"
                          ? "Limite"
                          : "Fuera de rango"}
                    </span>
                  </div>
                </div>
                {(bm.reference_range_low !== null ||
                  bm.reference_range_high !== null) && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Rango referencia: {bm.reference_range_low ?? "—"} -{" "}
                    {bm.reference_range_high ?? "—"} {bm.unit}
                  </p>
                )}
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
