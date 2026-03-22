// ABOUTME: Generic collapsible card for health pillar sections.
// ABOUTME: Shows summary row with expand/collapse toggle for detail content.

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PillarCardProps {
  icon: string;
  title: string;
  summary: string;
  children: React.ReactNode;
}

export function PillarCard({ icon, title, summary, children }: PillarCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-accent/50"
      onClick={() => setOpen((prev) => !prev)}
    >
      <CardHeader className="py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <span>{icon}</span>
            <span>{title}</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">{summary}</span>
            <span className="text-muted-foreground text-xs">
              {open ? "▾" : "▸"}
            </span>
          </div>
        </div>
      </CardHeader>
      {open && (
        <CardContent className="border-t pt-4" onClick={(e) => e.stopPropagation()}>
          {children}
        </CardContent>
      )}
    </Card>
  );
}
