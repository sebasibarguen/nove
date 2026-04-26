// ABOUTME: Accordion-style FAQ section using native <details> elements.
// ABOUTME: First item is open by default; chevron indicator rotates on open.

import { ChevronDown } from "lucide-react";
import type { FAQConfig } from "@/types/landing";

export function FAQ({ config }: { config: FAQConfig }) {
  return (
    <section className="px-6 py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-12 text-center text-3xl font-bold md:text-4xl">
          {config.headline}
        </h2>
        <div className="divide-y rounded-xl border">
          {config.items.map((item, i) => (
            <details
              key={item.question}
              open={i === 0}
              className="group px-6 py-5"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-semibold md:text-lg">
                <span>{item.question}</span>
                <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
