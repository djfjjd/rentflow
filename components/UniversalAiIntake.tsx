"use client";

import { CheckCircle2, FileImage, ImagePlus, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type HTMLAttributes } from "react";
import { uploadFilesToDrive, type StoredFileMetadata, type UploadFileMetadata } from "@/services/file-upload-service";
import { type DriveBusinessFolder, type DriveFileKind } from "@/lib/google-drive";
import { useERPState } from "@/lib/erp-state";
import { resolveVehiclePlateNumber } from "@/lib/vehicle-utils";
import type { AccidentHistory, Dispatch, MaintenanceHistory, Reservation, ReturnRecord, Vehicle } from "@/lib/erp-data";

type IntakeType = "insurance" | "selfPay" | "selfService";

type IntakeAnalysis = {
  title: string;
  confidence: number;
  situation: "사고" | "정비" | "배차" | "회차" | "예약" | "일반";
  summary: string;
  fields: Array<{ label: string; value: string }>;
  actions: string[];
};

type AiCategory = "사고" | "정비" | "계약" | "청구" | "입금" | "예약" | "일반메모";

type AutoReturnPreview = {
  plateNumber: string;
  mileage: number;
  fuelLevel: number;
  capturedAt: string;
  dispatchInfo: string;
  confidenceScore: number;
  report: string;
};

type ParkingUpdatePreview = {
  plateNumber: string;
  parkingZone: string;
  memo: string;
};

const intakeTypeOptions: Array<{ value: IntakeType; label: string }> = [
  { value: "insurance", label: "보험건" },
  { value: "selfPay", label: "자차건" },
  { value: "selfService", label: "셀프건" },
];

const aiCategories: AiCategory[] = ["사고", "정비", "계약", "청구", "입금", "예약", "일반메모"];
const parkingZones = ["독도", "울릉도", "아파트", "현대맨션", "구로", "신정", "명동", "천삼", "천삼읍", "제주도", "서해", "광화문", "청와대", "제주길가", "명동길가", "천삼읍길가"];

