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

export const driverAssignments: DriverAssignment[] = [];

export const receivables: Receivable[] = [];

export const payments: Payment[] = [];

export const billingCalculators: BillingCalculator[] = [];

export function getReceivableSummary() {
  const totalRemaining = receivables.reduce((sum, item) => sum + item.remainingAmount, 0);
  const waiting = receivables.filter((item) => item.status === "입금대기").reduce((sum, item) => sum + item.remainingAmount, 0);
  const partial = receivables.filter((item) => item.status === "부분입금" || item.status === "장기미수").reduce((sum, item) => sum + item.remainingAmount, 0);
  const overdue = receivables.filter((item) => item.status === "장기미수").reduce((sum, item) => sum + item.remainingAmount, 0);
  const thisMonthPaid = payments.filter((item) => item.paymentDate.startsWith("2026-06")).reduce((sum, item) => sum + item.paymentAmount, 0);

  return { totalRemaining, waiting, partial, overdue, thisMonthPaid };
}
