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

export const cardTransactions: CardTransaction[] = [];

export function getThisMonthCardExpense() {
  return cardTransactions.reduce((total, item) => total + item.totalAmount, 0);
}

export function getCardExpenseByPlate(plateNumber?: string) {
  return cardTransactions
    .filter((item) => !plateNumber || item.linkedPlateNumber === plateNumber)
    .reduce((total, item) => total + item.totalAmount, 0);
}
