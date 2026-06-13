import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Bell,
  Building2,
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
  UserCog,
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
  { href: "/admin/dispatches", label: "배차관리", icon: ClipboardList },
  { href: "/admin/returns", label: "회차관리", icon: BadgeCheck },
  { href: "/admin/partners", label: "거래처관리", icon: Handshake },
  { href: "/admin/factories", label: "공장관리", icon: Building2 },
  { href: "/admin/insurers", label: "보험사관리", icon: ShieldCheck },
  { href: "/admin/maintenance", label: "정비관리", icon: Wrench },
  { href: "/admin/maintenance-history", label: "정비이력", icon: Wrench },
  { href: "/admin/accident-history", label: "사고이력", icon: AlertTriangle },
  { href: "/admin/notifications", label: "알림센터", icon: Bell },
  { href: "/admin/revenue", label: "차량별 매출분석", icon: BarChart3 },
  { href: "/admin/corporate-cards", label: "법인카드 관리", icon: CreditCard },
  { href: "/admin/driver-assignments", label: "운전자 배정", icon: UserCog },
  { href: "/admin/receivables", label: "미수금 관리", icon: ReceiptText },
  { href: "/admin/payments", label: "입금 관리", icon: ReceiptText },
  { href: "/admin/tax-invoices", label: "세금계산서관리", icon: ShieldCheck },
  { href: "/admin/documents", label: "서류센터", icon: FileArchive },
  { href: "/admin/staff", label: "직원관리", icon: UserCog },
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

export const partners: Partner[] = [
  {
    id: "p-1",
    type: "공업사",
    name: "성수 제일공업사",
    businessNumber: "123-45-67890",
    managerName: "박정비",
    phone: "02-111-2222",
    mobile: "010-2222-3333",
    fax: "02-111-2223",
    email: "seongsu-body@example.com",
    address: "서울 성동구 성수이로 10",
    detailAddress: "1층 접수실",
    region: "서울 성동",
    memo: "현대해상 사고대차 접수 많음. 야간 입고 가능.",
    tags: ["자주사용", "야간입고", "보험협력"],
    status: "사용중",
    favorite: true,
    createdAt: "2026-06-01",
    updatedAt: "2026-06-13",
  },
  {
    id: "p-2",
    type: "정비공장",
    name: "강남 모터스",
    businessNumber: "234-56-78901",
    managerName: "최공장",
    phone: "02-333-4444",
    mobile: "010-4444-5555",
    fax: "02-333-4445",
    email: "gangnam-motors@example.com",
    address: "서울 강남구 테헤란로 20",
    detailAddress: "정비동 B1",
    region: "서울 강남",
    memo: "수입차 정비 가능. 픽업 전 전화 필수.",
    tags: ["수입차", "정비"],
    status: "사용중",
    favorite: true,
    createdAt: "2026-06-02",
    updatedAt: "2026-06-12",
  },
  {
    id: "p-3",
    type: "보험사",
    name: "현대해상 강북보상센터",
    businessNumber: "345-67-89012",
    managerName: "홍길동",
    phone: "02-555-6666",
    mobile: "010-6666-7777",
    fax: "02-555-6667",
    email: "claim-center@example.com",
    address: "서울 종로구 종로 1",
    detailAddress: "8층 보상팀",
    region: "서울 종로",
    memo: "접수번호 확인 빠름.",
    tags: ["보험사", "보상센터"],
    status: "사용중",
    favorite: false,
    createdAt: "2026-06-03",
    updatedAt: "2026-06-10",
  },
  {
    id: "p-4",
    type: "탁송거점",
    name: "분당 탁송거점",
    businessNumber: "456-78-90123",
    managerName: "이탁송",
    phone: "031-777-8888",
    mobile: "010-8888-9999",
    fax: "031-777-8889",
    email: "bundang-route@example.com",
    address: "경기 성남시 분당구 판교역로 50",
    detailAddress: "지하 2층 주차장",
    region: "경기 성남",
    memo: "회차 차량 임시 보관 가능.",
    tags: ["탁송", "거점"],
    status: "사용중",
    favorite: false,
    createdAt: "2026-06-05",
    updatedAt: "2026-06-11",
  },
];

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

