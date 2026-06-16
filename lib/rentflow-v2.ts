export type VehicleV2 = {
  id: string;
  plateNumber: string;
  model: string;
  color?: string;
  fuelType?: string;
  mileage?: number;
  purchaseDate?: string;
  location?: string;
  status?: string;
  fuelDisplay?: string;
  damageVehicle?: string;
  activeSummary?: string;
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
  reservationText?: string;
  customerCarNumber?: string;
  customerCarModel?: string;
  factoryName?: string;
  orderPerson?: string;
  memo?: string;
  status?: string;
  createdAt?: string;
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
  recordType?: string;
  recordId?: string;
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
  date?: string;
  claimNumber?: string;
  customerName: string;
  customerPhone?: string;
  customerCarNumber?: string;
  customerCarModel?: string;
  rentalCarNumber?: string;
  orderedBy?: string;
  repairShop?: string;
  businessType?: string;
  corporateVehicle?: boolean;
  isCompleted?: boolean;
  pickupAddress?: string;
  deliveryAddress?: string;
  fuelDisplay?: string;
  notes?: string;
  status?: string;
  createdAt?: string;
};

export type ReturnV2 = {
  id: string;
  date?: string;
  rentalCarNumber: string;
  returnAddress?: string;
  arrivalAddress?: string;
  fuelDisplay?: string;
  mileage?: number;
  notes?: string;
  status?: string;
  isCompleted?: boolean;
  createdAt?: string;
};

export type IncidentRecordV2 = {
  id: string;
  plateNumber: string;
  accidentPart?: string;
  maintenanceType?: string;
  title?: string;
  description?: string;
  memo?: string;
  accidentDate?: string;
  foundDate?: string;
  status?: string;
  isCompleted?: boolean;
  createdAt?: string;
};

export type LostItemV2 = {
  id: string;
  vehicleNumber?: string;
  customerName?: string;
  foundDate?: string;
  memo?: string;
  status?: string;
  isCompleted?: boolean;
  createdAt?: string;
};

export const fuelTypes = ["가솔린", "디젤", "LPG"];

export const vehicleStatuses = ["보험", "자차", "셀프", "주차구역"];

export const parkingLocations = ["독도", "울릉도", "천삼", "제주도", "서해", "천삼읍", "청와대", "광화문", "명동", "제주길가", "명동길가", "천삼읍길가", "현대맨션", "구로", "신정"];

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
