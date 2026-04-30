// Mock FastAPI client. Every request is signed with HMAC-SHA256.
// Set VITE_API_BASE_URL to point to a real FastAPI server; otherwise the
// mock handler below is used.
import { signRequest, verifySignature } from "./crypto";
import { fileStore, isLicenseActive, licenseStore } from "./storage";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "mock://apex";
const USE_MOCK = API_BASE_URL.startsWith("mock://");

export interface ApiResponse<T> {
  status: number;
  ok: boolean;
  data: T | null;
  error?: string;
  signedHeaders: Record<string, string>;
}

function getSessionToken(): string | null {
  try {
    const raw = localStorage.getItem("apex.session");
    if (!raw) return null;
    return JSON.parse(raw).token ?? null;
  } catch {
    return null;
  }
}

async function mockHandle(method: string, path: string, body: string): Promise<{ status: number; data: unknown; error?: string }> {
  // /check-key
  if (method === "POST" && path === "/check-key") {
    const parsed = body ? JSON.parse(body) : {};
    const lic = licenseStore.find(parsed.key ?? "");
    if (!lic) return { status: 404, data: null, error: "key not found" };
    return {
      status: 200,
      data: {
        valid: isLicenseActive(lic),
        key: lic.key,
        duration: lic.duration,
        expires_at: lic.expiresAt,
        revoked: lic.revoked,
      },
    };
  }
  // /search-key/:key
  if (method === "GET" && path.startsWith("/search-key/")) {
    const key = decodeURIComponent(path.slice("/search-key/".length));
    const lic = licenseStore.find(key);
    if (!lic) return { status: 404, data: null, error: "key not found" };
    return { status: 200, data: lic };
  }
  // /version/latest
  if (method === "GET" && path === "/version/latest") {
    const f = fileStore.latest();
    return { status: 200, data: { version: f?.version ?? null, uploaded_at: f?.uploadedAt ?? null } };
  }
  // /download/latest
  if (method === "GET" && path === "/download/latest") {
    const f = fileStore.latest();
    if (!f) return { status: 404, data: null, error: "no files uploaded" };
    return { status: 200, data: { name: f.name, version: f.version, size: f.size, dataUrl: f.dataUrl } };
  }
  return { status: 404, data: null, error: "unknown route" };
}

async function request<T>(method: string, path: string, body?: unknown): Promise<ApiResponse<T>> {
  const bodyStr = body !== undefined ? JSON.stringify(body) : "";
  const signed = await signRequest(method, path, bodyStr);
  const token = getSessionToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...signed,
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  if (USE_MOCK) {
    // Verify signature on the "server" side too.
    const valid = await verifySignature(method, path, bodyStr, signed);
    if (!valid) {
      return { status: 401, ok: false, data: null, error: "invalid signature", signedHeaders: signed };
    }
    const res = await mockHandle(method, path, bodyStr);
    return {
      status: res.status,
      ok: res.status >= 200 && res.status < 300,
      data: (res.data as T) ?? null,
      error: res.error,
      signedHeaders: signed,
    };
  }

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: method === "GET" ? undefined : bodyStr,
    });
    const json = (await res.json().catch(() => null)) as T | null;
    return { status: res.status, ok: res.ok, data: json, signedHeaders: signed };
  } catch (e) {
    return { status: 0, ok: false, data: null, error: (e as Error).message, signedHeaders: signed };
  }
}

export const apexApi = {
  baseUrl: API_BASE_URL,
  isMock: USE_MOCK,
  checkKey: (key: string) => request<{ valid: boolean; expires_at: number | null; duration: string; revoked: boolean }>("POST", "/check-key", { key }),
  searchKey: (key: string) => request<unknown>("GET", `/search-key/${encodeURIComponent(key)}`),
  versionLatest: () => request<{ version: string | null; uploaded_at: number | null }>("GET", "/version/latest"),
  downloadLatest: () => request<{ name: string; version: string; size: number; dataUrl: string }>("GET", "/download/latest"),
};
