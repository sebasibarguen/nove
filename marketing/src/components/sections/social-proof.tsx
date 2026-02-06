// ABOUTME: Testimonial cards section with prominent quotes.
// ABOUTME: Large quotation marks and clean card layout.

import { Card, CardContent } from "@/components/ui/card";
import type { SocialProofConfig } from "@/types/landing";

export function SocialProof({ config }: { config: SocialProofConfig }) {
  return (
    <section className="bg-muted/50 px-6 py-16 md:py-24">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-12 text-center text-3xl font-bold md:text-4xl">
          {config.headline}
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {config.testimonials.map((t) => (
            <Card key={t.name} className="border-0 bg-background">
              <CardContent className="flex flex-col gap-4 p-6">
                <span className="text-4xl font-serif text-primary/20">&ldquo;</span>
                <p className="text-foreground leading-relaxed -mt-4">
                  {t.quote}
                </p>
                <div className="mt-auto pt-4 border-t">
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
