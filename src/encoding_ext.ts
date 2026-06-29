/**
 * Encoding extensions — query strings, cookies, JWT.
 *
 * Pure Node.js implementations (no native dependencies).
 */

import { createHmac } from "node:crypto";

// ── Query String ────────────────────────────────────────────────────

/**
 * Parse a URL query string into a key-value record.
 *
 * @param query Query string (with or without leading `?`)
 */
export function parseQueryString(query: string): Record<string, string> {
  const cleaned = query.startsWith("?") ? query.slice(1) : query;
  if (!cleaned) return {};

  const result: Record<string, string> = {};
  for (const pair of cleaned.split("&")) {
    const eqIdx = pair.indexOf("=");
    if (eqIdx === -1) {
      result[decodeURIComponent(pair)] = "";
    } else {
      const key = decodeURIComponent(pair.slice(0, eqIdx));
      const value = decodeURIComponent(pair.slice(eqIdx + 1));
      result[key] = value;
    }
  }
  return result;
}

/**
 * Build a URL query string from a key-value record.
 *
 * @returns Query string without leading `?`
 */
export function buildQueryString(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

// ── Cookies ─────────────────────────────────────────────────────────

/**
 * Parse a Cookie header string into key-value pairs.
 */
export function parseCookies(cookie: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookie) return result;

  for (const pair of cookie.split(";")) {
    const trimmed = pair.trim();
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const name = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    // Remove surrounding quotes if present
    result[name] = value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value;
  }
  return result;
}

/**
 * Build a Set-Cookie header value.
 */
export function buildSetCookie(
  name: string,
  value: string,
  options?: {
    maxAge?: number;
    path?: string;
    domain?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: string;
  },
): string {
  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

  if (options) {
    if (options.maxAge !== undefined) cookie += `; Max-Age=${options.maxAge}`;
    if (options.path) cookie += `; Path=${options.path}`;
    if (options.domain) cookie += `; Domain=${options.domain}`;
    if (options.secure) cookie += "; Secure";
    if (options.httpOnly) cookie += "; HttpOnly";
    if (options.sameSite) cookie += `; SameSite=${options.sameSite}`;
  }

  return cookie;
}

// ── JWT (HS256) ─────────────────────────────────────────────────────

/**
 * Encode a JWT token using HS256 (HMAC-SHA256).
 *
 * @param payload JSON-serializable object for the JWT claims
 * @param secret Signing secret
 * @returns Encoded JWT string (header.payload.signature)
 */
export function jwtEncode(payload: object, secret: string): string {
  const header = { alg: "HS256", typ: "JWT" };

  const headerB64 = b64urlEncode(JSON.stringify(header));
  const payloadB64 = b64urlEncode(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const signature = createHmac("sha256", secret)
    .update(signingInput)
    .digest();
  const signatureB64 = bufferToBase64Url(signature);

  return `${signingInput}.${signatureB64}`;
}

/**
 * Decode and verify a JWT token using HS256 (HMAC-SHA256).
 *
 * @param token JWT string
 * @param secret Signing secret
 * @returns Decoded payload object, or null if verification fails
 */
export function jwtDecode(token: string, secret: string): object | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;

  // Verify signature
  const signingInput = `${headerB64}.${payloadB64}`;
  const expectedSig = createHmac("sha256", secret)
    .update(signingInput)
    .digest();
  const expectedSigB64 = bufferToBase64Url(expectedSig);

  // Constant-time comparison
  if (!timingSafeCompare(signatureB64, expectedSigB64)) return null;

  try {
    const headerJson = b64urlDecode(headerB64);
    const header = JSON.parse(headerJson);
    if (header.alg !== "HS256") return null;

    const payloadJson = b64urlDecode(payloadB64);
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
}

// ── Internal helpers ────────────────────────────────────────────────

function b64urlEncode(s: string): string {
  return Buffer.from(s)
    .toString("base64url");
}

function b64urlDecode(s: string): string {
  return Buffer.from(s, "base64url").toString("utf-8");
}

function bufferToBase64Url(buf: Buffer): string {
  return buf.toString("base64url");
}

function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
