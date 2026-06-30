import { readCookie } from "./auth/jwt";

export const deviceCookieName = "rentflow_device_id";
export const trustedDeviceCookieName = "trusted_device";
const trustedDeviceTtlSeconds = 60 * 60 * 24 * 180;

export async function createTrustedDeviceToken(deviceId: string, userAgent: string, secret: string) {
  const exp = Math.floor(Date.now() / 1000) + trustedDeviceTtlSeconds;
  const payload = { deviceId, uaHash: await sha256(userAgent), exp };
  return signPayload(payload, secret);
}

export async function verifyTrustedDeviceToken(token: string | undefined, userAgent: string, secret: string) {
  const payload = await verifySignedPayload(token, secret) as { deviceId?: string; uaHash?: string; exp?: number } | null;
  if (!payload?.deviceId || !payload.uaHash || !payload.exp) return null;
  if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
  if (payload.uaHash !== await sha256(userAgent)) return null;
  return payload.deviceId;
}

export function readDeviceId(cookieHeader: string | null | undefined) {
  return readCookie(cookieHeader, deviceCookieName);
}

export function readTrustedDeviceToken(cookieHeader: string | null | undefined) {
  return readCookie(cookieHeader, trustedDeviceCookieName);
}

export function buildDeviceCookie(deviceId: string, secure: boolean) {
  return `${deviceCookieName}=${deviceId}; Path=/; Max-Age=${trustedDeviceTtlSeconds}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function buildTrustedDeviceCookie(token: string, secure: boolean) {
  return `${trustedDeviceCookieName}=${token}; Path=/; Max-Age=${trustedDeviceTtlSeconds}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function expireTrustedDeviceCookie() {
  return `${trustedDeviceCookieName}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}

async function signPayload(payload: Record<string, unknown>, secret: string) {
  const body = encodeBase64Url(JSON.stringify(payload));
  const sig = await hmac(body, secret);
  return `${body}.${sig}`;
}

async function verifySignedPayload(token: string | undefined, secret: string) {
  if (!token || !secret) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  if (await hmac(body, secret) !== sig) return null;
  try {
    return JSON.parse(new TextDecoder().decode(decodeBase64Url(body))) as unknown;
  } catch {
    return null;
  }
}

async function hmac(value: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return encodeBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}

async function sha256(value: string) {
  return encodeBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
}

function encodeBase64Url(value: string | Uint8Array) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodeBase64Url(value: string) {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=").replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(padded);
  return new Uint8Array([...binary].map((char) => char.charCodeAt(0)));
}
