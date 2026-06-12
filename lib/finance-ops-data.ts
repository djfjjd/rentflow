export type DriverAssignmentType = "배차" | "회차" | "공장이동" | "탁송" | "정비입고" | "정비출고" | "기타";
export type DriverAssignmentStatus = "배정완료" | "출발전" | "이동중" | "도착완료" | "고객전달완료" | "회차완료" | "취소";
export type ReceivableStatus = "청구완료" | "입금대기" | "부분입금" | "입금완료" | "장기미수" | "취소";
export type PaymentMethod = "계좌이체" | "카드" | "현금" | "보험사입금" | "기타";

export type DriverAssignment = {
  id: string;
  dispatchId?: string;
  returnId?: string;
  vehicleId: string;
  plateNumber: string;
  driverId: string;
  driverName: string;
  assignmentType: DriverAssignmentType;
  pickupLocation: string;
  destination: string;
  assignedAt: string;
  startedAt?: string;
  arrivedAt?: string;
  completedAt?: string;
  status: DriverAssignmentStatus;
  handoverToCustomerName?: string;
  handoverMemo: string;
  photos: string[];
  videos: string[];
  signatureData?: string;
  createdAt: string;
  updatedAt: string;
};

export type Receivable = {
  id: string;
  invoiceId: string;
  claimNumber: string;
  customerName: string;
  buyerName: string;
  insuranceCompany: string;
  insuranceNumber: string;
  plateNumber: string;
  totalBillingAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  lastPaymentDate?: string;
  status: ReceivableStatus;
  overdueDays: number;
  memo: string;
  createdAt: string;
  updatedAt: string;
};

export type Payment = {
  id: string;
  receivableId: string;
  paymentDate: string;
  paymentAmount: number;
  paymentMethod: PaymentMethod;
  depositorName: string;
  memo: string;
  receiptFileUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type ExtraBillingItem = {
  id: string;
  billingCalculatorId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  memo: string;
};

export type BillingCalculator = {
  id: string;
  invoiceId: string;
  rentStartDate: string;
  rentEndDate: string;
  rentalDays: number;
  dailyRate: number;
  rentalAmount: number;
  extraItems: ExtraBillingItem[];
  discountAmount: number;
  supplyAmount: number;
  vatAmount: number;
  totalAmount: number;
  memo: string;
  createdAt: string;
  updatedAt: string;
};

export const drivers = [
  { id: "driver-1", name: "김기사", phone: "010-1000-2000" },
  { id: "driver-2", name: "이탁송", phone: "010-3000-4000" },
  { id: "driver-3", name: "박현장", phone: "010-5000-6000" },
];

export const driverAssignments: DriverAssignment[] = [
  {
    id: "da-1",
    dispatchId: "d-1",
    vehicleId: "v-1",
    plateNumber: "125하0000",
    driverId: "driver-1",
    driverName: "김기사",
    assignmentType: "배차",
    pickupLocation: "성수 제일공업사",
    destination: "서울 강남구 테헤란로 20",
    assignedAt: "2026-06-13T09:00:00+09:00",
    startedAt: "2026-06-13T09:20:00+09:00",
    arrivedAt: "2026-06-13T10:10:00+09:00",
    completedAt: "2026-06-13T10:20:00+09:00",
    status: "고객전달완료",
    handoverToCustomerName: "김민준",
    handoverMemo: "고객 서명 완료",
    photos: ["handover-front.jpg"],
    videos: [],
    signatureData: "mock-signature",
    createdAt: "2026-06-13",
    updatedAt: "2026-06-13",
  },
  {
    id: "da-2",
    returnId: "r-1",
    vehicleId: "v-2",
    plateNumber: "185허2345",
    driverId: "driver-2",
    driverName: "이탁송",
    assignmentType: "회차",
    pickupLocation: "서울 송파구 잠실동",
    destination: "본사 주차장",
    assignedAt: "2026-06-13T15:00:00+09:00",
    status: "출발전",
    handoverMemo: "트렁크 물품 확인 예정",
    photos: [],
    videos: [],
    createdAt: "2026-06-13",
    updatedAt: "2026-06-13",
  },
];

export const receivables: Receivable[] = [
  {
    id: "recv-1",
    invoiceId: "inv-1",
    claimNumber: "123456789",
    customerName: "김민준",
    buyerName: "현대해상",
    insuranceCompany: "현대해상",
    insuranceNumber: "123456789",
    plateNumber: "125하0000",
    totalBillingAmount: 1210000,
    paidAmount: 500000,
    remainingAmount: 710000,
    dueDate: "2026-05-10",
    lastPaymentDate: "2026-06-01",
    status: "장기미수",
    overdueDays: 34,
    memo: "보험사 잔액 확인 필요",
    createdAt: "2026-05-01",
    updatedAt: "2026-06-13",
  },
  {
    id: "recv-2",
    invoiceId: "inv-2",
    claimNumber: "987654321",
    customerName: "이지아",
    buyerName: "삼성화재",
    insuranceCompany: "삼성화재",
    insuranceNumber: "987654321",
    plateNumber: "185허2345",
    totalBillingAmount: 770000,
    paidAmount: 0,
    remainingAmount: 770000,
    dueDate: "2026-06-25",
    status: "입금대기",
    overdueDays: 0,
    memo: "청구서 발송 완료",
    createdAt: "2026-06-10",
    updatedAt: "2026-06-13",
  },
];

export const payments: Payment[] = [
  {
    id: "pay-1",
    receivableId: "recv-1",
    paymentDate: "2026-06-01",
    paymentAmount: 500000,
    paymentMethod: "보험사입금",
    depositorName: "현대해상",
    memo: "부분입금",
    receiptFileUrl: "mock-payment-confirmation.pdf",
    createdAt: "2026-06-01",
    updatedAt: "2026-06-01",
  },
];

export const billingCalculators: BillingCalculator[] = [
  {
    id: "bc-1",
    invoiceId: "inv-1",
    rentStartDate: "2026-06-01",
    rentEndDate: "2026-06-10",
    rentalDays: 10,
    dailyRate: 100000,
    rentalAmount: 1000000,
    extraItems: [
      { id: "ebi-1", billingCalculatorId: "bc-1", itemName: "탁송비", quantity: 1, unitPrice: 50000, amount: 50000, memo: "" },
      { id: "ebi-2", billingCalculatorId: "bc-1", itemName: "하이패스", quantity: 1, unitPrice: 50000, amount: 50000, memo: "" },
    ],
    discountAmount: 0,
    supplyAmount: 1100000,
    vatAmount: 110000,
    totalAmount: 1210000,
    memo: "미수금 자동 생성 대상",
    createdAt: "2026-06-10",
    updatedAt: "2026-06-13",
  },
];

export function getReceivableSummary() {
  const totalRemaining = receivables.reduce((sum, item) => sum + item.remainingAmount, 0);
  const waiting = receivables.filter((item) => item.status === "입금대기").reduce((sum, item) => sum + item.remainingAmount, 0);
  const partial = receivables.filter((item) => item.status === "부분입금" || item.status === "장기미수").reduce((sum, item) => sum + item.remainingAmount, 0);
  const overdue = receivables.filter((item) => item.status === "장기미수").reduce((sum, item) => sum + item.remainingAmount, 0);
  const thisMonthPaid = payments.filter((item) => item.paymentDate.startsWith("2026-06")).reduce((sum, item) => sum + item.paymentAmount, 0);

  return { totalRemaining, waiting, partial, overdue, thisMonthPaid };
}
