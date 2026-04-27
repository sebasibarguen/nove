// ABOUTME: Profile completion page shown after registration.
// ABOUTME: Collects date of birth, sex, weight, height, and health goals.

"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth";
import { api, ApiError } from "@/lib/api";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const HEALTH_GOALS = [
  "Boost energy",
  "Lose weight",
  "Build muscle",
  "Improve sleep",
  "Reduce stress",
  "Optimize performance",
  "Track biomarkers",
  "Improve nutrition",
];

function parseMMDDYYYY(input: string): string | null {
  const match = input.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, mm, dd, yyyy] = match;
  const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

const LB_TO_KG = 0.453592;

export default function OnboardingPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [sex, setSex] = useState("");
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");
  const [heightCm, setHeightCm] = useState("");
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  function toggleGoal(goal: string) {
    setSelectedGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal],
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (dateOfBirth && !parseMMDDYYYY(dateOfBirth)) {
      setError("Invalid date format. Use MM/DD/YYYY");
      return;
    }

    let weightKg: number | undefined;
    if (weight) {
      const w = parseFloat(weight);
      weightKg = weightUnit === "lb" ? w * LB_TO_KG : w;
    }

    setSubmitting(true);
    try {
      await api("/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          date_of_birth: dateOfBirth ? parseMMDDYYYY(dateOfBirth) : undefined,
          sex: sex || undefined,
          weight_kg: weightKg,
          height_cm: heightCm ? parseFloat(heightCm) : undefined,
          health_goals: selectedGoals.length > 0 ? selectedGoals : undefined,
          onboarding_completed: true,
        }),
      });
      await refreshUser();
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Complete your profile</CardTitle>
          <CardDescription>
            This information helps us personalize your health experience
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="space-y-2">
              <Label htmlFor="dob">Date of birth</Label>
              <Input
                id="dob"
                type="text"
                placeholder="MM/DD/YYYY"
                maxLength={10}
                value={dateOfBirth}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  let formatted = raw;
                  if (raw.length > 4) {
                    formatted = `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4, 8)}`;
                  } else if (raw.length > 2) {
                    formatted = `${raw.slice(0, 2)}/${raw.slice(2)}`;
                  }
                  setDateOfBirth(formatted);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Sex</Label>
              <Select value={sex} onValueChange={setSex}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Weight</Label>
                <div className="flex gap-2">
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="flex-1"
                  />
                  <Select
                    value={weightUnit}
                    onValueChange={(v) => setWeightUnit(v as "kg" | "lb")}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="lb">lb</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  step="0.1"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Health goals</Label>
              <div className="flex flex-wrap gap-2">
                {HEALTH_GOALS.map((goal) => (
                  <Button
                    key={goal}
                    type="button"
                    variant={
                      selectedGoals.includes(goal) ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => toggleGoal(goal)}
                  >
                    {goal}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Saving…" : "Continue"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