export function UniversalAiIntake() {
  const {
    vehicles,
    dispatches,
    updateVehicle,
    addDispatch,
    addReservation,
    addReturn,
    addUploadedFile,
    addMaintenanceHistory,
    addAccidentHistory,
  } = useERPState();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [analyzed, setAnalyzed] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [intakeType, setIntakeType] = useState<IntakeType>("insurance");
  const [orderer, setOrderer] = useState("");
  const [repairShop, setRepairShop] = useState("");
  const [customerCar, setCustomerCar] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedVehicleNumber, setSelectedVehicleNumber] = useState("");
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "complete">("idle");
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const [uploadError, setUploadError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [aiCategory, setAiCategory] = useState<AiCategory>("일반메모");
  const [autoReturnPreview, setAutoReturnPreview] = useState<AutoReturnPreview | null>(null);
  const [parkingUpdatePreview, setParkingUpdatePreview] = useState<ParkingUpdatePreview | null>(null);

  const mainAnalysis = useMemo(() => {
    const firstFileName = files[0]?.name || "";
    return analyzeIntake(text, firstFileName, { intakeType, orderer, repairShop, customerCar, customerName, customerPhone });
  }, [customerCar, customerName, customerPhone, files, intakeType, orderer, repairShop, text]);

  const canAnalyze = Boolean(files.length > 0 || text.trim());

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const selectFiles = (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    
    const newFiles = Array.from(selectedFiles);
    setFiles(newFiles);
    setAnalyzed(false);
    setUploadComplete(false);
    setUploadStatus("idle");
    setUploadProgress({ done: 0, total: newFiles.length });
    setUploadError("");
    setSuccessMessage("");
    setAutoReturnPreview(null);
    setParkingUpdatePreview(null);
    
    previews.forEach((url) => URL.revokeObjectURL(url));
    const newPreviews = newFiles.map(file => 
      file.type.startsWith("image/") ? URL.createObjectURL(file) : ""
    ).filter(Boolean);
    setPreviews(newPreviews);
  };

  const handleAiProcess = async () => {
    setIsUploading(true);
    setAnalyzed(false);
    setUploadComplete(false);
    setUploadStatus("uploading");
    setUploadProgress({ done: 0, total: files.length });
    setUploadError("");
    setSuccessMessage("");

    try {
      const fileNames = files.map((file) => file.name).join(" ");
      const resolveSource = [text, fileNames, orderer, repairShop, customerCar, customerName, customerPhone].join(" ");
      const resolvedVehicleNumber = resolveVehiclePlateNumber(resolveSource, selectedVehicleNumber, vehicles);
      const parkingUpdate = parseParkingUpdate(text, resolvedVehicleNumber, vehicles);
      const fallbackFileName = files[0]?.name || "";
      const analysis = analyzeIntake(text, fallbackFileName, { intakeType, orderer, repairShop, customerCar, customerName, customerPhone });
      const scheduleReservation = parseScheduleFromText(text, vehicles);
      const inferredVehicleNumber = resolvedVehicleNumber || getAnalysisField(analysis, "차량번호") || parkingUpdate?.plateNumber || "unknown";
      const plateNumber = inferredVehicleNumber === "-" ? "unknown" : inferredVehicleNumber;
      const uploadedFiles: StoredFileMetadata[] = [];

      if (parkingUpdate) {
        setParkingUpdatePreview(parkingUpdate);
      }
      
      for (const file of files) {
        const fileAnalysis = analyzeIntake(text, file.name, { intakeType, orderer, repairShop, customerCar, customerName, customerPhone });
        
        const fileCategory = classifyUploadedFile(file.name, fileAnalysis.situation);
        const mockReturn = buildMockReturnPreview(file.name, selectedVehicleNumber, vehicles, dispatches);

        if (mockReturn) {
          setAutoReturnPreview(mockReturn);
        }

        const fileVehicleNumber = resolveVehiclePlateNumber([text, file.name, orderer, repairShop, customerCar, customerName, customerPhone].join(" "), selectedVehicleNumber, vehicles) || plateNumber;
        const metadata: UploadFileMetadata = {
          vehicleNumber: fileVehicleNumber,
          claimNumber: getAnalysisField(fileAnalysis, "보험접수번호"),
          businessFolder: fileCategory.businessFolder,
          fileKind: fileCategory.fileKind,
          intakeType,
          orderer,
          repairShop,
          customerCar,
          customerName,
          customerPhone,
          driverLicenseInfo: getAnalysisField(fileAnalysis, "면허정보"),
          ocrTargets: ["차량번호", "보험접수번호", "면허정보", "고객명"],
          parkingZone: parkingUpdate?.parkingZone,
          memo: text,
        };

        const uploaded = (await uploadFilesToDrive([file], metadata)).map((storedFile) => ({ ...storedFile, intakeType }));
        uploadedFiles.push(...uploaded);
        
        setUploadProgress((current) => ({ ...current, done: current.done + 1 }));
      }

      const persistedAnalysis = analysis.situation === "일반" && plateNumber !== "unknown" ? { ...analysis, situation: "배차" as const } : analysis;

      uploadedFiles.forEach(addUploadedFile);
      if (scheduleReservation) {
        addReservation(scheduleReservation);
      }
      persistAnalyzedIntake({
        analysis: persistedAnalysis,
        plateNumber,
        uploadedFiles,
        parkingUpdate,
        mockReturn: autoReturnPreview || buildMockReturnPreview(fallbackFileName, selectedVehicleNumber, vehicles, dispatches),
        vehicles,
        updateVehicle,
        addDispatch,
        addReturn,
        addMaintenanceHistory,
        addAccidentHistory,
        form: { intakeType, orderer, repairShop, customerCar, customerName, customerPhone, text },
      });

      setAnalyzed(true);
      setUploadComplete(true);
      setUploadStatus("complete");
      setSuccessMessage(scheduleReservation ? "예약 캘린더에 일정이 추가되었습니다" : "업로드 완료. 입력 내용이 초기화되었습니다.");
      resetForm();
    } catch (error) {
      console.error("AI Upload Error:", error);
      setUploadStatus("idle");
      setUploadError(error instanceof Error ? error.message : "업로드 중 오류가 발생했습니다.");
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    previews.forEach((url) => URL.revokeObjectURL(url));
    setFiles([]);
    setPreviews([]);
    setText("");
    setOrderer("");
    setRepairShop("");
    setCustomerCar("");
    setCustomerName("");
    setCustomerPhone("");
    setSelectedVehicleNumber("");
    setAiCategory("일반메모");
    setAnalyzed(false);
  };

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex min-h-64 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-primary/30 bg-field px-5 py-6 text-center transition hover:border-primary/60 hover:bg-primary/5"
          >
            {previews.length > 0 ? (
              <div className="grid w-full grid-cols-2 gap-2 overflow-hidden rounded-lg">
                {previews.slice(0, 4).map((url, i) => (
                  <img key={i} src={url} alt={`미리보기 ${i}`} className="h-24 w-full object-cover" />
                ))}
                {previews.length > 4 && (
                  <div className="flex h-24 items-center justify-center bg-gray-200 text-xs font-bold text-gray-500">
                    +{previews.length - 4}개 더보기
                  </div>
                )}
              </div>
            ) : (
              <>
                <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ImagePlus className="h-8 w-8" aria-hidden="true" />
                </span>
                <span className="mt-4 text-lg font-black text-ink">사진 업로드 (다중 선택 가능)</span>
                <span className="mt-2 text-sm leading-6 text-gray-500">사고부위, 면허증, 보험접수번호, 차량번호 촬영자료</span>
              </>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.pdf"
            multiple
            className="hidden"
            onChange={(event) => selectFiles(event.target.files)}
          />
          {files.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs font-bold text-primary">
                  <FileImage className="h-3 w-3" aria-hidden="true" />
                  <span className="max-w-[120px] truncate">{f.name}</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 rounded-lg border border-line bg-white p-4">
            <div className="grid grid-cols-3 gap-2">
              {intakeTypeOptions.map((option) => (
                <label
                  key={option.value}
                  className={option.value === intakeType ? "flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-primary bg-primary px-3 text-sm font-black text-white" : "flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-line bg-field px-3 text-sm font-black text-gray-600"}
                >
                  <input
                    type="radio"
                    name="intakeType"
                    value={option.value}
                    checked={option.value === intakeType}
                    onChange={() => {
                      setIntakeType(option.value);
                      setAnalyzed(false);
                    }}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ))}
            </div>
            <label className="mt-3 block w-full min-w-0">
              <span className="text-xs font-bold text-gray-500">배차 차량번호</span>
              <select
                value={selectedVehicleNumber}
                onChange={(event) => {
                  setSelectedVehicleNumber(event.target.value);
                  setAnalyzed(false);
                }}
                className="mt-1 min-h-12 w-full rounded-lg border border-line bg-field px-3 text-sm font-bold text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              >
                <option value="">차량번호 선택</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.plateNumber}>
                    {vehicle.plateNumber} · {vehicle.model}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-3 grid min-w-0 gap-3 md:grid-cols-4">
              {(intakeType === "insurance" || intakeType === "selfPay") && (
                <LabeledInput label="오더자" value={orderer} onChange={setOrderer} onDirty={() => setAnalyzed(false)} placeholder="오더자 입력" />
              )}
              {intakeType === "insurance" && (
                <>
                  <LabeledInput label="수리처" value={repairShop} onChange={setRepairShop} onDirty={() => setAnalyzed(false)} placeholder="수리처 입력" />
                  <LabeledInput label="고객차종(배기량)" value={customerCar} onChange={setCustomerCar} onDirty={() => setAnalyzed(false)} placeholder="예: K5 2.0" />
                </>
              )}
              {intakeType === "selfService" && (
                <LabeledInput label="고객명" value={customerName} onChange={setCustomerName} onDirty={() => setAnalyzed(false)} placeholder="고객명 입력" />
              )}
              <LabeledInput
                label="고객 휴대폰번호"
                value={customerPhone}
                onChange={setCustomerPhone}
                onDirty={() => setAnalyzed(false)}
                placeholder="010-0000-0000"
                inputMode="tel"
              />
            </div>
          </div>
            <textarea
            value={text}
            onChange={(event) => {
              const nextText = event.target.value;
              setText(nextText);
              setAiCategory(classifyAiInbox(nextText));
              setAnalyzed(false);
            }}
            rows={5}
            className="mt-4 w-full resize-none rounded-lg border border-line bg-white px-4 py-3 text-base leading-7 text-ink outline-none transition placeholder:text-gray-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
            placeholder="AI 텍스트 입력 (선택): 정비요망, 사고접수, 회차 후 계기판사진, 125하4208 독도"
          />
          <button
            type="button"
            disabled={!canAnalyze || isUploading}
            onClick={handleAiProcess}
            className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-base font-black text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                업로드 중... {uploadProgress.done}/{uploadProgress.total || files.length}
              </>
            ) : (
              <>
                <ImagePlus className="h-5 w-5" aria-hidden="true" />
                업로드
              </>
            )}
          </button>
          {uploadStatus === "uploading" && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-primary/15 bg-primary/5 p-3 text-sm font-bold text-primary">
              <Loader2 className="h-5 w-5 animate-spin" />
              Google Drive 업로드를 처리하고 있습니다. {uploadProgress.done}/{uploadProgress.total || files.length}
            </div>
          )}
          {uploadError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
              업로드 실패: {uploadError}
            </div>
          )}
          {uploadComplete && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm font-bold text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              {successMessage || "업로드 완료. 입력 내용이 초기화되었습니다."}
            </div>
          )}
          {autoReturnPreview && (
            <section className="mt-4 rounded-lg border border-primary/20 bg-white p-4">
              <p className="text-sm font-black text-primary">최근 배차건을 찾았습니다.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <InfoPill label="차량번호" value={autoReturnPreview.plateNumber} />
                <InfoPill label="최근 배차" value={autoReturnPreview.dispatchInfo} />
                <InfoPill label="추출 주행거리" value={`${autoReturnPreview.mileage.toLocaleString()}km`} />
                <InfoPill label="추출 유량" value={`${autoReturnPreview.fuelLevel}%`} />
              </div>
              <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-field p-3 text-xs font-semibold leading-5 text-gray-700">{autoReturnPreview.report}</pre>
              <div className="mt-3 flex flex-wrap gap-2">
                {["자동 회차 처리", "직접 수정 후 회차 처리", "다른 배차건 선택", "보류"].map((label) => (
                  <button key={label} type="button" className="min-h-10 rounded-lg border border-line px-3 text-sm font-bold text-ink">
                    {label}
                  </button>
                ))}
              </div>
            </section>
          )}
          {parkingUpdatePreview && (
            <section className="mt-4 rounded-lg border border-primary/20 bg-white p-4">
              <p className="text-sm font-black text-primary">주차위치 최신화 감지</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <InfoPill label="차량번호" value={parkingUpdatePreview.plateNumber} />
                <InfoPill label="주차구역" value={parkingUpdatePreview.parkingZone} />
              </div>
              <p className="mt-3 rounded-lg bg-field p-3 text-sm font-semibold text-gray-700">{parkingUpdatePreview.memo}</p>
            </section>
          )}
      </div>
    </section>
  );
}

