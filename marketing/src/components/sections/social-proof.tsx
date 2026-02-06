// ABOUTME: Testimonial cards section.
// ABOUTME: Renders quote, name, and role for each testimonial.

import { Card, CardContent } from "@/components/ui/card";
import type { SocialProofConfig } from "@/types/landing";

export function SocialProof({ config }: { config: SocialProofConfig }) {
  return (
    <section className="bg-muted/50 px-6 py-16 md:py-24">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-12 text-center text-3xl font-bold">
          {config.headline}
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {config.testimonials.map((t) => (
            <Card key={t.name}>
              <CardContent className="flex flex-col gap-4 p-6">
                <p className="text-muted-foreground italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div>
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-sm text-muted-foreground">{t.role}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
