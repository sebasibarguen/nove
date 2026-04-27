// ABOUTME: Pulse vertical root layout — dark theme wrapper applied to every /pulse/* route.
// ABOUTME: Brand nav lives in (main)/layout.tsx; auth pages use (auth)/layout.tsx.

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pulse by Nove",
  description: "Recovery, strain, and sleep — powered by your Garmin.",
};

export default function PulseRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      {children}
    </div>
  );
}
