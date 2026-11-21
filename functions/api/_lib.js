// Shared helpers for LMS Phase 1 API handlers.
// Plain JavaScript, no dependencies. Session signing uses Web Crypto HMAC.
// Passwords/secrets are read ONLY from env vars (LMS_TEACHER_PASSWORD,
// LMS_SESSION_SECRET) — never hardcoded here.

export const SESSION_COOKIE = "lms_session";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

// ---------- JSON responses ----------

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

export function err(status, message) {
  return json({ error: message }, status);
}

// ---------- Constant-time compare ----------

// Compares two strings without leaking length/timing information.
// Returns false on any difference (including different lengths).
export function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const lenA = a.length;
  const lenB = b.length;
  const max = Math.max(lenA, lenB);
  let diff = lenA ^ lenB;
  for (let i = 0; i < max; i++) {
    const ca = i < lenA ? a.charCodeAt(i) : 0;
    const cb = i < lenB ? b.charCodeAt(i) : 0;
    diff |= ca ^ cb;
  }
  return diff === 0;
}

// ---------- base64url helpers (no Buffer dependency) ----------

const _b64chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function base64urlEncode(bytes) {
  let binary = "";
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  let b64 = "";
  // btoa works on binary strings; chunk to avoid stack limits on large input.
  for (let i = 0; i < binary.length; i += 0x8000) {
    b64 += btoa(binary.slice(i, i + 0x8000));
  }
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64urlEncodeString(str) {
  return base64urlEncode(new TextEncoder().encode(str));
}

export function base64urlDecodeToString(b64url) {
  let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

// ---------- Session sign / verify ----------

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

// Returns the session token string: base64url(JSON {exp}) + "." + base64url(HMAC(secret, payloadB64))
export async function signSession(secret) {
  const payload = JSON.stringify({ exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000 });
  const payloadB64 = base64urlEncodeString(payload);
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  return payloadB64 + "." + base64urlEncode(new Uint8Array(sig));
}

// Returns true only if the token is well-formed, the HMAC matches, and exp is in the future.
export async function verifySession(secret, token) {
  if (!secret || typeof token !== "string" || !token) return false;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  const [payloadB64, sigB64] = parts;
  try {
    const key = await hmacKey(secret);
    const expectedSig = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(payloadB64)
    );
    const expectedB64 = base64urlEncode(new Uint8Array(expectedSig));
    if (!constantTimeEqual(expectedB64, sigB64)) return false;
    const payload = JSON.parse(base64urlDecodeToString(payloadB64));
    if (!payload || typeof payload.exp !== "number") return false;
    return payload.exp > Date.now();
  } catch {
    return false;
  }
}

export function getSessionToken(request) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(SESSION_COOKIE + "="));
  if (!match) return null;
  return decodeURIComponent(match.slice(SESSION_COOKIE.length + 1));
}

export async function isAuthenticated(request, env) {
  if (!env || !env.LMS_SESSION_SECRET) return false;
  const token = getSessionToken(request);
  if (!token) return false;
  return verifySession(env.LMS_SESSION_SECRET, token);
}

export function sessionCookieHeader(token) {
  return (
    SESSION_COOKIE +
    "=" +
    encodeURIComponent(token) +
    "; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=" +
    SESSION_MAX_AGE_SECONDS
  );
}

export function clearSessionCookieHeader() {
  return SESSION_COOKIE + "=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0";
}

// ---------- Request helpers ----------

// Parses a JSON body; returns null if the body is absent or invalid JSON.
// Handlers must treat null as a 400.
export async function parseJsonBody(request) {
  try {
    const text = await request.text();
    if (!text || !text.trim()) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// Returns a trimmed string, or null when the value is not a non-empty string.
export function reqString(value) {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t ? t : null;
}

// Returns a trimmed string, or null when absent/blank (for optional fields).
export function optString(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t ? t : null;
}

// Returns a non-negative integer, or null when invalid.
// Accepts JSON numbers and numeric strings.
export function optInt(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}

// Returns true when a body value is present but is not a valid optional integer.
export function isBadOptInt(value) {
  if (value === undefined || value === null || value === "") return false;
  const n = typeof value === "number" ? value : Number(value);
  return !Number.isInteger(n) || n < 0;
}

export function nowIso() {
  return new Date().toISOString();
}

// ---------- D1 helpers ----------

export async function allRows(db, sql, ...params) {
  const res = await db.prepare(sql).bind(...params).all();
  return res.results || [];
}

export async function firstRow(db, sql, ...params) {
  return db.prepare(sql).bind(...params).first();
}
