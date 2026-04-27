// ABOUTME: Pulse daily journal — checklist of habits that affect recovery.
// ABOUTME: Upserts today's entry; correlation with recovery score arrives in phase 2.

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth";
import { api, ApiError } from "@/lib/api";

interface Question {
  id: string;
  label: string;
}

interface JournalEntry {
  date: string;
  responses: Record<string, boolean>;
  notes: string | null;
}

export default function JournalPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([
      api<Question[]>("/pulse/journal/questions"),
      api<JournalEntry>("/pulse/journal/today"),
    ])
      .then(([qs, entry]) => {
        if (cancelled) return;
        setQuestions(qs);
        setResponses(entry.responses);
        setNotes(entry.notes ?? "");
      })
      .catch((err: ApiError) => {
        console.error("journal load failed", err);
        if (!cancelled) setError("Couldn't load the journal.");
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggle = useCallback((id: string) => {
    setResponses((prev) => ({ ...prev, [id]: !prev[id] }));
    setSavedAt(null);
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await api<JournalEntry>("/pulse/journal/today", {
        method: "PUT",
        body: JSON.stringify({
          responses,
          notes: notes.trim() || null,
        }),
      });
      setSavedAt(new Date());
    } catch {
      setError("Couldn't save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Journal</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What happened yesterday? Tap any habit that applies.
        </p>
      </section>

      {fetching ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-card">
            <ul className="divide-y divide-border">
              {questions.map((q) => {
                const checked = responses[q.id] ?? false;
                return (
                  <li key={q.id}>
                    <button
                      type="button"
                      onClick={() => toggle(q.id)}
                      className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-muted/40"
                    >
                      <span className="text-sm">{q.label}</span>
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-md border transition ${
                          checked
                            ? "border-emerald-500 bg-emerald-500 text-black"
                            : "border-border"
                        }`}
                        aria-hidden
                      >
                        {checked ? "✓" : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="notes"
              className="text-xs uppercase tracking-wider text-muted-foreground"
            >
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setSavedAt(null);
              }}
              placeholder="Anything else worth remembering about today…"
              rows={4}
              className="w-full resize-none rounded-2xl border border-border bg-card px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            {savedAt && !saving && (
              <span className="text-xs text-muted-foreground">
                Saved {savedAt.toLocaleTimeString("en-US")}
              </span>
            )}
            {error && <span className="text-xs text-rose-400">{error}</span>}
          </div>
        </>
      )}
    </div>
  );
}
