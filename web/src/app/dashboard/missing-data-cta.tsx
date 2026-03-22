// ABOUTME: Call-to-action component shown when data sources are unavailable.
// ABOUTME: Provides actionable link to connect Garmin or upload lab results.

"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface MissingDataCtaProps {
  message: string;
  href: string;
  buttonLabel: string;
}

export function MissingDataCta({ message, href, buttonLabel }: MissingDataCtaProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
        <p className="text-muted-foreground text-sm">{message}</p>
        <Link href={href}>
          <Button variant="outline" size="sm">
            {buttonLabel}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
