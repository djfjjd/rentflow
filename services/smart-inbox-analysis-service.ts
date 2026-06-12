export type SuggestedHistoryType =
  | "정비이력"
  | "사고이력"
  | "배차"
  | "회차"
  | "예약"
  | "계약서"
  | "청구서"
  | "세금계산서"
  | "미분류";

export type SmartInboxMockAnalysis = {
  suggestedHistoryType: SuggestedHistoryType;
  detectedAccidentPart?: string;
  detectedMaintenanceType?: string;
  detectedRepairCost?: number;
  detectedAccidentDate?: string;
  confidenceScore: number;
  recommendedActions: string[];
};

const accidentKeywords = ["사고", "범퍼", "기스", "파손", "접촉", "추돌", "도어", "문짝", "유리", "휠", "보험접수"];
const maintenanceKeywords = ["정비", "수리", "견적", "엔진오일", "타이어", "브레이크", "배터리", "교체", "공업사", "영수증"];

export function analyzeSmartInboxFileName(fileName: string): SmartInboxMockAnalysis {
  const normalized = fileName.toLowerCase();
  const isAccident = accidentKeywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
  const isMaintenance = maintenanceKeywords.some((keyword) => normalized.includes(keyword.toLowerCase()));

  if (isAccident) {
    return {
      suggestedHistoryType: "사고이력",
      detectedAccidentPart: detectAccidentPart(fileName),
      detectedAccidentDate: "2026-06-13",
      confidenceScore: 0.88,
      recommendedActions: ["사고이력으로 기록", "기존 사고이력에 연결", "배차 건과 연결", "정비이력으로 함께 등록", "보류"],
    };
  }

  if (isMaintenance) {
    return {
      suggestedHistoryType: "정비이력",
      detectedMaintenanceType: detectMaintenanceType(fileName),
      detectedRepairCost: normalized.includes("견적") ? 320000 : undefined,
      confidenceScore: 0.84,
      recommendedActions: ["정비이력으로 기록", "기존 정비이력에 연결", "정비예약으로 등록", "보류"],
    };
  }

  return {
    suggestedHistoryType: "배차",
    confidenceScore: 0.72,
    recommendedActions: ["배차로 연결", "회차로 연결", "예약으로 등록", "기존 기록에 연결", "나중에 분류"],
  };
}

function detectAccidentPart(fileName: string) {
  if (fileName.includes("앞범퍼")) return "앞범퍼";
  if (fileName.includes("뒤범퍼")) return "뒤범퍼";
  if (fileName.includes("유리")) return "유리";
  if (fileName.includes("타이어")) return "타이어";
  if (fileName.includes("휠")) return "휠";
  return "기타";
}

function detectMaintenanceType(fileName: string) {
  if (fileName.includes("엔진오일")) return "엔진오일";
  if (fileName.includes("타이어")) return "타이어";
  if (fileName.includes("브레이크")) return "브레이크";
  if (fileName.includes("배터리")) return "배터리";
  if (fileName.includes("견적")) return "사고수리";
  return "기타";
}
