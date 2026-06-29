import { emailsFromEnv } from "./auth/access";
import { authCookieName, normalizeEmail, readCookie, verifyAuthToken, type AuthSession } from "./auth/jwt";

export const settings2faCookieName = "settings_2fa";
export const settings2faChallengeCookieName = "settings_2fa_challenge";

const codeTtlSeconds = 10 * 60;
const verifiedTtlSeconds = 60 * 60;

type SettingsEnv = Record<string, unknown> & {
  ADMIN_EMAIL?: string;
  TEAM_LEAD_EMAILS?: string;
  JWT_SECRET?: string;
};

export async function requireSettingsBaseSession(request: Request, env: SettingsEnv) {
  const token = readCookie(request.headers.get("Cookie"), authCookieName);
  const session = await verifyAuthToken(token, String(env.JWT_SECRET || ""));
  if (!session) return { response: Response.json({ error: "인증이 필요합니다." }, { status: 401 }) };
  if (!isSettingsEmailAllowed(session, env)) return { response: Response.json({ error: "권한이 없습니다." }, { status: 403 }) };
  return { session };
}

export function isSettingsEmailAllowed(session: AuthSession, env: SettingsEnv) {
  if (session.role !== "super_admin") return false;
  return emailsFromEnv(env, ["ADMIN_EMAIL", "TEAM_LEAD_EMAILS"]).includes(normalizeEmail(session.email));
}

export async function createSettingsChallenge(email: string, secret: string) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const exp = Math.floor(Date.now() / 1000) + codeTtlSeconds;
  const payload = { email: normalizeEmail(email), codeHash: await sha256(`${code}.${secret}`), exp };
  return { code, cookie: await signPayload(payload, secret) };
}

export async function verifySettingsChallenge(token: string | undefined, code: string, email: string, secret: string) {
  const payload = await verifySignedPayload(token, secret) as { email?: string; codeHash?: string; exp?: number } | null;
  if (!payload?.email || !payload.codeHash || !payload.exp) return false;
  if (payload.exp <= Math.floor(Date.now() / 1000)) return false;
  if (payload.email !== normalizeEmail(email)) return false;
  return payload.codeHash === await sha256(`${code}.${secret}`);
}

export async function createSettings2faCookie(email: string, secret: string) {
  const exp = Math.floor(Date.now() / 1000) + verifiedTtlSeconds;
  return signPayload({ email: normalizeEmail(email), exp }, secret);
}

export async function verifySettings2faCookie(token: string | undefined, email: string, secret: string) {
  const payload = await verifySignedPayload(token, secret) as { email?: string; exp?: number } | null;
  if (!payload?.email || !payload.exp) return false;
  if (payload.exp <= Math.floor(Date.now() / 1000)) return false;
  return payload.email === normalizeEmail(email);
}

export function buildSettingsCookie(name: string, value: string, secure: boolean, maxAgeSeconds: number) {
  return `${name}=${value}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function expireSettingsCookie(name: string) {
  return `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}

export function isDevCodeVisible(request: Request, hasEmailProvider: boolean) {
  const host = new URL(request.url).hostname;
  return !hasEmailProvider && (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local"));
}

async function signPayload(payload: Record<string, unknown>, secret: string) {
  const body = encodeBase64Url(JSON.stringify(payload));
  const sig = await hmac(body, secret);
  return `${body}.${sig}`;
}

async function verifySignedPayload(token: string | undefined, secret: string) {
  if (!token) return null;
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

export const settings2faMaxAgeSeconds = verifiedTtlSeconds;
export const settingsChallengeMaxAgeSeconds = codeTtlSeconds;
