// ABOUTME: HTTP client for lab portal backend communication.
// ABOUTME: Handles portal-specific auth tokens.

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function portalApi<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("portal_token")
      : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const resp = await fetch(`${API_BASE}/portal${path}`, {
    ...options,
    headers,
  });

  if (!resp.ok) {
    const error = await resp.json().catch(() => ({ detail: "Request failed" }));
    throw new ApiError(resp.status, error.detail || "Request failed");
  }

  return resp.json();
}

export async function portalLogin(
  codePrefix: string,
  password: string,
): Promise<{ partner_name: string }> {
  const data = await portalApi<{
    access_token: string;
    partner_id: string;
    partner_name: string;
  }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ code_prefix: codePrefix, password }),
  });
  localStorage.setItem("portal_token", data.access_token);
  localStorage.setItem("partner_name", data.partner_name);
  return { partner_name: data.partner_name };
}
