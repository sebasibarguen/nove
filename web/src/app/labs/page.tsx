// ABOUTME: Lab dashboard showing orders and results.
// ABOUTME: Lists panels for ordering and displays result history.

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Panel {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
}

interface Order {
  id: string;
  order_code: string;
  status: string;
  created_at: string;
}

interface Result {
  id: string;
  processing_status: string;
  ai_summary: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  processing: "Procesando",
  extracted: "Extraido",
  review_needed: "En revision",
  verified: "Verificado",
  failed: "Error",
  sent_to_lab: "Enviado al lab",
  sample_collected: "Muestra tomada",
  completed: "Completado",
  cancelled: "Cancelado",
};

export default function LabsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [panels, setPanels] = useState<Panel[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [ordering, setOrdering] = useState(false);

  const fetchData = useCallback(async () => {
    const [p, o, r] = await Promise.all([
      api<Panel[]>("/lab/panels"),
      api<Order[]>("/lab/orders"),
      api<Result[]>("/lab/results"),
    ]);
    setPanels(p);
    setOrders(o);
    setResults(r);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }
    if (user) fetchData();
  }, [user, authLoading, router, fetchData]);

  async function orderPanel(panelId: string) {
    setOrdering(true);
    try {
      await api("/lab/orders", {
        method: "POST",
        body: JSON.stringify({ panel_id: panelId }),
      });
      await fetchData();
    } catch (err) {
      if (err instanceof ApiError) console.error(err.message);
    } finally {
      setOrdering(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Laboratorios</h1>
        <Button variant="outline" asChild>
          <Link href="/dashboard">&larr; Dashboard</Link>
        </Button>
      </div>

      {/* Panels */}
      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold">Paneles disponibles</h2>
        {panels.length === 0 ? (
          <p className="text-muted-foreground">
            No hay paneles disponibles por el momento.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {panels.map((panel) => (
              <Card key={panel.id}>
                <CardHeader>
                  <CardTitle className="text-base">{panel.name}</CardTitle>
                  <CardDescription>{panel.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <span className="font-medium">
                    Q{(panel.price_cents / 100).toFixed(2)}
                  </span>
                  <Button
                    size="sm"
                    disabled={ordering}
                    onClick={() => orderPanel(panel.id)}
                  >
                    Ordenar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Orders */}
      {orders.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold">Ordenes</h2>
          <div className="space-y-2">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-mono">
                      {order.order_code}
                    </CardTitle>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                  </div>
                  <CardDescription>
                    {new Date(order.created_at).toLocaleDateString("es-GT")}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Results */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Resultados</h2>
        {results.length === 0 ? (
          <p className="text-muted-foreground">
            Aun no tienes resultados de laboratorio.
          </p>
        ) : (
          <div className="space-y-2">
            {results.map((result) => (
              <Link key={result.id} href={`/labs/results/${result.id}`}>
                <Card className="cursor-pointer transition-colors hover:bg-accent">
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">
                        Resultado -{" "}
                        {new Date(result.created_at).toLocaleDateString(
                          "es-GT",
                        )}
                      </CardTitle>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                        {STATUS_LABELS[result.processing_status] ||
                          result.processing_status}
                      </span>
                    </div>
                    {result.ai_summary && (
                      <CardDescription className="line-clamp-2">
                        {result.ai_summary}
                      </CardDescription>
                    )}
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