function analyzeIntake(
  text: string,
  fileName = "",
  form: {
    intakeType: IntakeType;
    orderer: string;
    repairShop: string;
    customerCar: string;
    customerName: string;
    customerPhone: string;
  },
): IntakeAnalysis {
  const source = [
    text,
    fileName,
    form.orderer,
    form.repairShop,
    form.customerCar,
    form.customerName,
    form.customerPhone,
  ].join(" ");
  const lower = source.toLowerCase();
  const plateNumber = source.match(/\d{2,3}[가-힣]\d{4}/)?.[0] ?? "-";
  const claimNumber = source.match(/(?:접수번호|보험접수|접수)[:\s-]*(\d{6,})/)?.[1] ?? source.match(/\b\d{7,12}\b/)?.[0] ?? "-";
  const orderer = form.orderer || readField(source, ["오더자", "발주자", "담당자", "요청자"]);
  const repairShop = form.repairShop || readField(source, ["수리처", "공업사", "정비소", "수리공장"]);
  const customerCar = form.customerCar || readField(source, ["고객차종", "고객 차종", "상대차종", "차종"]);
  const customerName = form.customerName || readField(source, ["고객명", "고객"]);
  const driverLicenseInfo = readField(source, ["면허번호", "운전면허", "면허정보", "면허"]);
  const maintenance = readField(source, ["정비내역", "수리내역", "작업내용", "메모"]);
  const hasAccident = ["사고", "파손", "범퍼", "휀다", "접촉", "보험접수", "기스", "추돌", "도어", "휠", "유리"].some((keyword) => lower.includes(keyword));
  const hasMaintenance = ["정비", "정비요망", "수리", "엔진오일", "타이어", "브레이크", "배터리", "견적", "교체"].some((keyword) => lower.includes(keyword));
  const hasReturn = ["회차", "반납", "입고", "회차계기판"].some((keyword) => lower.includes(keyword));
  const hasDispatch = ["배차", "출고", "탁송", "전달"].some((keyword) => lower.includes(keyword)) || Boolean(form.orderer || form.repairShop);
  const hasReservation = ["예약", "대차", "얘기됨", "예정", "스케줄", "시간", "월", "일", "시"].some((keyword) => lower.includes(keyword));

  const situation = hasReturn ? "회차" : hasDispatch ? "배차" : hasReservation ? "예약" : hasAccident ? "사고" : hasMaintenance ? "정비" : "일반";
  const titleMap = {
    사고: "사고/보험 접수 후보",
    정비: "정비이력 등록 후보",
    회차: "회차 보고 후보",
    배차: "배차 업무 후보",
    예약: "예약 등록 후보",
    일반: "통합 기록 후보",
  };
  const actionsMap = {
    사고: ["사고이력 생성", "정비이력 연결", "보험접수 연결"],
    정비: ["정비이력 생성", "정비예약 등록", "차량상태 변경"],
    회차: ["회차보고 저장", "주행거리 확인", "차량상태 대기"],
    배차: ["배차보고 저장", "고객정보 연결", "탁송 일정 생성"],
    예약: ["예약 등록", "차량 배정", "알림 생성"],
    일반: ["통합메모 저장", "담당자 검토", "기록 분류"],
  };

  return {
    title: titleMap[situation],
    situation,
    confidence: Math.min(96, 62 + [plateNumber, claimNumber, orderer, repairShop, customerCar, driverLicenseInfo, maintenance, fileName].filter(Boolean).filter((value) => value !== "-").length * 5),
    summary: `${plateNumber !== "-" ? plateNumber : "차량 미확인"} 기준으로 ${titleMap[situation]}로 분류했습니다.`,
    fields: [
      { label: "차량번호", value: plateNumber },
      { label: "보험접수번호", value: claimNumber },
      { label: "오더자", value: orderer || "-" },
      { label: "수리처", value: repairShop || "-" },
      { label: "고객 차종", value: customerCar || "-" },
      { label: "고객명", value: customerName || "-" },
      { label: "고객 휴대폰", value: form.customerPhone || "-" },
      { label: "면허정보", value: driverLicenseInfo || "-" },
      { label: "정비/작업", value: maintenance || detectWork(source) },
    ],
    actions: actionsMap[situation],
  };
}

