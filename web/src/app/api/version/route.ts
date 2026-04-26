// ABOUTME: Reports the running build identity — commit SHA, branch, deployment ID.
// ABOUTME: Vercel sets VERCEL_GIT_* and VERCEL_DEPLOYMENT_ID at runtime; falls back to "dev" locally.

import packageJson from "../../../../package.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA ?? "dev";
  return Response.json({
    service: "web",
    version: packageJson.version,
    commit: sha.slice(0, 12),
    commit_full: sha,
    branch: process.env.VERCEL_GIT_COMMIT_REF ?? "local",
    deployment_id: process.env.VERCEL_DEPLOYMENT_ID ?? "local",
    environment: process.env.VERCEL_ENV ?? "development",
  });
}
