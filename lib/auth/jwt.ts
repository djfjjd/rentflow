import type { Role } from "./roles";

export const authCookieName = "rentflow_session";
const jwtAlgorithm = "HS256";
const tokenTtlSeconds = 60 * 60 * 24 * 7;

export type AuthSession = {
  email: string;
  role: Role;
  isDeveloper?: boolean;
  iat: number;
  exp: number;
};

function encodeBase64Url(value: string | Uint8Array) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodeBase64Url(value: string) {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=").replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(padded);
  return new Uint8Array([...binary].map((char) => char.charCodeAt(0)));
}

async function importSigningKey(secret: string) {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function createAuthToken(input: { email: string; role: Role; isDeveloper?: boolean }, secret: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = encodeBase64Url(JSON.stringify({ alg: jwtAlgorithm, typ: "JWT" }));
  const payload = encodeBase64Url(JSON.stringify({ email: input.email, role: input.role, isDeveloper: Boolean(input.isDeveloper), iat: now, exp: now + tokenTtlSeconds }));
  const data = `${header}.${payload}`;
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", await importSigningKey(secret), new TextEncoder().encode(data)));
  return `${data}.${encodeBase64Url(signature)}`;
}

export async function verifyAuthToken(token: string | undefined, secret: string): Promise<AuthSession | null> {
  if (!token || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const valid = await crypto.subtle.verify(
    "HMAC",
    await importSigningKey(secret),
    decodeBase64Url(signature),
    new TextEncoder().encode(`${header}.${payload}`),
  );
  if (!valid) return null;

  const decoded = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload))) as AuthSession;
  if (!decoded.email || !decoded.role || !decoded.exp || decoded.exp <= Math.floor(Date.now() / 1000)) return null;
  return decoded;
}

export function readCookie(cookieHeader: string | null | undefined, name: string) {
  if (!cookieHeader) return undefined;
  return cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export function buildSessionCookie(token: string, secure: boolean) {
  return `${authCookieName}=${token}; Path=/; Max-Age=${tokenTtlSeconds}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function buildExpiredSessionCookie() {
  return `${authCookieName}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}