function classifyUploadedFile(fileName: string, situation: IntakeAnalysis["situation"]): { businessFolder: DriveBusinessFolder; fileKind: DriveFileKind } {
  const normalized = fileName.toLowerCase();

  if (["회차계기판", "return-dashboard", "return_dash"].some((keyword) => normalized.includes(keyword))) {
    return { businessFolder: "회차", fileKind: "사진" };
  }

  if (["license", "driver", "면허"].some((keyword) => normalized.includes(keyword))) {
    return { businessFolder: "면허증", fileKind: "면허증" };
  }

  if (["보험", "접수", "claim", "insurance"].some((keyword) => normalized.includes(keyword))) {
    return { businessFolder: "보험접수자료", fileKind: "보험접수자료" };
  }

  if (["정비", "수리", "견적", "maintenance", "repair"].some((keyword) => normalized.includes(keyword)) || situation === "정비") {
    return { businessFolder: "정비사진", fileKind: "정비사진" };
  }

  if (["외관", "전면", "후면", "측면", "계기판", "exterior"].some((keyword) => normalized.includes(keyword))) {
    return { businessFolder: "차량외관사진", fileKind: "차량외관사진" };
  }

  if (situation === "사고") {
    return { businessFolder: "사고사진", fileKind: "사고사진" };
  }

  return { businessFolder: "사고사진", fileKind: "사고사진" };
}

