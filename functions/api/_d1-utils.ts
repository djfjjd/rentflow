export function safeText(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value);
}

export function safeNullableText(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

export function safeNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function safeBoolInt(value: unknown): number {
  return value === true || value === 1 || value === "1" ? 1 : 0;
}

export function safeJson(value: unknown, fallback: unknown = []) {
  if (value === undefined || value === null) return JSON.stringify(fallback);
  return JSON.stringify(value);
}

export function safeBindValues(values: unknown[]) {
  return values.map((value) => (value === undefined ? null : value));
}
