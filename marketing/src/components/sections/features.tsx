// ABOUTME: 2x2 feature card grid with Lucide icons.
// ABOUTME: Icons are resolved dynamically from config string names.

import * as icons from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { FeatureConfig } from "@/types/landing";

function getIcon(name: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Icon = (icons as any)[name] as React.ComponentType<{ className?: string }> | undefined;
  return Icon ?? icons.Star;
}

export function Features({ config }: { config: FeatureConfig[] }) {
  return (
    <section className="px-6 py-16 md:py-24">
      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
        {config.map((feature) => {
          const Icon = getIcon(feature.icon);
          return (
            <Card key={feature.title}>
              <CardContent className="flex flex-col gap-3 p-6">
                <Icon className="h-8 w-8 text-primary" />
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