function classifyAiInbox(value: string): AiCategory {
  const source = value.toLowerCase();

  if (["정비요망", "엔진오일", "브레이크", "타이어", "배터리", "점검", "차량이상"].some((keyword) => source.includes(keyword.toLowerCase()))) return "정비";
  if (["사고", "파손", "접촉", "보험접수", "범퍼", "휀다"].some((keyword) => source.includes(keyword.toLowerCase()))) return "사고";
  if (["계약", "계약서"].some((keyword) => source.includes(keyword))) return "계약";
  if (["청구", "청구서"].some((keyword) => source.includes(keyword))) return "청구";
  if (["입금", "입금확인"].some((keyword) => source.includes(keyword))) return "입금";
  if (["예약", "예약변경", "대차", "얘기됨", "예정", "시간", "월", "일", "시"].some((keyword) => source.includes(keyword))) return "예약";

  return "일반메모";
}

export function parseScheduleFromText(text: string, vehicles: Vehicle[] = []): Reservation | null {
  const source = text.trim();
  if (!source) return null;

  const hasScheduleKeyword = ["예약", "대차", "얘기됨", "예정", "시간", "월", "일", "시"].some((keyword) => source.includes(keyword));
  if (!hasScheduleKeyword) return null;

  const dateParts = parseScheduleDate(source);
  const timeParts = parseScheduleTime(source);
  if (!dateParts || !timeParts) return null;

  const lastFour = source.match(/(?:^|\D)(\d{4})(?!\d)/)?.[1] || "";
  const matchedVehicle = lastFour ? vehicles.find((vehicle) => vehicle.plateNumber.endsWith(lastFour)) : undefined;
  const partnerName = inferPartnerName(source);
  const vehicleModel = inferVehicleModel(source, matchedVehicle?.model);
  const route = vehicleModel ? `${vehicleModel} 대차` : "대차 예약";

  return {
    id: `r-${Date.now()}`,
    date: dateParts,
    time: timeParts.time,
    endTime: timeParts.endTime,
    vehicleNumber: matchedVehicle?.plateNumber || lastFour || "",
    rentCarNumber: matchedVehicle?.plateNumber || lastFour || "",
    customerName: partnerName,
    customerCarNumber: "",
    factoryName: partnerName,
    pickupLocation: partnerName,
    deliveryLocation: "",
    orderPerson: partnerName,
    memo: source,
    route,
    status: "예약대기",
  };
}

