export type ReturnAutoProcessStatus =
  | "분석중"
  | "배차건매칭완료"
  | "자동회차완료"
  | "확인필요"
  | "실패";

export type ReturnAutoProcess = {
  id: string;
  smartInboxItemId: string;
  plateNumber: string;
  extractedMileage: number;
  extractedFuelLevel: number;
  matchedDispatchId?: string;
  createdReturnId?: string;
  confidenceScore: number;
  status: ReturnAutoProcessStatus;
  memo: string;
  createdAt: string;
};

export const returnAutoProcesses: ReturnAutoProcess[] = [
  {
    id: "rap-1",
    smartInboxItemId: "smart-20260613-001",
    plateNumber: "125하4208",
    extractedMileage: 23549,
    extractedFuelLevel: 85,
    matchedDispatchId: "d-1",
    createdReturnId: "auto-return-1",
    confidenceScore: 92,
    status: "자동회차완료",
    memo: "회차계기판 사진 업로드로 자동 회차 처리",
    createdAt: "2026-06-13T09:10:00.000Z",
  },
];

export function buildReturnReport(process: ReturnAutoProcess) {
  return [
    "[회차보고]",
    `${process.plateNumber} 회차 완료`,
    `주행거리: ${process.extractedMileage.toLocaleString()}km`,
    `유량: ${process.extractedFuelLevel}%`,
    "처리방식: 계기판 사진 자동인식",
    `특이사항: ${process.memo}`,
  ].join("\n");
}
