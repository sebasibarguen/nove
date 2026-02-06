// ABOUTME: Lab portal login page placeholder.
// ABOUTME: Will be replaced with full login form in Phase 3.

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Nove - Portal de Laboratorio</CardTitle>
          <CardDescription>
            Acceso para socios de laboratorio. Disponible pronto.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
