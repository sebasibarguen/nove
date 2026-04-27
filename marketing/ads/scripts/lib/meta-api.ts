// ABOUTME: Thin wrapper around the Meta Marketing Graph API for the deploy pipeline.
// ABOUTME: Handles auth, request shape, geo/interest lookups, and image upload.

import fs from "fs";
import path from "path";

export const META_API_VERSION = "v23.0";
export const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

export const REQUIRED_ENV = [
  "META_ACCESS_TOKEN",
  "META_AD_ACCOUNT_ID",
  "META_PAGE_ID",
];

export function checkEnv(): void {
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error("Missing environment variables:");
    for (const k of missing) console.error(`  - ${k}`);
    console.error("\nSee ads/README.md for setup instructions.");
    process.exit(1);
  }
}

export function adAccountId(): string {
  const id = process.env.META_AD_ACCOUNT_ID!;
  return id.startsWith("act_") ? id : `act_${id}`;
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.META_ACCESS_TOKEN!}`,
    ...extra,
  };
}

export async function metaPost<T = unknown>(
  endpoint: string,
  body: Record<string, unknown>
): Promise<T> {
  const url = `${META_GRAPH_URL}/${endpoint}`;
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Meta API ${endpoint} → ${res.status}\n${text}`);
  }
  return res.json() as Promise<T>;
}

export async function metaGet<T = unknown>(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<T> {
  const url = new URL(`${META_GRAPH_URL}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Meta API GET ${endpoint} → ${res.status}\n${text}`);
  }
  return res.json() as Promise<T>;
}

export interface GeoResult {
  key: string;
  name: string;
  type: string;
  country_code?: string;
  country_name?: string;
  region?: string;
  region_id?: number;
}

export async function searchGeo(
  query: string,
  filter: { region?: string; countryCode?: string } = {}
): Promise<GeoResult> {
  const result = await metaGet<{ data: GeoResult[] }>("search", {
    type: "adgeolocation",
    location_types: '["city"]',
    q: query,
    limit: "20",
  });

  let candidates = result.data;
  if (filter.countryCode) {
    candidates = candidates.filter((c) => c.country_code === filter.countryCode);
  }
  if (filter.region) {
    const wanted = filter.region.toLowerCase();
    candidates = candidates.filter((c) => (c.region ?? "").toLowerCase() === wanted);
  }
  if (candidates.length === 0) {
    throw new Error(
      `No geo match for "${query}"${filter.region ? ` (region: ${filter.region})` : ""}`
    );
  }
  return candidates[0];
}

export interface InterestResult {
  id: string;
  name: string;
  audience_size_lower_bound?: number;
  audience_size_upper_bound?: number;
  path?: string[];
}

export async function searchInterest(query: string): Promise<InterestResult> {
  const result = await metaGet<{ data: InterestResult[] }>("search", {
    type: "adinterest",
    q: query,
    limit: "10",
  });
  if (result.data.length === 0) {
    throw new Error(`No interest match for "${query}"`);
  }
  // Prefer exact-name match, otherwise take the highest audience-size result
  const exact = result.data.find((r) => r.name.toLowerCase() === query.toLowerCase());
  if (exact) return exact;
  return result.data.sort(
    (a, b) => (b.audience_size_lower_bound ?? 0) - (a.audience_size_lower_bound ?? 0)
  )[0];
}

export interface ImageUploadResult {
  hash: string;
  url: string;
}

export async function uploadImage(filePath: string): Promise<ImageUploadResult> {
  const absPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`Image file not found: ${absPath}`);
  }
  const filename = path.basename(absPath);
  const buffer = fs.readFileSync(absPath);

  const form = new FormData();
  form.append("filename", filename);
  form.append(
    "source",
    new Blob([new Uint8Array(buffer)], { type: "application/octet-stream" }),
    filename
  );

  const url = `${META_GRAPH_URL}/${adAccountId()}/adimages`;
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Meta image upload failed for ${filename} → ${res.status}\n${text}`);
  }
  const data = (await res.json()) as { images: Record<string, ImageUploadResult> };
  const entry = data.images[filename] ?? Object.values(data.images)[0];
  if (!entry?.hash) {
    throw new Error(`Image upload returned no hash for ${filename}`);
  }
  return entry;
}
