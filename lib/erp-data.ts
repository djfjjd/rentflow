import {
  BadgeCheck,
  BarChart3,
  CalendarDays,
  Car,
  ClipboardList,
  CreditCard,
  FileArchive,
  FileText,
  Handshake,
  Home,
  Inbox,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  Wrench,
} from "lucide-react";

export type Role = "admin" | "staff" | "driver";

export type VehicleStatus =
  | "대기중"
  | "배차중"
  | "회차중"
  | "고객이용중"
  | "정비필요"
  | "정비예약"
  | "정비중"
  | "사고"
  | "휴차";

export type PartnerType = "정비공장" | "공업사" | "보험사" | "렌터카업체" | "탁송거점" | "거래처" | "기타";
export type PartnerStatus = "사용중" | "사용중지";

export type Partner = {
  id: string;
  type: PartnerType;
  name: string;
  businessNumber: string;
  managerName: string;
  phone: string;
  mobile: string;
  fax: string;
  email: string;
  address: string;
  detailAddress: string;
  region: string;
  memo: string;
  tags: string[];
  status: PartnerStatus;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Vehicle = {
  id: string;
  plateNumber: string;
  model: string;
  fuelType: string;
  fuelLevel: number;
  mileage: number;
  location: string;
  status: VehicleStatus;
  memo: string;
};

export type Dispatch = {
  id: string;
  claimNumber: string;
  customerName: string;
  customerPhone: string;
  customerCarNumber: string;
  customerCarModel: string;
  rentalCarNumber: string;
  orderedBy: string;
  repairShop: string;
  repairShopPartnerId?: string;
  repairShopPhone?: string;
  repairShopManagerName?: string;
  pickupAddress: string;
  deliveryAddress: string;
  fuelLevel: number;
  notes: string;
  status: "배차등록" | "출발보고" | "도착보고" | "완료";
  intakeType?: "insurance" | "selfPay" | "selfService";
  uploadedAt?: string;
};

export type ReturnRecord = {
  id: string;
  rentalCarNumber: string;
  returnAddress: string;
  arrivalAddress: string;
  fuelLevel: number;
  mileage: number;
  notes: string;
  status: "회차등록" | "출발보고" | "도착보고" | "완료";
};

export type Reservation = {
  id: string;
  date: string;
  time: string;
  vehicleNumber: string;
  customerName: string;
  route: string;
  repairShopPartnerId?: string;
  status: "예약" | "배차예정" | "진행중" | "완료";
};

export type Maintenance = {
  id: string;
  vehicleNumber: string;
  title: string;
  requestedAt: string;
  status: "정비대기" | "차량운행중이라 대기" | "정비예약" | "정비중" | "완료";
};

export type DocumentType =
  | "계약서"
  | "청구서"
  | "세금계산서"
  | "재직증명서"
  | "경력증명서"
  | "급여명세서"
  | "차량인수인계서"
  | "사고확인서"
  | "위임장"
  | "정비내역서"
  | "견적서"
  | "거래명세서"
  | "입금확인서"
  | "영수증";

export type DocumentRecord = {
  id: string;
  type: DocumentType;
  title: string;
  target: string;
  partnerId?: string;
  updatedAt: string;
  status: "작성중" | "검토중" | "완료";
};

export type MaintenanceHistory = {
  id: string;
  vehicleId: string;
  plateNumber: string;
  maintenanceType: "엔진오일" | "타이어" | "브레이크" | "판금" | "도색" | "범퍼" | "유리" | "배터리" | "소모품" | "사고수리" | "기타";
  title: string;
  description: string;
  repairShopId?: string;
  repairShopName: string;
  foundDate: string;
  scheduledDate?: string;
  completedDate?: string;
  mileage: number;
  cost: number;
  priority: "낮음" | "보통" | "높음" | "운행불가";
  status: "정비필요" | "차량운행중이라 대기" | "입고예정" | "정비중" | "정비완료" | "보류";
  photos: string[];
  videos: string[];
  documents: string[];
  linkedDispatchId?: string;
  linkedReturnId?: string;
  linkedSmartInboxItemId?: string;
  memo: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type AccidentHistory = {
  id: string;
  vehicleId: string;
  plateNumber: string;
  insuranceNumber: string;
  accidentDate: string;
  accidentLocation: string;
  accidentType: "접촉사고" | "단독사고" | "주차중사고" | "후방추돌" | "측면충돌" | "자차파손" | "고객차사고" | "렌트차사고" | "기타";
  accidentPart: "앞범퍼" | "뒤범퍼" | "좌측도어" | "우측도어" | "좌측문" | "우측문" | "본넷" | "트렁크" | "유리" | "휠" | "타이어" | "하부" | "기타";
  description: string;
  customerName: string;
  customerCarNumber: string;
  customerCarModel: string;
  insuranceCompany: string;
  repairShopId?: string;
  repairShopName: string;
  repairCost: number;
  claimAmount: number;
  photos: string[];
  videos: string[];
  documents: string[];
  status: "접수" | "사진확인" | "보험접수" | "수리대기" | "수리중" | "수리완료" | "청구대기" | "청구완료" | "종결";
  linkedDispatchId?: string;
  linkedReturnId?: string;
  linkedSmartInboxItemId?: string;
  memo: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type NotificationItem = {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "예약알림" | "배차알림" | "회차알림" | "정비알림" | "보험만기알림" | "검사만기알림" | "청구알림" | "입금알림" | "시스템알림";
  relatedEntityType: string;
  relatedEntityId: string;
  scheduledAt: string;
  sentAt?: string;
  readAt?: string;
  status: "예정" | "발송완료" | "읽음" | "실패" | "취소";
  createdAt: string;
};

export type VehicleRevenue = {
  id: string;
  vehicleId: string;
  plateNumber: string;
  period: string;
  rentalRevenue: number;
  claimRevenue: number;
  extraRevenue: number;
  totalRevenue: number;
  maintenanceCost: number;
  fuelCost: number;
  tollCost: number;
  parkingCost: number;
  penaltyCost: number;
  insuranceCost: number;
  taxCost: number;
  otherCost: number;
  totalCost: number;
  netProfit: number;
  profitRate: number;
  dispatchCount: number;
  rentalDays: number;
  createdAt: string;
  updatedAt: string;
};

export const appNavItems = [
  { href: "/app/inbox", label: "스마트 접수함", icon: Inbox },
  { href: "/app/tasks", label: "내 업무", icon: ClipboardList },
  { href: "/app/schedule", label: "오늘 일정", icon: CalendarDays },
  { href: "/app/dispatch", label: "배차보고", icon: Car },
  { href: "/app/return", label: "회차보고", icon: BadgeCheck },
];

export const adminNavItems = [
  { href: "/admin/dashboard", label: "전체 대시보드", icon: Home },
  { href: "/admin/vehicles", label: "차량관리", icon: Car },
  { href: "/admin/contracts", label: "계약서관리", icon: FileText },
  { href: "/admin/billing", label: "청구서관리", icon: ReceiptText },
  { href: "/admin/reservations", label: "예약 캘린더", icon: CalendarDays },
  { href: "/admin/dispatches", label: "배회차관리", icon: ClipboardList },
  { href: "/admin/lost-items", label: "분실물관리", icon: FileArchive },
  { href: "/admin/partners", label: "거래처관리", icon: Handshake },
  { href: "/admin/insurers", label: "보험사관리", icon: ShieldCheck },
  { href: "/admin/maintenance-history", label: "사고, 정비기록", icon: Wrench },
  { href: "/admin/revenue", label: "차량별 매출분석", icon: BarChart3 },
  { href: "/admin/corporate-cards", label: "법인카드 관리", icon: CreditCard },
  { href: "/admin/receivables", label: "미수금 관리", icon: ReceiptText },
  { href: "/admin/payments", label: "입금 관리", icon: ReceiptText },
  { href: "/admin/tax-invoices", label: "세금계산서관리", icon: ShieldCheck },
  { href: "/admin/search", label: "통합검색", icon: Search },
  { href: "/admin/settings", label: "설정", icon: Settings },
];

export const vehicleStatuses: VehicleStatus[] = [
  "대기중",
  "배차중",
  "회차중",
  "고객이용중",
  "정비필요",
  "정비예약",
  "정비중",
  "사고",
  "휴차",
];

export const partnerTypes: PartnerType[] = ["정비공장", "공업사", "보험사", "렌터카업체", "탁송거점", "거래처", "기타"];
export const partnerStatuses: PartnerStatus[] = ["사용중", "사용중지"];

export const partners: Partner[] = [];

export const vehicles: Vehicle[] = [
  { id: "v-1", plateNumber: "179허6525", model: "더뉴G80 3.5T", fuelType: "가솔린", fuelLevel: 85, mileage: 19385, location: "본사 주차장", status: "대기중", memo: "연료: 많음 / 상태: 많음 / 기준거리: 17,543km" },
  { id: "v-2", plateNumber: "101하9522", model: "디올뉴그랜저 3.5", fuelType: "가솔린", fuelLevel: 85, mileage: 53479, location: "본사 주차장", status: "대기중", memo: "연료: 많음 / 상태: 많음 / 기준거리: 51,557km" },
  { id: "v-3", plateNumber: "222호9654", model: "디올뉴그랜저 2.5", fuelType: "가솔린", fuelLevel: 85, mileage: 27118, location: "본사 주차장", status: "대기중", memo: "연료: 많음 / 상태: 많음 / 기준거리: -" },
  { id: "v-4", plateNumber: "222허2431", model: "쏘나타 디엣지 하이브리드", fuelType: "가솔린", fuelLevel: 85, mileage: 64093, location: "본사 주차장", status: "대기중", memo: "연료: 많음 / 상태: 많음 / 기준거리: 58,647km" },
  { id: "v-5", plateNumber: "222하7685", model: "쏘나타 디엣지 2.0", fuelType: "가솔린", fuelLevel: 85, mileage: 32815, location: "본사 주차장", status: "대기중", memo: "연료: 많음 / 상태: 많음 / 기준거리: 0km" },
  { id: "v-6", plateNumber: "222하1373", model: "더뉴아반떼CN7", fuelType: "가솔린", fuelLevel: 55, mileage: 110807, location: "본사 주차장", status: "대기중", memo: "연료: 보통 / 상태: 보통 / 기준거리: 102,267km" },
  { id: "v-7", plateNumber: "231허1295", model: "더뉴아반떼CN7", fuelType: "가솔린", fuelLevel: 85, mileage: 2131, location: "본사 주차장", status: "대기중", memo: "연료: 많음 / 상태: 많음 / 기준거리: 0km" },
  { id: "v-8", plateNumber: "165하6811", model: "더 뉴 레이", fuelType: "가솔린", fuelLevel: 85, mileage: 60073, location: "본사 주차장", status: "대기중", memo: "연료: 많음 / 상태: 많음 / 기준거리: 55,625km" },
  { id: "v-9", plateNumber: "145하2268", model: "올 뉴 모닝(2019)", fuelType: "가솔린", fuelLevel: 85, mileage: 85404, location: "본사 주차장", status: "대기중", memo: "연료: 많음 / 상태: 보통 / 기준거리: 83,741km" },
  { id: "v-10", plateNumber: "148하8257", model: "싼타페TM", fuelType: "디젤", fuelLevel: 85, mileage: 93955, location: "본사 주차장", status: "대기중", memo: "연료: 많음 / 상태: 보통 / 기준거리: 87,994km" },
  { id: "v-11", plateNumber: "162하8358", model: "디 올 뉴 투싼", fuelType: "디젤", fuelLevel: 55, mileage: 83830, location: "본사 주차장", status: "대기중", memo: "연료: 보통 / 상태: 많음 / 기준거리: 82,134km" },
  { id: "v-12", plateNumber: "222허6769", model: "더뉴카니발 하이브리드", fuelType: "가솔린", fuelLevel: 85, mileage: 60153, location: "본사 주차장", status: "대기중", memo: "연료: 많음 / 상태: 적음 / 기준거리: 56,215km" },
  { id: "v-17", plateNumber: "125하4304", model: "더뉴G80 3.5T", fuelType: "가솔린", fuelLevel: 85, mileage: 13350, location: "본사 주차장", status: "대기중", memo: "연료: 많음 / 상태: 많음 / 기준거리: 9,759km" },
  { id: "v-13", plateNumber: "142호1146", model: "디올뉴그랜저 3.5", fuelType: "가솔린", fuelLevel: 55, mileage: 42206, location: "본사 주차장", status: "대기중", memo: "연료: 보통 / 상태: 많음 / 기준거리: 40,778km" },
  { id: "v-14", plateNumber: "125하4208", model: "더뉴K8 하이브리드", fuelType: "가솔린", fuelLevel: 85, mileage: 23549, location: "본사 주차장", status: "대기중", memo: "연료: 많음 / 상태: 많음 / 기준거리: 19,270km" },
  { id: "v-15", plateNumber: "125하4202", model: "더뉴K8 2.5", fuelType: "가솔린", fuelLevel: 85, mileage: 21108, location: "본사 주차장", status: "대기중", memo: "연료: 많음 / 상태: 많음 / 기준거리: 19,570km" },
  { id: "v-16", plateNumber: "125하4274", model: "쏘나타 디엣지", fuelType: "LPG", fuelLevel: 85, mileage: 22555, location: "본사 주차장", status: "대기중", memo: "연료: 많음 / 상태: 많음 / 기준거리: 20,142km" },
  { id: "v-18", plateNumber: "125하4273", model: "쏘나타 디엣지", fuelType: "LPG", fuelLevel: 85, mileage: 22929, location: "본사 주차장", status: "대기중", memo: "연료: 많음 / 상태: 많음 / 기준거리: 20,825km / 정상" },
  { id: "v-19", plateNumber: "125하4340", model: "더뉴아반떼CN7", fuelType: "가솔린", fuelLevel: 85, mileage: 11231, location: "본사 주차장", status: "대기중", memo: "연료: 많음 / 상태: 많음 / 기준거리: 10,103km / 정상" },
  { id: "v-20", plateNumber: "125하4358", model: "더뉴기아레이", fuelType: "가솔린", fuelLevel: 85, mileage: 7816, location: "본사 주차장", status: "대기중", memo: "연료: 많음 / 상태: 많음 / 기준거리: 0km / 정상" },
  { id: "v-21", plateNumber: "125하4344", model: "더뉴GV70 2.5T", fuelType: "가솔린", fuelLevel: 85, mileage: 9008, location: "본사 주차장", status: "대기중", memo: "연료: 많음 / 상태: 많음 / 기준거리: 0km / 정상" },
  { id: "v-22", plateNumber: "125하4272", model: "더뉴쏘렌토MQ4", fuelType: "디젤", fuelLevel: 55, mileage: 18295, location: "본사 주차장", status: "정비필요", memo: "연료: 보통 / 상태: 많음 / 기준거리: 0km / 8,295km 초과" },
  { id: "v-23", plateNumber: "125하4221", model: "더뉴스포티지NQ5", fuelType: "LPG", fuelLevel: 85, mileage: 22928, location: "본사 주차장", status: "대기중", memo: "연료: 많음 / 상태: 많음 / 기준거리: 19,678km / 정상" },
  { id: "v-24", plateNumber: "125하4347", model: "디올뉴코나", fuelType: "가솔린", fuelLevel: 85, mileage: 11620, location: "본사 주차장", status: "대기중", memo: "연료: 많음 / 상태: 많음 / 기준거리: 9,692km / 정상" },
  { id: "v-25", plateNumber: "70하3298", model: "스타리아", fuelType: "디젤", fuelLevel: 85, mileage: 15303, location: "본사 주차장", status: "대기중", memo: "연료: 많음 / 상태: 많음 / 기준거리: 9,475km / 정상" },
  { id: "v-26", plateNumber: "101호2512", model: "K7 3.0 (2019)", fuelType: "LPG", fuelLevel: 55, mileage: 112876, location: "본사 주차장", status: "대기중", memo: "연료: 보통 / 상태: 적음 / 기준거리: 109,542km / 정상" },
  { id: "v-27", plateNumber: "101호2560", model: "K7 3.0 (2019)", fuelType: "LPG", fuelLevel: 55, mileage: 116901, location: "본사 주차장", status: "정비필요", memo: "연료: 보통 / 상태: 많음 / 기준거리: 0km / 106,901km 초과" },
];

export const dispatches: Dispatch[] = [];

export const returns: ReturnRecord[] = [];

export const reservations: Reservation[] = [];

export const maintenanceItems: Maintenance[] = [];

export const documentTypes: DocumentType[] = [
  "계약서",
  "청구서",
  "세금계산서",
  "재직증명서",
  "경력증명서",
  "급여명세서",
  "차량인수인계서",
  "사고확인서",
  "위임장",
  "정비내역서",
  "견적서",
  "거래명세서",
  "입금확인서",
  "영수증",
];

export const documents: DocumentRecord[] = [];

export const vehicleHistory = {
  dispatch: ["2026-06-13 김민준 고객 배차", "2026-06-08 박서준 고객 배차"],
  return: ["2026-06-12 본사 회차 완료", "2026-06-04 강남 회차 완료"],
  reservation: ["2026-06-14 오전 예약", "2026-06-18 보험 대차 예약"],
  maintenance: ["2026-06-10 타이어 점검", "2026-05-28 엔진오일 교체"],
};

export const maintenanceHistories: MaintenanceHistory[] = [];

export const accidentHistories: AccidentHistory[] = [];

export const notifications: NotificationItem[] = [
  {
    id: "n-dispatch-1",
    userId: "staff-1",
    title: "배차 확인 필요",
    message: "AI 접수로 생성된 배차 기록의 고객 정보와 차량번호를 확인하세요.",
    type: "배차알림",
    relatedEntityType: "dispatch",
    relatedEntityId: "dispatch-check",
    scheduledAt: "2026-06-13T09:00:00+09:00",
    status: "예정",
    createdAt: "2026-06-13",
  },
  {
    id: "n-return-1",
    userId: "staff-1",
    title: "회차 확인 필요",
    message: "회차 업로드 후 유량, 주행거리, 분실물 여부를 확인하세요.",
    type: "회차알림",
    relatedEntityType: "return",
    relatedEntityId: "return-check",
    scheduledAt: "2026-06-13T18:00:00+09:00",
    status: "예정",
    createdAt: "2026-06-13",
  },
  {
    id: "n-reservation-1",
    userId: "staff-1",
    title: "예약 확인 필요",
    message: "예약 캘린더의 배차 예정 건을 확인하세요.",
    type: "예약알림",
    relatedEntityType: "reservation",
    relatedEntityId: "reservation-check",
    scheduledAt: "2026-06-13T10:00:00+09:00",
    status: "예정",
    createdAt: "2026-06-13",
  },
];

export const vehicleRevenues: VehicleRevenue[] = [];

export const partnerHistory = {
  dispatch: [],
  return: [],
  billing: [],
};
