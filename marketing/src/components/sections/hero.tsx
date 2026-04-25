// ABOUTME: Hero section with bold headline, subheadline, CTA, optional stats, and optional image.
// ABOUTME: Image, when present, becomes a full-bleed background with dark gradient and white text.

import Image from "next/image";
import { Button } from "@/components/ui/button";
import type { HeroConfig } from "@/types/landing";

export function Hero({ config }: { config: HeroConfig }) {
  const hasImage = !!config.image;

  return (
    <>
      <section
        className={`relative flex flex-col items-center gap-8 px-6 text-center ${
          hasImage
            ? "isolate min-h-[78vh] justify-center overflow-hidden py-32 md:py-44"
            : "pt-20 pb-16 md:pt-32 md:pb-20"
        }`}
      >
        {hasImage && config.image && (
          <>
            <Image
              src={config.image.src}
              alt={config.image.alt}
              fill
              priority
              sizes="100vw"
              className="-z-10 object-cover"
            />
            <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/30 via-black/45 to-black/70" />
          </>
        )}
        <h1
          className={`max-w-4xl text-5xl font-bold tracking-tight md:text-7xl ${
            hasImage ? "text-white drop-shadow-lg" : ""
          }`}
        >
          {config.headline}
        </h1>
        <p
          className={`max-w-2xl text-xl md:text-2xl ${
            hasImage ? "text-white/90 drop-shadow" : "text-muted-foreground"
          }`}
        >
          {config.subheadline}
        </p>
        <Button asChild size="lg" className="h-14 rounded-full px-10 text-lg shadow-xl">
          <a href={config.ctaHref}>{config.ctaText}</a>
        </Button>
        {!hasImage && config.stats && config.stats.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-8 md:gap-16">
            {config.stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center">
                <span className="text-3xl font-bold md:text-4xl">{stat.value}</span>
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        )}
      </section>
      {hasImage && config.stats && config.stats.length > 0 && (
        <div className="border-y bg-muted/30 px-6 py-10">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-12 gap-y-6 md:gap-x-20">
            {config.stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center text-center">
                <span className="text-3xl font-bold md:text-4xl">{stat.value}</span>
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
