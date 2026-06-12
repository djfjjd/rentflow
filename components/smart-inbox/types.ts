import type { LucideIcon } from "lucide-react";

export type UploadKind = "media" | "camera" | "kakao" | "document";

export type UploadAction = {
  kind: UploadKind;
  label: string;
  description: string;
  accept: string;
  icon: LucideIcon;
};

export type AnalysisStep = {
  label: string;
  status: "pending" | "active" | "done";
};

export type ExtractedResult = {
  claimNumber: string;
  customerCarNumber: string;
  rentalCarNumber: string;
  photoType: string;
  recommendedTask: string;
};

export type InboxHistoryItem = {
  id: string;
  title: string;
  meta: string;
  status: string;
};
