// ABOUTME: Feature card grid with Lucide icons and optional section headline.
// ABOUTME: Icons are resolved dynamically from config string names.

import * as icons from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { FeatureConfig, FeaturesSection } from "@/types/landing";

function getIcon(name: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Icon = (icons as any)[name] as React.ComponentType<{ className?: string }> | undefined;
  return Icon ?? icons.Star;
}

export function Features({ config }: { config: FeatureConfig[] | FeaturesSection }) {
  const items = Array.isArray(config) ? config : config.items;
  const headline = Array.isArray(config) ? undefined : config.headline;

  return (
    <section className="px-6 py-16 md:py-24">
      <div className="mx-auto max-w-5xl">
        {headline && (
          <h2 className="mb-12 text-center text-3xl font-bold md:text-4xl">
            {headline}
          </h2>
        )}
        <div className="grid gap-6 md:grid-cols-2">
          {items.map((feature) => {
            const Icon = getIcon(feature.icon);
            return (
              <Card key={feature.title} className="border-0 bg-muted/30">
                <CardContent className="flex flex-col gap-3 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
