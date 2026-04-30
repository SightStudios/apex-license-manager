// Mock signed-protocol helpers using Web Crypto.
// In production the secret must live server-side.
const SIGNING_SECRET = "apex_mock_signing_secret_v1";

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function nonce(): string {
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function signRequest(method: string, path: string, body: string) {
  const ts = Date.now().toString();
  const n = nonce();
  const payload = `${method.toUpperCase()}:${path}:${ts}:${n}:${body}`;
  const sig = await hmacSha256Hex(SIGNING_SECRET, payload);
  return {
    "X-Apex-Timestamp": ts,
    "X-Apex-Nonce": n,
    "X-Apex-Signature": sig,
  };
}

export async function verifySignature(
  method: string,
  path: string,
  body: string,
  headers: Record<string, string>,
): Promise<boolean> {
  const ts = headers["X-Apex-Timestamp"];
  const n = headers["X-Apex-Nonce"];
  const sig = headers["X-Apex-Signature"];
  if (!ts || !n || !sig) return false;
  const expected = await hmacSha256Hex(SIGNING_SECRET, `${method.toUpperCase()}:${path}:${ts}:${n}:${body}`);
  return expected === sig;
}

export { SIGNING_SECRET };
