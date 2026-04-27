// ABOUTME: Pulse authenticated shell — nav and main content wrapper.
// ABOUTME: Wraps every /pulse/* route except auth pages.

import Link from "next/link";

const navItems = [
  { href: "/recovery", label: "Recovery" },
  { href: "/strain", label: "Strain" },
  { href: "/sleep", label: "Sleep" },
  { href: "/journal", label: "Journal" },
];

export default function PulseMainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="border-b border-border">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Pulse
          </Link>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </>
  );
}
