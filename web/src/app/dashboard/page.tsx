// ABOUTME: Main dashboard page shown after login.
// ABOUTME: Redirects to onboarding if profile incomplete; shows health snapshot placeholder.

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
    if (!loading && user && !user.onboarding_completed) {
      router.replace("/onboarding");
    }
  }, [user, loading, router]);

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
          <h1 className="text-2xl font-bold">Hola, {user.full_name}</h1>
          <p className="text-muted-foreground">Bienvenido a Nove</p>
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

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/chat">
          <Card className="cursor-pointer transition-colors hover:bg-accent">
            <CardHeader>
              <CardTitle>Coach de Salud</CardTitle>
              <CardDescription>
                Habla con tu coach de salud personal
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/activity">
          <Card className="cursor-pointer transition-colors hover:bg-accent">
            <CardHeader>
              <CardTitle>Actividad</CardTitle>
              <CardDescription>
                Conecta tu Garmin para ver tus datos
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/labs">
          <Card className="cursor-pointer transition-colors hover:bg-accent">
            <CardHeader>
              <CardTitle>Laboratorios</CardTitle>
              <CardDescription>
                Ordena y revisa tus resultados de laboratorio
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
            <CardDescription>
              Actualiza tu informacion de salud
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
