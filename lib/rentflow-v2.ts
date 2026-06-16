export type VehicleV2 = {
  id: string;
  plateNumber: string;
  model: string;
  fuelType?: string;
  mileage?: number;
  location?: string;
  status?: string;
  sortOrder?: number;
  memo?: string;
  updatedAt?: string;
};

export type ReservationV2 = {
  id: string;
  date: string;
  time: string;
  endTime?: string;
  vehicleNumber?: string;
  customerName?: string;
  customerCarNumber?: string;
  customerCarModel?: string;
  factoryName?: string;
  orderPerson?: string;
  memo?: string;
  status?: string;
};

export type UploadedFileV2 = {
  id?: number;
  fileName: string;
  r2Url: string;
  r2Key: string;
  driveUrl?: string;
  vehicleNumber?: string;
  insuranceNumber?: string;
  customerName?: string;
  intakeType?: string;
  fileType?: string;
  uploadedAt?: string;
};

export type PartnerAddressV2 = {
  id: string;
  name: string;
  category?: string;
  managerName?: string;
  phone?: string;
  address: string;
  detailAddress?: string;
  naverMapUrl?: string;
  latitude?: number;
  longitude?: number;
  memo?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type DispatchV2 = {
  id: string;
  claimNumber?: string;
  customerName: string;
  customerPhone?: string;
  customerCarNumber?: string;
  customerCarModel?: string;
  rentalCarNumber?: string;
  orderedBy?: string;
  repairShop?: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  fuelDisplay?: string;
  status?: string;
  createdAt?: string;
};

export const vehicleStatuses = ["보험", "자차", "셀프", "대기중", "정비중", "사고중", "회차완료", "배차중"];

export const fileTypes = ["면허증", "사고부위", "계기판", "외관", "계약서", "기타"];

export function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function todayKorea() {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

export function formatDateDot(date: string) {
  return date.replaceAll("-", ".");
}

export function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export async function fetchJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(url);
    if (!response.ok) return fallback;
    const data = await response.json();
    return data as T;
  } catch {
    return fallback;
  }
}

export async function sendJson(url: string, body: unknown, method = "POST") {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}
