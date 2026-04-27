// ABOUTME: Training hub page showing active plan, weekly workouts, and quick-log.
// ABOUTME: Entry point for training features; links to plan detail and coach chat.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  plan_id: string;
  week_number: number;
  day_of_week: number;
  name: string;
  workout_type: string;
  details: Record<string, unknown>;
  order_index: number;
  calendar_event_id: string | null;
  scheduled_at: string | null;
  created_at: string;
}

interface TrainingPlan {
  id: string;
  name: string;
  description: string | null;
  plan_type: string;
  duration_weeks: number;
  status: string;
  workouts: Workout[];
}

interface Progress {
  total_workouts: number;
  completed_workouts: number;
  completion_rate: number;
  avg_rpe: number | null;
  workouts_this_week: number;
}

const DAY_NAMES = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function TrainingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [noPlan, setNoPlan] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    if (user) {
      api<TrainingPlan[]>("/training/plans?plan_status=active")
        .then((plans) => {
          if (plans.length > 0) {
            // Fetch full plan with workouts
            api<TrainingPlan>(`/training/plans/${plans[0].id}`).then(setPlan);
          } else {
            setNoPlan(true);
          }
        })
        .catch(() => setNoPlan(true));

      api<Progress>("/training/progress").then(setProgress);
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Training</h1>
          <p className="text-muted-foreground">Your plan and progress</p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">&larr; Dashboard</Link>
        </Button>
      </div>

      {noPlan && (
        <Card>
          <CardHeader>
            <CardTitle>No active plan</CardTitle>
            <CardDescription>
              Talk to your coach to create a personalized training plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/chat">Go to Coach</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {plan && progress && (
        <div className="space-y-6">
          {/* Active plan card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>
                    {plan.plan_type} &middot; {plan.duration_weeks} weeks
                  </CardDescription>
                </div>
                <Link href={`/training/plans/${plan.id}`}>
                  <Button variant="outline" size="sm">
                    View details
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>
                    {progress.completed_workouts}/{progress.total_workouts}{" "}
                    sessions
                  </span>
                  <span>{progress.completion_rate}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{ width: `${progress.completion_rate}%` }}
                  />
                </div>
                {progress.avg_rpe != null && (
                  <p className="text-xs text-muted-foreground">
                    Average RPE: {progress.avg_rpe}/10 &middot; This week:{" "}
                    {progress.workouts_this_week} sessions
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* This week's workouts */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Plan workouts</h2>
            {plan.workouts.map((w) => (
              <Link
                key={w.id}
                href={`/training/workouts/${w.id}`}
                className="block"
              >
                <Card className="cursor-pointer transition-colors hover:bg-accent/50">
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{w.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Week {w.week_number} &middot;{" "}
                        {DAY_NAMES[w.day_of_week]} &middot;{" "}
                        <span
                          className={
                            w.workout_type === "strength"
                              ? "text-blue-600"
                              : "text-green-600"
                          }
                        >
                          {w.workout_type === "strength" ? "Strength" : "Cardio"}
                        </span>
                      </p>
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
      )}
    </div>
  );
}