export const dispatches: Dispatch[] = [
  {
    id: "d-1",
    claimNumber: "123456789",
    customerName: "김민준",
    customerPhone: "010-1234-5678",
    customerCarNumber: "12가3456",
    customerCarModel: "그랜저",
    rentalCarNumber: "125하0000",
    orderedBy: "현대해상 홍길동",
    repairShop: "성수 제일공업사",
    repairShopPartnerId: "p-1",
    repairShopPhone: "02-111-2222",
    repairShopManagerName: "박정비",
    pickupAddress: "서울 성동구 성수이로 10",
    deliveryAddress: "서울 강남구 테헤란로 20",
    fuelLevel: 72,
    notes: "고객 18시 이후 통화 가능",
    status: "출발보고",
  },
];

export const returns: ReturnRecord[] = [
  {
    id: "r-1",
    rentalCarNumber: "185허2345",
    returnAddress: "서울 송파구 잠실동",
    arrivalAddress: "본사 주차장",
    fuelLevel: 45,
    mileage: 39520,
    notes: "트렁크 개인 물품 확인",
    status: "회차등록",
  },
];

export const reservations: Reservation[] = [
  { id: "res-1", date: "2026-06-13", time: "10:00", vehicleNumber: "185허2345", customerName: "이지아", route: "본사 -> 강남", repairShopPartnerId: "p-2", status: "배차예정" },
  { id: "res-2", date: "2026-06-13", time: "14:30", vehicleNumber: "125하0000", customerName: "김민준", route: "성수 -> 강남", repairShopPartnerId: "p-1", status: "진행중" },
  { id: "res-3", date: "2026-06-14", time: "09:00", vehicleNumber: "210호7788", customerName: "박서준", route: "본사 -> 분당", status: "예약" },
];

export const maintenanceItems: Maintenance[] = [
  { id: "m-1", vehicleNumber: "125하0000", title: "타이어 공기압 점검", requestedAt: "2026-06-13", status: "차량운행중이라 대기" },
  { id: "m-2", vehicleNumber: "210호7788", title: "엔진오일 교체", requestedAt: "2026-06-13", status: "정비대기" },
  { id: "m-3", vehicleNumber: "185허2345", title: "실내 탈취", requestedAt: "2026-06-14", status: "정비예약" },
];

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

export const documents: DocumentRecord[] = documentTypes.map((type, index) => ({
  id: `doc-${index + 1}`,
  type,
  title: `${type} 샘플`,
  target: index % 2 === 0 ? "125하0000 / 김민준" : "본사 관리 문서",
  partnerId: index % 2 === 0 ? "p-1" : "p-3",
  updatedAt: "2026-06-13",
  status: index % 3 === 0 ? "작성중" : index % 3 === 1 ? "검토중" : "완료",
}));

export const vehicleHistory = {
  dispatch: ["2026-06-13 김민준 고객 배차", "2026-06-08 박서준 고객 배차"],
  return: ["2026-06-12 본사 회차 완료", "2026-06-04 강남 회차 완료"],
  reservation: ["2026-06-14 오전 예약", "2026-06-18 보험 대차 예약"],
  maintenance: ["2026-06-10 타이어 점검", "2026-05-28 엔진오일 교체"],
};

export const maintenanceHistories: MaintenanceHistory[] = [
  {
    id: "mh-1",
    vehicleId: "v-1",
    plateNumber: "125하0000",
    maintenanceType: "범퍼",
    title: "앞범퍼 도색 및 단차 확인",
    description: "스마트 접수함 사고부위 사진에서 앞범퍼 손상 감지",
    repairShopId: "p-1",
    repairShopName: "성수 제일공업사",
    foundDate: "2026-06-13",
    scheduledDate: "2026-06-14",
    mileage: 48210,
    cost: 320000,
    priority: "높음",
    status: "차량운행중이라 대기",
    photos: ["front-bumper.jpg"],
    videos: [],
    documents: ["estimate.pdf"],
    linkedDispatchId: "d-1",
    linkedSmartInboxItemId: "si-1",
    memo: "회차 완료 시 정비대기 알림 생성",
    createdBy: "staff",
    createdAt: "2026-06-13",
    updatedAt: "2026-06-13",
  },
  {
    id: "mh-2",
    vehicleId: "v-3",
    plateNumber: "210호7788",
    maintenanceType: "엔진오일",
    title: "엔진오일 교체",
    description: "영수증 OCR에서 엔진오일 교체 항목 감지",
    repairShopId: "p-2",
    repairShopName: "강남 모터스",
    foundDate: "2026-06-12",
    completedDate: "2026-06-13",
    mileage: 61880,
    cost: 110000,
    priority: "보통",
    status: "정비완료",
    photos: [],
    videos: [],
    documents: ["oil-receipt.jpg"],
    memo: "다음 교체 66,000km",
    createdBy: "admin",
    createdAt: "2026-06-12",
    updatedAt: "2026-06-13",
  },
];

