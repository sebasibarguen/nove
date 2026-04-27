// ABOUTME: Landing page that redirects authenticated users to dashboard.
// ABOUTME: Shows Google sign-in for unauthenticated visitors.

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Nove</h1>
        <p className="mt-2 text-muted-foreground">
          Your AI-powered health coach
        </p>
      </div>
      <Button asChild>
        <Link href="/login">Get started with Google</Link>
      </Button>
    </div>
  );
}
