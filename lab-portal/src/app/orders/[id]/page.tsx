// ABOUTME: Lab portal order detail page with PDF upload.
// ABOUTME: Partners can view order details and upload lab result PDFs.

"use client";

import { FormEvent, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    setError("");

    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Seleccione un archivo PDF");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Solo se aceptan archivos PDF");
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem("portal_token");
      const formData = new FormData();
      formData.append("file", file);

      const resp = await fetch(
        `${API_BASE}/portal/orders/${params.id}/results`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
      );

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({ detail: "Upload failed" }));
        throw new ApiError(resp.status, data.detail);
      }

      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Error al subir archivo");
      }
    } finally {
      setUploading(false);
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Resultado subido</CardTitle>
            <CardDescription>
              El PDF fue recibido y sera procesado automaticamente.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => router.push("/orders")} className="w-full">
              Volver a ordenes
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Subir Resultado</CardTitle>
          <CardDescription>
            Suba el archivo PDF con los resultados de laboratorio
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleUpload}>
          <CardContent className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="space-y-2">
              <Label htmlFor="pdf">Archivo PDF</Label>
              <Input id="pdf" type="file" accept=".pdf" ref={fileRef} />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={uploading}>
              {uploading ? "Subiendo..." : "Subir resultado"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