function parseScheduleDate(source: string) {
  const year = new Date().getFullYear();
  const matched =
    source.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/) ||
    source.match(/(\d{1,2})\s*\/\s*(\d{1,2})/) ||
    source.match(/(\d{1,2})\s*\.\s*(\d{1,2})/);

  if (!matched) return null;

  const month = Number(matched[1]);
  const day = Number(matched[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseScheduleTime(source: string) {
  const rangeMatched = source.match(/(오전|오후)?\s*(\d{1,2})(?::(\d{2}))?\s*시?\s*[~-]\s*(오전|오후)?\s*(\d{1,2})(?::(\d{2}))?\s*시?/);
  if (rangeMatched) {
    return {
      time: formatScheduleHour(rangeMatched[2], rangeMatched[3], rangeMatched[1]),
      endTime: formatScheduleHour(rangeMatched[5], rangeMatched[6], rangeMatched[4] || rangeMatched[1]),
    };
  }

  const singleMatched = source.match(/(오전|오후)?\s*(\d{1,2})(?::(\d{2}))?\s*시/);
  if (!singleMatched) return null;

  return {
    time: formatScheduleHour(singleMatched[2], singleMatched[3], singleMatched[1]),
    endTime: "",
  };
}

function formatScheduleHour(hourText: string, minuteText = "00", meridiem = "") {
  let hour = Number(hourText);
  if (meridiem === "오후" && hour < 12) hour += 12;
  if (meridiem === "오전" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${minuteText.padStart(2, "0")}`;
}

function inferPartnerName(source: string) {
  const knownPartners = ["베스트카"];
  const matchedKnownPartner = knownPartners.find((partner) => source.includes(partner));
  if (matchedKnownPartner) return matchedKnownPartner;

  const matched = source.match(/([가-힣A-Za-z0-9]+(?:카|렌트|모터스|공업사|정비|보험))/);
  return matched?.[1] || "";
}

function inferVehicleModel(source: string, matchedModel = "") {
  const knownModels = ["싼타페", "쏘렌토", "그랜저", "아반떼", "쏘나타", "카니발", "투싼", "스포티지", "K5", "K7", "K8", "G80", "GV70", "레이", "모닝", "스타리아", "코나"];
  const matchedKnownModel = knownModels.find((model) => source.toLowerCase().includes(model.toLowerCase()));
  if (matchedKnownModel) return matchedKnownModel;
  return matchedModel.replace(/^더뉴|^디올뉴|^올 뉴|^더 뉴/, "").split(" ")[0] || "";
}

function buildMockReturnPreview(
  fileName: string,
  selectedVehicleNumber: string,
  vehicles: Array<{ plateNumber: string; fuelLevel?: number; mileage?: number }>,
  dispatches: Array<{ id: string; customerName: string; status: string; rentalCarNumber: string }>,
): AutoReturnPreview | null {
  if (!["회차계기판", "return-dashboard", "return_dash"].some((keyword) => fileName.toLowerCase().includes(keyword))) {
    return null;
  }

  const plateNumber = fileName.match(/\d{2,3}[가-힣]\d{4}/)?.[0] || selectedVehicleNumber || "차량번호 확인필요";
  const mileage = Number(fileName.match(/(\d{4,7})\s*km/i)?.[1] || fileName.match(/_(\d{4,7})_/i)?.[1] || 0);
  const vehicle = vehicles.find((item) => item.plateNumber === plateNumber);
  const fuelLevel = Number(fileName.match(/유량\s*(\d{1,3})/)?.[1] || vehicle?.fuelLevel || 0);
  const dispatch = dispatches.find((item) => item.rentalCarNumber === plateNumber) ?? dispatches[0];
  const dispatchInfo = dispatch ? `${dispatch.id} · ${dispatch.customerName} · ${dispatch.status}` : "매칭 배차건 확인필요";
  const finalMileage = mileage || vehicle?.mileage || 0;
  const report = [
    "[회차보고]",
    `${plateNumber} 회차 완료`,
    `주행거리: ${finalMileage.toLocaleString()}km`,
    `유량: ${fuelLevel}%`,
    "처리방식: 계기판 사진 자동인식",
    "특이사항: 회차계기판 사진 업로드로 자동 회차 처리",
  ].join("\n");

  return {
    plateNumber,
    mileage: finalMileage,
    fuelLevel,
    capturedAt: new Date().toISOString(),
    dispatchInfo,
    confidenceScore: plateNumber === "차량번호 확인필요" ? 48 : 88,
    report,
  };
}

function parseParkingUpdate(text: string, selectedVehicleNumber: string, vehicles: Vehicle[]): ParkingUpdatePreview | null {
  const source = text.trim();
  if (!source) return null;

  const parkingZone = parkingZones.find((zone) => source.includes(zone));
  if (!parkingZone) return null;

  const plateNumber = resolveVehiclePlateNumber(source, selectedVehicleNumber, vehicles);
  if (!plateNumber) return null;

  return {
    plateNumber,
    parkingZone,
    memo: `${plateNumber} 차량 주차위치를 ${parkingZone}으로 최신화합니다.`,
  };
}

function persistAnalyzedIntake({
  analysis,
  plateNumber,
  uploadedFiles,
  parkingUpdate,
  mockReturn,
  vehicles,
  updateVehicle,
  addDispatch,
  addReturn,
  addMaintenanceHistory,
  addAccidentHistory,
  form,
}: {
  analysis: IntakeAnalysis;
  plateNumber: string;
  uploadedFiles: StoredFileMetadata[];
  parkingUpdate: ParkingUpdatePreview | null;
  mockReturn: AutoReturnPreview | null;
  vehicles: Vehicle[];
  updateVehicle: (plateNumber: string, updates: Partial<Vehicle>) => void;
  addDispatch: (dispatch: Dispatch) => void;
  addReturn: (record: ReturnRecord) => void;
  addMaintenanceHistory: (record: MaintenanceHistory) => void;
  addAccidentHistory: (record: AccidentHistory) => void;
  form: {
    intakeType: IntakeType;
    orderer: string;
    repairShop: string;
    customerCar: string;
    customerName: string;
    customerPhone: string;
    text: string;
  };
}) {
  if (!plateNumber || plateNumber === "unknown" || plateNumber === "-") return;

  const now = new Date().toISOString();
  const vehicle = vehicles.find((item) => item.plateNumber === plateNumber);
  const photoRefs = uploadedFiles.map((file) => file.r2Url || file.driveUrl || file.fileName).filter(Boolean);
  const parkingLocation = parkingUpdate?.parkingZone || "";
  const locationUpdate = parkingLocation ? { location: parkingLocation } : {};

  if (analysis.situation === "배차") {
    updateVehicle(plateNumber, {
      status: "배차중",
      location: parkingLocation || form.repairShop || "배차지 확인필요",
    });
    addDispatch({
      id: buildRecordId("d"),
      claimNumber: getAnalysisField(analysis, "보험접수번호") || "미접수",
      customerName: form.customerName || getAnalysisField(analysis, "고객명") || "미확인",
      customerPhone: form.customerPhone || getAnalysisField(analysis, "고객 휴대폰") || "-",
      customerCarNumber: "-",
      customerCarModel: form.customerCar || getAnalysisField(analysis, "고객 차종") || "-",
      rentalCarNumber: plateNumber,
      orderedBy: form.orderer || getAnalysisField(analysis, "오더자") || "-",
      repairShop: form.repairShop || getAnalysisField(analysis, "수리처") || "확인필요",
      pickupAddress: "-",
      deliveryAddress: "-",
      fuelLevel: vehicle?.fuelLevel ?? 85,
      notes: buildRecordMemo(form.text, uploadedFiles),
      status: "출발보고",
      intakeType: form.intakeType,
      uploadedAt: now,
    });
    return;
  }

  if (analysis.situation === "회차") {
    const nextFuelLevel = mockReturn?.fuelLevel || vehicle?.fuelLevel || 85;
    const nextMileage = mockReturn?.mileage || vehicle?.mileage || 0;
    updateVehicle(plateNumber, {
      status: "대기중",
      location: parkingLocation || "본사 주차장",
      fuelLevel: nextFuelLevel,
      mileage: nextMileage,
    });
    addReturn({
      id: buildRecordId("r"),
      rentalCarNumber: plateNumber,
      returnAddress: parkingLocation || "회차지 확인필요",
      arrivalAddress: parkingLocation || "본사 주차장",
      fuelLevel: nextFuelLevel,
      mileage: nextMileage,
      notes: buildRecordMemo(form.text, uploadedFiles),
      status: "회차등록",
    });
    return;
  }

  if (analysis.situation === "정비") {
    updateVehicle(plateNumber, { status: "정비필요", ...locationUpdate });
    addMaintenanceHistory({
      id: buildRecordId("mh"),
      vehicleId: vehicle?.id || "",
      plateNumber,
      maintenanceType: detectMaintenanceType(form.text),
      title: getAnalysisField(analysis, "정비/작업") || "AI 접수 정비요망",
      description: form.text || analysis.summary,
      repairShopName: form.repairShop || getAnalysisField(analysis, "수리처") || "확인필요",
      foundDate: now.slice(0, 10),
      mileage: vehicle?.mileage || 0,
      cost: 0,
      priority: "보통",
      status: "정비필요",
      photos: photoRefs,
      videos: [],
      documents: [],
      memo: buildRecordMemo(form.text, uploadedFiles),
      createdBy: "AI 접수",
      createdAt: now,
      updatedAt: now,
    });
    return;
  }

  if (analysis.situation === "사고") {
    updateVehicle(plateNumber, { status: "사고", ...locationUpdate });
    addAccidentHistory({
      id: buildRecordId("ah"),
      vehicleId: vehicle?.id || "",
      plateNumber,
      insuranceNumber: getAnalysisField(analysis, "보험접수번호") || "미접수",
      accidentDate: now.slice(0, 10),
      accidentLocation: parkingUpdate?.parkingZone || "확인필요",
      accidentType: "기타",
      accidentPart: detectAccidentPart(form.text),
      description: form.text || analysis.summary,
      customerName: form.customerName || getAnalysisField(analysis, "고객명") || "미확인",
      customerCarNumber: "-",
      customerCarModel: form.customerCar || getAnalysisField(analysis, "고객 차종") || "-",
      insuranceCompany: "확인필요",
      repairShopName: form.repairShop || getAnalysisField(analysis, "수리처") || "확인필요",
      repairCost: 0,
      claimAmount: 0,
      photos: photoRefs,
      videos: [],
      documents: [],
      status: "접수",
      memo: buildRecordMemo(form.text, uploadedFiles),
      createdBy: "AI 접수",
      createdAt: now,
      updatedAt: now,
    });
    return;
  }

  if (parkingUpdate) {
    updateVehicle(plateNumber, locationUpdate);
  }
}

function getAnalysisField(analysis: IntakeAnalysis, label: string) {
  const value = analysis.fields.find((field) => field.label === label)?.value?.trim();
  return value && value !== "-" ? value : "";
}

function buildRecordId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildRecordMemo(text: string, uploadedFiles: StoredFileMetadata[]) {
  const uploadedSummary = uploadedFiles.map((file) => file.fileName).filter(Boolean).join(", ");
  return [text, uploadedSummary ? `업로드 파일: ${uploadedSummary}` : ""].filter(Boolean).join("\n");
}

function detectMaintenanceType(text: string): MaintenanceHistory["maintenanceType"] {
  if (text.includes("엔진오일")) return "엔진오일";
  if (text.includes("타이어")) return "타이어";
  if (text.includes("브레이크")) return "브레이크";
  if (text.includes("배터리")) return "배터리";
  if (text.includes("범퍼")) return "범퍼";
  if (text.includes("도색")) return "도색";
  if (text.includes("판금")) return "판금";
  if (text.includes("유리")) return "유리";
  return "기타";
}

function detectAccidentPart(text: string): AccidentHistory["accidentPart"] {
  if (text.includes("앞범퍼") || text.includes("전범퍼")) return "앞범퍼";
  if (text.includes("뒤범퍼") || text.includes("후범퍼") || text.includes("범퍼")) return "뒤범퍼";
  if (text.includes("휀다") || text.includes("도어") || text.includes("문")) return "기타";
  if (text.includes("유리")) return "유리";
  if (text.includes("휠")) return "휠";
  if (text.includes("타이어")) return "타이어";
  return "기타";
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-field p-3">
      <p className="text-xs font-bold text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-black text-ink">{value}</p>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  onDirty,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onDirty: () => void;
  placeholder: string;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className="block w-full min-w-0">
      <span className="text-xs font-bold text-gray-500">{label}</span>
      <input
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          onDirty();
        }}
        className="mt-1 min-h-11 w-full rounded-lg border border-line bg-field px-3 text-sm font-bold text-ink outline-none transition placeholder:text-gray-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
        placeholder={placeholder}
        inputMode={inputMode}
      />
    </label>
  );
}

function readField(source: string, labels: string[]) {
  for (const label of labels) {
    const match = source.match(new RegExp(`${label}\\s*[:：]?\\s*([^\\n,/]{2,24})`));
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function detectWork(source: string) {
  for (const keyword of ["엔진오일", "타이어", "브레이크", "배터리", "범퍼", "도어", "유리", "휠", "판금", "도색"]) {
    if (source.includes(keyword)) return keyword;
  }
  return "-";
}
