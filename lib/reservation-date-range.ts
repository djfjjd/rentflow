export type ReservationDateRange = {
  startDate: string;
  endDate: string;
  durationDays: number;
};

const dateToken = String.raw`(\d{1,2})\s*(?:월|\/)\s*(\d{1,2})\s*일?`;

export function parseReservationDateRange(inputStartDate: string, reservationText: string, currentYear = new Date().getFullYear()): ReservationDateRange {
  const fallbackStart = normalizeDate(inputStartDate) || toDateString(currentYear, 1, 1);
  const source = String(reservationText || "");

  const explicitEnd = new RegExp(`${dateToken}\\s*(?:부터|에서부터)\\s*${dateToken}\\s*까지`);
  const explicitEndMatch = source.match(explicitEnd);
  if (explicitEndMatch) {
    return normalizeRange(
      toDateString(currentYear, Number(explicitEndMatch[1]), Number(explicitEndMatch[2])),
      toDateString(currentYear, Number(explicitEndMatch[3]), Number(explicitEndMatch[4])),
    );
  }

  const sameMonthEnd = new RegExp(`${dateToken}\\s*(?:부터|에서부터)\\s*(\\d{1,2})\\s*일?\\s*까지`);
  const sameMonthEndMatch = source.match(sameMonthEnd);
  if (sameMonthEndMatch) {
    return normalizeRange(
      toDateString(currentYear, Number(sameMonthEndMatch[1]), Number(sameMonthEndMatch[2])),
      toDateString(currentYear, Number(sameMonthEndMatch[1]), Number(sameMonthEndMatch[3])),
    );
  }

  const duration = new RegExp(`${dateToken}\\s*(?:부터|에서부터)\\s*(\\d{1,3})\\s*일\\s*사용`);
  const durationMatch = source.match(duration);
  if (durationMatch) {
    const startDate = toDateString(currentYear, Number(durationMatch[1]), Number(durationMatch[2]));
    const days = Math.max(1, Number(durationMatch[3]) || 1);
    return normalizeRange(startDate, addDays(startDate, days - 1));
  }

  return normalizeRange(fallbackStart, fallbackStart);
}

export function resolveReservationDateRange(input: { startDate?: string; endDate?: string; date?: string; reservationText?: string; memo?: string }) {
  const startDate = input.startDate || input.date || "";
  const explicitEndDate = normalizeDate(input.endDate || "");
  if (explicitEndDate) return normalizeRange(startDate, explicitEndDate);
  return parseReservationDateRange(startDate, input.reservationText || input.memo || "");
}

export function normalizeReservationRange(input: { date?: string; startDate?: string; endDate?: string; durationDays?: number; reservationText?: string; memo?: string }) {
  if (input.startDate && input.endDate && input.durationDays) {
    return normalizeRange(input.startDate, input.endDate);
  }
  return parseReservationDateRange(input.date || input.startDate || "", input.reservationText || input.memo || "");
}

export function formatReservationRangeLabel(range: ReservationDateRange) {
  const start = formatKoreanMonthDay(range.startDate);
  if (range.durationDays <= 1 || range.startDate === range.endDate) return start;
  return `${start} ~ ${formatKoreanMonthDay(range.endDate)}`;
}

export function formatReservationDurationLabel(range: ReservationDateRange) {
  return range.durationDays > 1 ? `${range.durationDays}일 사용` : "";
}

export function eachDateInRange(startDate: string, endDate: string) {
  const dates: string[] = [];
  let current = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  if (!current || !end) return dates;
  while (current <= end) {
    dates.push(current);
    current = addDays(current, 1);
  }
  return dates;
}

export function addDays(date: string, days: number) {
  const parsed = parseDate(date);
  parsed.setDate(parsed.getDate() + days);
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
}

function normalizeRange(startDate: string, endDate: string): ReservationDateRange {
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  if (!start || !end || end < start) return { startDate: start || end || "", endDate: start || end || "", durationDays: 1 };
  return { startDate: start, endDate: end, durationDays: diffDays(start, end) + 1 };
}

function normalizeDate(value: string) {
  const match = String(value || "").match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) return "";
  return toDateString(Number(match[1]), Number(match[2]), Number(match[3]));
}

function toDateString(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function parseDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function diffDays(startDate: string, endDate: string) {
  return Math.round((parseDate(endDate).getTime() - parseDate(startDate).getTime()) / 86400000);
}

function formatKoreanMonthDay(date: string) {
  const [, month, day] = date.split("-").map(Number);
  return `${month}월 ${day}일`;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}
