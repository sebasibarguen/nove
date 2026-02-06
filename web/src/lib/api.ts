// ABOUTME: HTTP client for backend API communication.
// ABOUTME: Handles token storage, auto-refresh, and request/response typing.

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface TokenPair {
  access_token: string;
  refresh_token: string;
}

function getTokens(): TokenPair | null {
  if (typeof window === "undefined") return null;
  const access = localStorage.getItem("access_token");
  const refresh = localStorage.getItem("refresh_token");
  if (!access || !refresh) return null;
  return { access_token: access, refresh_token: refresh };
}

function setTokens(tokens: TokenPair) {
  localStorage.setItem("access_token", tokens.access_token);
  localStorage.setItem("refresh_token", tokens.refresh_token);
}

export function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

async function refreshTokens(): Promise<TokenPair | null> {
  const tokens = getTokens();
  if (!tokens) return null;

  const resp = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: tokens.refresh_token }),
  });

  if (!resp.ok) {
    clearTokens();
    return null;
  }

  const newTokens = await resp.json();
  setTokens(newTokens);
  return newTokens;
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const tokens = getTokens();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (tokens) {
    headers["Authorization"] = `Bearer ${tokens.access_token}`;
  }

  let resp = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (resp.status === 401 && tokens) {
    const newTokens = await refreshTokens();
    if (newTokens) {
      headers["Authorization"] = `Bearer ${newTokens.access_token}`;
      resp = await fetch(`${API_BASE}${path}`, { ...options, headers });
    }
  }

  if (!resp.ok) {
    const error = await resp.json().catch(() => ({ detail: "Request failed" }));
    throw new ApiError(resp.status, error.detail || "Request failed");
  }

  return resp.json();
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export async function login(email: string, password: string): Promise<void> {
  const tokens = await api<TokenPair>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setTokens(tokens);
}

export async function register(
  email: string,
  password: string,
  fullName: string
): Promise<void> {
  const tokens = await api<TokenPair>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, full_name: fullName }),
  });
  setTokens(tokens);
}

export async function googleAuth(credential: string): Promise<void> {
  const tokens = await api<TokenPair>("/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
  setTokens(tokens);
}