export const accidentHistories: AccidentHistory[] = [
  {
    id: "ah-1",
    vehicleId: "v-1",
    plateNumber: "125하0000",
    insuranceNumber: "123456789",
    accidentDate: "2026-06-13",
    accidentLocation: "서울 성동구 성수이로",
    accidentType: "접촉사고",
    accidentPart: "앞범퍼",
    description: "고객 차량과 접촉 후 앞범퍼 스크래치 발생",
    customerName: "김민준",
    customerCarNumber: "12가3456",
    customerCarModel: "그랜저",
    insuranceCompany: "현대해상",
    repairShopId: "p-1",
    repairShopName: "성수 제일공업사",
    repairCost: 320000,
    claimAmount: 420000,
    photos: ["accident-front.jpg"],
    videos: [],
    documents: ["claim-message.png"],
    status: "보험접수",
    linkedDispatchId: "d-1",
    linkedSmartInboxItemId: "si-1",
    memo: "수리 필요 시 정비이력 생성 가능",
    createdBy: "staff",
    createdAt: "2026-06-13",
    updatedAt: "2026-06-13",
  },
];

export const notifications: NotificationItem[] = [
  {
    id: "n-1",
    userId: "staff-1",
    title: "예약 하루 전 알림",
    message: "2026-06-14 09:00 210호7788 배차예약이 있습니다.",
    type: "예약알림",
    relatedEntityType: "reservation",
    relatedEntityId: "res-3",
    scheduledAt: "2026-06-13T09:00:00+09:00",
    status: "예정",
    createdAt: "2026-06-13",
  },
  {
    id: "n-2",
    userId: "staff-1",
    title: "정비대기 알림",
    message: "125하0000 회차 완료 후 앞범퍼 정비 확인이 필요합니다.",
    type: "정비알림",
    relatedEntityType: "maintenance_history",
    relatedEntityId: "mh-1",
    scheduledAt: "2026-06-13T18:00:00+09:00",
    status: "예정",
    createdAt: "2026-06-13",
  },
];

export const vehicleRevenues: VehicleRevenue[] = [
  {
    id: "vr-1",
    vehicleId: "v-1",
    plateNumber: "125하0000",
    period: "2026-06",
    rentalRevenue: 1650000,
    claimRevenue: 420000,
    extraRevenue: 80000,
    totalRevenue: 2150000,
    maintenanceCost: 320000,
    fuelCost: 180000,
    tollCost: 42000,
    parkingCost: 25000,
    penaltyCost: 0,
    insuranceCost: 210000,
    taxCost: 90000,
    otherCost: 30000,
    totalCost: 897000,
    netProfit: 1253000,
    profitRate: 58.3,
    dispatchCount: 9,
    rentalDays: 18,
    createdAt: "2026-06-13",
    updatedAt: "2026-06-13",
  },
  {
    id: "vr-2",
    vehicleId: "v-2",
    plateNumber: "185허2345",
    period: "2026-06",
    rentalRevenue: 980000,
    claimRevenue: 0,
    extraRevenue: 50000,
    totalRevenue: 1030000,
    maintenanceCost: 65000,
    fuelCost: 125000,
    tollCost: 18000,
    parkingCost: 12000,
    penaltyCost: 0,
    insuranceCost: 190000,
    taxCost: 85000,
    otherCost: 20000,
    totalCost: 515000,
    netProfit: 515000,
    profitRate: 50,
    dispatchCount: 5,
    rentalDays: 11,
    createdAt: "2026-06-13",
    updatedAt: "2026-06-13",
  },
];

export const partnerHistory = {
  dispatch: ["2026-06-13 125하0000 배차 입고", "2026-06-09 185허2345 사고대차 접수"],
  return: ["2026-06-12 회차 차량 보관", "2026-06-04 고객 차량 출고 확인"],
  billing: ["2026-06 청구서 2건 발행", "2026-05 세금계산서 발행 완료"],
};
