import {
  cardTransactions,
  type CardTransaction,
  type CardTransactionCategory,
} from "@/lib/corporate-card-data";
import { partners, vehicles } from "@/lib/erp-data";

export type CorporateCardApiClient = {
  fetchTransactions: (from: string, to: string) => Promise<CardTransaction[]>;
};

export async function mockFetchCardTransactions(from: string, to: string): Promise<CardTransaction[]> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  return cardTransactions.filter((item) => item.approvedAt.slice(0, 10) >= from && item.approvedAt.slice(0, 10) <= to);
}

export const mockCorporateCardApi: CorporateCardApiClient = {
  fetchTransactions: mockFetchCardTransactions,
};

export function classifyCardCategory(merchantName: string, memo = ""): CardTransactionCategory {
  const text = `${merchantName} ${memo}`;

  if (/(주유|충전|LPG|SK|GS|S-OIL|현대오일)/i.test(text)) return "주유비";
  if (/(공업사|정비|모터스|수리|타이어|오일|범퍼)/i.test(text)) return "정비비";
  if (/(세차|광택|디테일링)/i.test(text)) return "세차비";
  if (/(주차|파킹)/i.test(text)) return "주차비";
  if (/(하이패스|통행료|톨게이트)/i.test(text)) return "하이패스";
  if (/(과태료|범칙금)/i.test(text)) return "과태료";
  if (/(와이퍼|소모품|부품)/i.test(text)) return "소모품";
  if (/(식당|카페|편의점|밥)/i.test(text)) return "식대";

  return "기타";
}

export function autoLinkCardTransaction(input: Omit<CardTransaction, "id" | "category" | "createdAt" | "updatedAt">): CardTransaction {
  const text = `${input.merchantName} ${input.memo}`;
  const linkedVehicle = vehicles.find((vehicle) => text.includes(vehicle.plateNumber));
  const linkedPartner = partners.find((partner) => text.includes(partner.name) || input.merchantName.includes(partner.name));

  return {
    ...input,
    id: crypto.randomUUID(),
    category: classifyCardCategory(input.merchantName, input.memo),
    linkedVehicleId: input.linkedVehicleId ?? linkedVehicle?.id,
    linkedPlateNumber: input.linkedPlateNumber ?? linkedVehicle?.plateNumber,
    linkedPartnerId: input.linkedPartnerId ?? linkedPartner?.id,
    createdAt: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString().slice(0, 10),
  };
}

export function parseCardCsv(text: string, cardId: string): CardTransaction[] {
  const rows = text
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);

  return rows.slice(1).map((row) => {
    const [approvedAt, merchantName, totalAmountText, memo = "", approvalNumber = "CSV"] = row.split(",").map((cell) => cell.trim());
    const totalAmount = Number(totalAmountText.replace(/[^0-9.-]/g, "")) || 0;
    const amount = Math.round(totalAmount / 1.1);
    const vatAmount = totalAmount - amount;

    return autoLinkCardTransaction({
      cardId,
      approvedAt,
      merchantName,
      amount,
      vatAmount,
      totalAmount,
      paymentType: "일시불",
      approvalNumber,
      memo,
      source: "CSV업로드",
    });
  });
}

export function getCorporateCardEnvGuide() {
  return {
    CARD_API_PROVIDER: process.env.CARD_API_PROVIDER,
    CARD_API_BASE_URL: process.env.CARD_API_BASE_URL,
    CARD_API_CLIENT_ID: process.env.CARD_API_CLIENT_ID,
    CARD_API_SECRET: process.env.CARD_API_SECRET ? "configured" : undefined,
  };
}

export function mockExtractReceiptTransaction(fileName = "125하0000_성수제일공업사_영수증.jpg") {
  const totalAmount = fileName.includes("주유") ? 90000 : 320000;
  const merchantName = fileName.includes("주유") ? "SK성수주유소" : "성수 제일공업사";
  const memo = fileName.includes("125하0000") ? "125하0000 영수증 OCR 추출" : "영수증 OCR 추출";
  const amount = Math.round(totalAmount / 1.1);

  return autoLinkCardTransaction({
    cardId: "cc-1",
    approvedAt: "2026-06-13T12:30:00+09:00",
    merchantName,
    amount,
    vatAmount: totalAmount - amount,
    totalAmount,
    paymentType: "일시불",
    approvalNumber: "OCR-MOCK",
    memo,
    receiptImageUrl: fileName,
    source: "수동등록",
  });
}
