export type CorporateCardStatus = "사용중" | "사용중지";
export type CardTransactionCategory = "주유비" | "정비비" | "세차비" | "주차비" | "하이패스" | "과태료" | "소모품" | "식대" | "기타";
export type CardTransactionSource = "API" | "CSV업로드" | "수동등록";

export type CorporateCard = {
  id: string;
  cardName: string;
  cardNumberMasked: string;
  cardCompany: string;
  ownerName: string;
  status: CorporateCardStatus;
  memo: string;
  createdAt: string;
  updatedAt: string;
};

export type CardTransaction = {
  id: string;
  cardId: string;
  approvedAt: string;
  merchantName: string;
  amount: number;
  vatAmount: number;
  totalAmount: number;
  category: CardTransactionCategory;
  paymentType: string;
  approvalNumber: string;
  memo: string;
  linkedVehicleId?: string;
  linkedPlateNumber?: string;
  linkedPartnerId?: string;
  linkedMaintenanceHistoryId?: string;
  linkedAccidentHistoryId?: string;
  receiptImageUrl?: string;
  source: CardTransactionSource;
  createdAt: string;
  updatedAt: string;
};

export const cardCategories: CardTransactionCategory[] = ["주유비", "정비비", "세차비", "주차비", "하이패스", "과태료", "소모품", "식대", "기타"];

export const corporateCards: CorporateCard[] = [
  {
    id: "cc-1",
    cardName: "운영 1카드",
    cardNumberMasked: "1234-****-****-5678",
    cardCompany: "신한카드",
    ownerName: "관리팀",
    status: "사용중",
    memo: "주유, 정비, 하이패스 공용",
    createdAt: "2026-06-01",
    updatedAt: "2026-06-13",
  },
  {
    id: "cc-2",
    cardName: "현장 2카드",
    cardNumberMasked: "9876-****-****-4321",
    cardCompany: "국민카드",
    ownerName: "현장팀",
    status: "사용중",
    memo: "세차, 주차, 소모품",
    createdAt: "2026-06-02",
    updatedAt: "2026-06-13",
  },
];

export const cardTransactions: CardTransaction[] = [
  {
    id: "ct-1",
    cardId: "cc-1",
    approvedAt: "2026-06-13T09:20:00+09:00",
    merchantName: "성수 제일공업사",
    amount: 290909,
    vatAmount: 29091,
    totalAmount: 320000,
    category: "정비비",
    paymentType: "일시불",
    approvalNumber: "A1234567",
    memo: "125하0000 앞범퍼 수리",
    linkedVehicleId: "v-1",
    linkedPlateNumber: "125하0000",
    linkedPartnerId: "p-1",
    linkedMaintenanceHistoryId: "mh-1",
    receiptImageUrl: "https://drive.google.com/file/d/mock-receipt-001/view",
    source: "CSV업로드",
    createdAt: "2026-06-13",
    updatedAt: "2026-06-13",
  },
  {
    id: "ct-2",
    cardId: "cc-1",
    approvedAt: "2026-06-12T18:10:00+09:00",
    merchantName: "SK성수주유소",
    amount: 81818,
    vatAmount: 8182,
    totalAmount: 90000,
    category: "주유비",
    paymentType: "일시불",
    approvalNumber: "A1234568",
    memo: "125하0000 LPG 충전",
    linkedVehicleId: "v-1",
    linkedPlateNumber: "125하0000",
    source: "API",
    createdAt: "2026-06-12",
    updatedAt: "2026-06-12",
  },
  {
    id: "ct-3",
    cardId: "cc-2",
    approvedAt: "2026-06-11T13:05:00+09:00",
    merchantName: "본사 세차장",
    amount: 27273,
    vatAmount: 2727,
    totalAmount: 30000,
    category: "세차비",
    paymentType: "일시불",
    approvalNumber: "B9876543",
    memo: "185허2345 실내 세차",
    linkedVehicleId: "v-2",
    linkedPlateNumber: "185허2345",
    source: "수동등록",
    createdAt: "2026-06-11",
    updatedAt: "2026-06-11",
  },
];

export function getThisMonthCardExpense() {
  return cardTransactions.reduce((total, item) => total + item.totalAmount, 0);
}

export function getCardExpenseByPlate(plateNumber?: string) {
  return cardTransactions
    .filter((item) => !plateNumber || item.linkedPlateNumber === plateNumber)
    .reduce((total, item) => total + item.totalAmount, 0);
}
