// ABOUTME: Main dashboard page shown after login.
// ABOUTME: Placeholder for Phase 0 — will show health snapshot in later phases.

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
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
      <div className="flex items-center justify-between">
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
    </div>
  );
}
