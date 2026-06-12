import type { DriverAssignment, ExtraBillingItem, Payment, Receivable } from "@/lib/finance-ops-data";

export function calculateRentalDays(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.floor(diff / 86400000) + 1);
}

export function calculateBilling(input: {
  rentStartDate: string;
  rentEndDate: string;
  dailyRate: number;
  extraItems: ExtraBillingItem[];
  discountAmount: number;
}) {
  const rentalDays = calculateRentalDays(input.rentStartDate, input.rentEndDate);
  const rentalAmount = rentalDays * input.dailyRate;
  const extraItemsTotal = input.extraItems.reduce((sum, item) => sum + item.amount, 0);
  const supplyAmount = Math.max(0, rentalAmount + extraItemsTotal - input.discountAmount);
  const vatAmount = Math.round(supplyAmount * 0.1);
  const totalAmount = supplyAmount + vatAmount;

  return { rentalDays, rentalAmount, extraItemsTotal, supplyAmount, vatAmount, totalAmount };
}

export function applyPayment(receivable: Receivable, payment: Payment): Receivable {
  const paidAmount = receivable.paidAmount + payment.paymentAmount;
  const remainingAmount = Math.max(0, receivable.totalBillingAmount - paidAmount);
  const status = remainingAmount === 0 ? "입금완료" : paidAmount > 0 ? "부분입금" : "입금대기";

  return {
    ...receivable,
    paidAmount,
    remainingAmount,
    status,
    lastPaymentDate: payment.paymentDate,
    updatedAt: new Date().toISOString().slice(0, 10),
  };
}

export function normalizeReceivableStatus(receivable: Receivable, today = new Date("2026-06-13")): Receivable {
  const due = new Date(`${receivable.dueDate}T00:00:00`);
  const overdueDays = Math.max(0, Math.floor((today.getTime() - due.getTime()) / 86400000));

  if (receivable.remainingAmount > 0 && overdueDays > 30) {
    return { ...receivable, status: "장기미수", overdueDays };
  }

  return { ...receivable, overdueDays };
}

export function buildDriverAssignmentReport(item: DriverAssignment, reportType: "assigned" | "start" | "arrival" | "handover" | "returnComplete") {
  if (reportType === "assigned") {
    return `[운전자 배정]\n${item.driverName} 기사\n${item.plateNumber}\n${item.assignmentType} 배정 완료\n출발지: ${item.pickupLocation}\n도착지: ${item.destination}`;
  }

  if (reportType === "start") {
    return `[출발보고]\n${item.driverName} 기사\n${item.plateNumber}\n${item.pickupLocation}에서 출발했습니다.`;
  }

  if (reportType === "arrival") {
    return `[도착보고]\n${item.driverName} 기사\n${item.plateNumber}\n${item.destination} 도착했습니다.`;
  }

  if (reportType === "handover") {
    return `[고객전달완료]\n${item.plateNumber}\n고객 전달 완료\n전달자: ${item.driverName}`;
  }

  return `[회차완료]\n${item.driverName} 기사\n${item.plateNumber}\n${item.destination} 회차 완료했습니다.`;
}

export function mockAnalyzePaymentFileName(fileName: string) {
  const amountMatch = fileName.match(/(\d{4,})/g);
  const plateMatch = fileName.match(/\d{2,3}[가-힣]\d{4}/);
  const buyerMatch = fileName.match(/청구서_([^_]+)_/);

  if (fileName.includes("입금") || fileName.includes("계좌이체")) {
    return {
      suggestedType: "입금 등록",
      plateNumber: plateMatch?.[0] ?? "125하0000",
      paymentAmount: amountMatch ? Number(amountMatch.at(-1)) : 500000,
      recommendedActions: ["입금 등록", "미수금에 연결", "거래처 입금내역으로 등록", "보류"],
    };
  }

  if (fileName.includes("청구서") || fileName.includes("세금계산서") || fileName.includes("거래명세서")) {
    return {
      suggestedType: "청구서 연결",
      buyerName: buyerMatch?.[1] ?? "삼성화재",
      plateNumber: plateMatch?.[0] ?? "125하0000",
      recommendedActions: ["청구서에 연결", "미수금에 연결", "보류"],
    };
  }

  return { suggestedType: "보류", recommendedActions: ["보류"] };
}
