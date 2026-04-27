// ABOUTME: Pulse auth pages layout — centered card on dark background, no nav.
// ABOUTME: Wraps the pulse-branded sign-in flow.

export default function PulseAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      {children}
    </div>
  );
}
