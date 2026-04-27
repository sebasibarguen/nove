// ABOUTME: Plan detail page showing week-by-week workout breakdown.
// ABOUTME: Displays all workouts in a plan grouped by week with type badges.

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

interface Workout {
  id: string;
  week_number: number;
  day_of_week: number;
  name: string;
  workout_type: string;
  details: Record<string, unknown>;
  order_index: number;
  calendar_event_id: string | null;
  scheduled_at: string | null;
}

interface Plan {
  id: string;
  name: string;
  description: string | null;
  plan_type: string;
  duration_weeks: number;
  status: string;
  workouts: Workout[];
}

const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function PlanDetailPage() {
  const params = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    if (user && params.id) {
      api<Plan>(`/training/plans/${params.id}`).then(setPlan);
    }
  }, [user, loading, router, params.id]);

  if (loading || !plan) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  // Group workouts by week
  const byWeek: Record<number, Workout[]> = {};
  for (const w of plan.workouts) {
    if (!byWeek[w.week_number]) byWeek[w.week_number] = [];
    byWeek[w.week_number].push(w);
  }
  const weeks = Object.keys(byWeek)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/training">&larr; Training</Link>
        </Button>
        <h1 className="text-2xl font-bold">{plan.name}</h1>
        <p className="text-muted-foreground">
          {plan.plan_type} &middot; {plan.duration_weeks} weeks &middot;{" "}
          {plan.workouts.length} sessions
        </p>
        {plan.description && (
          <p className="mt-2 text-sm">{plan.description}</p>
        )}
      </div>

      <div className="space-y-6">
        {weeks.map((week) => (
          <div key={week}>
            <h2 className="mb-3 text-lg font-semibold">Week {week}</h2>
            <div className="space-y-2">
              {byWeek[week].map((w) => (
                <Link
                  key={w.id}
                  href={`/training/workouts/${w.id}`}
                  className="block"
                >
                  <Card className="cursor-pointer transition-colors hover:bg-accent/50">
                    <CardContent className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            w.workout_type === "strength"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {w.workout_type === "strength"
                            ? "Strength"
                            : "Cardio"}
                        </span>
                        <div>
                          <p className="text-sm font-medium">{w.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {DAY_NAMES[w.day_of_week]}
                          </p>
                        </div>
                      </div>
                      {w.scheduled_at && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(w.scheduled_at).toLocaleDateString()}
                        </span>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
