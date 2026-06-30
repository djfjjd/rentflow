export const emailVerificationTtlMs = 1000 * 60 * 10;

export async function ensureEmailVerificationSchema(db: any) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS email_verification_codes (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      device_id TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
  ).run();
}

export function createSixDigitCode() {
  const value = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return value.toString().padStart(6, "0");
}

export function verificationId(email: string, deviceId: string) {
  return `${String(email || "").trim().toLowerCase()}:${String(deviceId || "").trim()}`;
}

export async function sendVerificationEmail(input: { apiKey?: string; from?: string; to: string; code: string }) {
  if (!input.apiKey || !input.from) throw new Error("email provider is not configured");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: input.from,
      to: input.to,
      subject: "RentFlow 이메일 인증",
      text: `RentFlow 인증코드입니다.\n\n인증코드\n\n${input.code}\n\n10분 이내 입력해주세요.`,
    }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Resend failed with ${response.status}`);
  }
}
