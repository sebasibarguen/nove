// ABOUTME: Conversation list page showing all user conversations.
// ABOUTME: Allows creating new conversations and navigating to existing ones.

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface Conversation {
  id: string;
  title: string | null;
  conversation_type: string;
  created_at: string;
  updated_at: string;
}

export default function ChatPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    try {
      const data = await api<Conversation[]>("/conversations");
      setConversations(data);
    } catch {
      // silently fail on load
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }
    if (user) {
      fetchConversations();
    }
  }, [user, authLoading, router, fetchConversations]);

  async function createConversation() {
    try {
      const conv = await api<Conversation>("/conversations", {
        method: "POST",
        body: JSON.stringify({ conversation_type: "general" }),
      });
      router.push(`/chat/${conv.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        console.error(err.message);
      }
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Conversaciones</h1>
        <Button onClick={createConversation}>Nueva conversacion</Button>
      </div>

      {conversations.length === 0 ? (
        <p className="text-center text-muted-foreground">
          No tienes conversaciones aun. Inicia una nueva para hablar con tu
          coach.
        </p>
      ) : (
        <div className="space-y-3">
          {conversations.map((conv) => (
            <Card
              key={conv.id}
              className="cursor-pointer transition-colors hover:bg-accent"
              onClick={() => router.push(`/chat/${conv.id}`)}
            >
              <CardHeader className="py-4">
                <CardTitle className="text-base">
                  {conv.title || "Nueva conversacion"}
                </CardTitle>
                <CardDescription>
                  {new Date(conv.updated_at).toLocaleDateString("es-GT", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
