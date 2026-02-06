// ABOUTME: Login page with Google OAuth sign-in.
// ABOUTME: Redirects to Google consent page for authentication.

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

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  async function handleGoogleLogin() {
    setLoading(true);
    try {
      const { url } = await api<{ url: string }>("/auth/google/url");
      window.location.href = url;
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Nove</CardTitle>
          <CardDescription>
            Tu coach de salud con inteligencia artificial
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            {loading ? "Redirigiendo..." : "Continuar con Google"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
