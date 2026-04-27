// ABOUTME: Host-based subpath rewrites for multi-brand subdomains.
// ABOUTME: pulse.nove.health/* is served internally from app/pulse/* so Pulse shares this Next.js app.

import { NextRequest, NextResponse } from "next/server";

const PULSE_PREFIX = "/pulse";

// Paths that stay top-level on every host (shared across brands).
// `/auth/google/callback` must live at the top level on every host so Google's single
// redirect URI resolves. `/garmin/callback` is the same story for Garmin.
const UNSCOPED_PREFIXES = ["/auth", "/garmin/callback"];

function isPulseHost(host: string): boolean {
  // Matches pulse.nove.health in prod and pulse.localhost:<port> in dev.
  return host.startsWith("pulse.");
}

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const url = request.nextUrl.clone();

  if (isPulseHost(host)) {
    if (UNSCOPED_PREFIXES.some((p) => url.pathname.startsWith(p))) {
      return NextResponse.next();
    }
    if (!url.pathname.startsWith(PULSE_PREFIX)) {
      url.pathname = url.pathname === "/" ? PULSE_PREFIX : `${PULSE_PREFIX}${url.pathname}`;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // Non-pulse host: keep /pulse accessible in dev, but block it in production to avoid leaking
  // Pulse pages under the main brand's URL.
  if (url.pathname.startsWith(PULSE_PREFIX) && process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|favicon|api/|.*\\..*).*)"],
};
