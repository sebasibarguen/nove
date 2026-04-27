// ABOUTME: Workout detail page with exercise list and feedback form.
// ABOUTME: Shows full workout details and lets users log RPE, mood, and notes.

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

interface Exercise {
  name: string;
  sets?: number;
  reps?: string;
  rest_seconds?: number;
  notes?: string;
}

interface WorkoutLog {
  id: string;
  completed_at: string;
  perceived_effort: number;
  completed_fully: boolean;
  mood: string | null;
  notes: string | null;
}

interface WorkoutDetail {
  id: string;
  plan_id: string;
  week_number: number;
  day_of_week: number;
  name: string;
  workout_type: string;
  details: {
    exercises?: Exercise[];
    warmup?: string;
    cooldown?: string;
    activity?: string;
    duration_minutes?: number;
    target_zone?: string;
    target_hr?: string;
    notes?: string;
  };
  scheduled_at: string | null;
  logs: WorkoutLog[];
}

const MOOD_OPTIONS = [
  { value: "great", label: "Great", emoji: "💪" },
  { value: "good", label: "Good", emoji: "👍" },
  { value: "okay", label: "Okay", emoji: "😐" },
  { value: "bad", label: "Bad", emoji: "😩" },
];

export default function WorkoutDetailPage() {
  const params = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [rpe, setRpe] = useState(5);
  const [completedFully, setCompletedFully] = useState(true);
  const [mood, setMood] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    if (user && params.id) {
      api<WorkoutDetail>(`/training/workouts/${params.id}`).then(setWorkout);
    }
  }, [user, loading, router, params.id]);

  async function handleLogSubmit() {
    if (!workout) return;
    setSubmitting(true);
    try {
      await api(`/training/workouts/${workout.id}/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          perceived_effort: rpe,
          completed_fully: completedFully,
          mood,
          notes: notes || null,
        }),
      });
      // Refresh workout to show new log
      const updated = await api<WorkoutDetail>(
        `/training/workouts/${workout.id}`,
      );
      setWorkout(updated);
      setShowForm(false);
    } catch {
      // Handle error silently for now
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !workout) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const hasLog = workout.logs.length > 0;
  const lastLog = hasLog ? workout.logs[workout.logs.length - 1] : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href={`/training/plans/${workout.plan_id}`}>
          &larr; Plan
        </Link>
      </Button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{workout.name}</h1>
        <p className="text-muted-foreground">
          Week {workout.week_number} &middot;{" "}
          <span
            className={
              workout.workout_type === "strength"
                ? "text-blue-600"
                : "text-green-600"
            }
          >
            {workout.workout_type === "strength" ? "Strength" : "Cardio"}
          </span>
        </p>
      </div>

      <div className="space-y-4">
        {/* Warmup */}
        {workout.details.warmup && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Warm-up</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{workout.details.warmup}</p>
            </CardContent>
          </Card>
        )}

        {/* Strength exercises */}
        {workout.details.exercises && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Exercises</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {workout.details.exercises.map((ex, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between border-b border-border pb-2 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{ex.name}</p>
                      {ex.notes && (
                        <p className="text-xs text-muted-foreground">
                          {ex.notes}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {ex.sets && ex.reps && (
                        <p>
                          {ex.sets} x {ex.reps}
                        </p>
                      )}
                      {ex.rest_seconds && (
                        <p className="text-xs">
                          Rest: {ex.rest_seconds}s
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cardio details */}
        {workout.details.activity && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Cardio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-sm">
                {workout.details.activity} &middot;{" "}
                {workout.details.duration_minutes} min
              </p>
              {workout.details.target_zone && (
                <p className="text-xs text-muted-foreground">
                  Zone: {workout.details.target_zone}
                </p>
              )}
              {workout.details.target_hr && (
                <p className="text-xs text-muted-foreground">
                  Target HR: {workout.details.target_hr}
                </p>
              )}
              {workout.details.notes && (
                <p className="text-xs text-muted-foreground">
                  {workout.details.notes}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Cooldown */}
        {workout.details.cooldown && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Cool-down</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{workout.details.cooldown}</p>
            </CardContent>
          </Card>
        )}

        {/* Existing log */}
        {lastLog && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Logged feedback</CardTitle>
              <CardDescription>
                {new Date(lastLog.completed_at).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-sm">
                RPE: {lastLog.perceived_effort}/10 &middot;{" "}
                {lastLog.completed_fully ? "Completed" : "Partial"}
              </p>
              {lastLog.mood && (
                <p className="text-sm text-muted-foreground">
                  Mood:{" "}
                  {MOOD_OPTIONS.find((m) => m.value === lastLog.mood)?.label ||
                    lastLog.mood}
                </p>
              )}
              {lastLog.notes && (
                <p className="text-sm text-muted-foreground">
                  {lastLog.notes}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Feedback form */}
        {!hasLog && !showForm && (
          <Button onClick={() => setShowForm(true)} className="w-full">
            Log feedback
          </Button>
        )}

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Log feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* RPE slider */}
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Perceived effort (RPE): {rpe}/10
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={rpe}
                  onChange={(e) => setRpe(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Easy</span>
                  <span>Max</span>
                </div>
              </div>

              {/* Completed toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="completed"
                  checked={completedFully}
                  onChange={(e) => setCompletedFully(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="completed" className="text-sm">
                  Completed the full workout
                </label>
              </div>

              {/* Mood selector */}
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Mood
                </label>
                <div className="flex gap-2">
                  {MOOD_OPTIONS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() =>
                        setMood(mood === m.value ? null : m.value)
                      }
                      className={`rounded-lg border px-3 py-1 text-sm transition-colors ${
                        mood === m.value
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-accent/50"
                      }`}
                    >
                      {m.emoji} {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  rows={2}
                  placeholder="How you felt, what was hardest…"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleLogSubmit}
                  disabled={submitting}
                  className="flex-1"
                >
                  {submitting ? "Saving…" : "Save"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
