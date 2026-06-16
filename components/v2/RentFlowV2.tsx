"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Camera,
  Car,
  Check,
  ClipboardList,
  CreditCard,
  FileText,
  GripVertical,
  Home,
  MapPin,
  PackageSearch,
  Plus,
  Search,
  Settings,
  Trash2,
  Wrench,
} from "lucide-react";
import {
  createId,
  fetchJson,
  fileTypes,
  formatDateDot,
  formatDateTime,
  fuelTypes,
  parkingLocations,
  sendJson,
  todayKorea,
  type DispatchV2,
  type PartnerAddressV2,
  type ReservationV2,
  type UploadedFileV2,
  type VehicleV2,
} from "@/lib/rentflow-v2";

type PageKind =
  | "home"
  | "dispatch"
  | "return"
  | "reservation"
  | "incident"
  | "billing"
  | "lost-items"
  | "photos"
  | "partners"
  | "calendar"
  | "admin-dashboard"
  | "admin-vehicles"
  | "admin-reservations"
  | "admin-dispatches"
  | "admin-billing"
  | "admin-receivables"
  | "admin-incidents"
  | "admin-settings"
  | "admin-stats";

const appActions = [
  { href: "/app/dispatch", label: "배차", icon: Car, primary: true },
  { href: "/app/return", label: "회차", icon: Check, primary: true },
  { href: "/app/reservation", label: "예약일정 추가", icon: CalendarDays },
  { href: "/app/incident", label: "사고/정비 기록", icon: Wrench },
  { href: "/app/billing", label: "계약서/청구", icon: FileText },
  { href: "/app/lost-items", label: "분실물 관리", icon: PackageSearch },
];

const adminItems = [
  { href: "/admin/dashboard", label: "대시보드", icon: BarChart3 },
  { href: "/admin/vehicles", label: "차량관리", icon: Car },
  { href: "/admin/reservations", label: "예약관리", icon: CalendarDays },
  { href: "/admin/dispatches", label: "배회차관리", icon: ClipboardList },
  { href: "/admin/partners", label: "거래처주소", icon: MapPin },
  { href: "/admin/photos", label: "사진촬영본", icon: Camera },
  { href: "/admin/billing", label: "계약서/청구", icon: FileText },
  { href: "/admin/receivables", label: "미수금", icon: CreditCard },
  { href: "/admin/incidents", label: "정비/사고", icon: AlertTriangle },
  { href: "/admin/settings", label: "설정", icon: Settings },
  { href: "/admin/stats", label: "통계", icon: BarChart3 },
];

const pageTitles: Record<PageKind, string> = {
  home: "현장 업무 홈",
  dispatch: "배차",
  return: "회차",
  reservation: "예약일정 추가",
  incident: "사고/정비 기록",
  billing: "계약서/청구",
  "lost-items": "분실물 관리",
  photos: "사진촬영본",
  partners: "거래처주소",
  calendar: "예약 캘린더",
  "admin-dashboard": "관리자 대시보드",
  "admin-vehicles": "차량관리",
  "admin-reservations": "예약관리",
  "admin-dispatches": "배회차관리",
  "admin-billing": "계약서/청구",
  "admin-receivables": "미수금",
  "admin-incidents": "정비/사고",
  "admin-settings": "설정",
  "admin-stats": "통계",
};

export function RentFlowV2Page({ kind }: { kind: PageKind }) {
  const [vehicles, setVehicles] = useState<VehicleV2[]>([]);
  const [reservations, setReservations] = useState<ReservationV2[]>([]);
  const [dispatches, setDispatches] = useState<DispatchV2[]>([]);
  const isAdmin = kind.startsWith("admin");

  useEffect(() => {
    Promise.all([
      fetchJson<VehicleV2[]>("/api/vehicles", []),
      fetchJson<ReservationV2[]>("/api/reservations", []),
      fetchJson<DispatchV2[]>("/api/dispatches", []),
    ]).then(([v, r, d]) => {
      setVehicles(v);
      setReservations(r);
      setDispatches(d);
    });
  }, []);

  return (
    <main className="min-h-screen bg-[#f6f7f4] text-[#16211d]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-30 -mx-4 border-b border-[#d7ddd4] bg-[#f6f7f4]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex items-start justify-between gap-3">
            <Link href="/" className="flex min-h-12 items-center gap-2 font-black">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#116149] text-white">
                <Home size={20} />
              </span>
              <span>
                <span className="block text-lg leading-tight">RentFlow v2</span>
                <span className="block text-xs font-bold text-[#6b756f]">{isAdmin ? "office admin" : "field app"}</span>
              </span>
            </Link>
            <QuickMenu reservations={reservations} />
          </div>
        </header>

        <section className="flex flex-col gap-2 py-2">
          <p className="text-sm font-bold text-[#647067]">{isAdmin ? "사무실용 관리자" : "아이폰 현장 입력"}</p>
          <h1 className="text-2xl font-black tracking-normal sm:text-3xl">{pageTitles[kind]}</h1>
        </section>

        {isAdmin ? <AdminNav /> : null}

        {kind === "home" ? <HomeScreen /> : null}
        {kind === "dispatch" ? <DispatchForm vehicles={vehicles} /> : null}
        {kind === "return" ? <ReturnForm vehicles={vehicles} dispatches={dispatches} /> : null}
        {kind === "reservation" ? <ReservationForm reservations={reservations} onReservations={setReservations} /> : null}
        {kind === "incident" ? <IncidentForm vehicles={vehicles} /> : null}
        {kind === "billing" ? <BillingForm dispatches={dispatches} /> : null}
        {kind === "lost-items" ? <LostItemForm vehicles={vehicles} /> : null}
        {kind === "photos" ? <PhotosPage admin={false} /> : null}
        {kind === "partners" ? <PartnersPage /> : null}
        {kind === "calendar" ? <CalendarPage reservations={reservations} /> : null}
        {kind === "admin-dashboard" ? <Dashboard vehicles={vehicles} reservations={reservations} dispatches={dispatches} /> : null}
        {kind === "admin-vehicles" ? <VehicleAdmin vehicles={vehicles} onVehicles={setVehicles} /> : null}
        {kind === "admin-reservations" ? <ReservationAdmin reservations={reservations} onReservations={setReservations} /> : null}
        {kind === "admin-dispatches" ? <DispatchAdmin dispatches={dispatches} /> : null}
        {kind === "admin-billing" ? <BillingAdmin /> : null}
        {kind === "admin-receivables" ? <ReceivablesAdmin /> : null}
        {kind === "admin-incidents" ? <IncidentsAdmin /> : null}
        {kind === "admin-settings" ? <SettingsAdmin /> : null}
        {kind === "admin-stats" ? <StatsAdmin vehicles={vehicles} dispatches={dispatches} /> : null}
      </div>
    </main>
  );
}

function QuickMenu({ reservations }: { reservations: ReservationV2[] }) {
  return (
    <nav className="flex max-w-[62vw] items-center gap-2 overflow-x-auto pb-1 sm:max-w-none">
      <Link className="quick-btn" href="/photos">
        <Camera size={17} />
        <span>사진촬영본</span>
      </Link>
      <Link className="quick-btn" href="/partners">
        <MapPin size={17} />
        <span>거래처주소</span>
      </Link>
      <TodayCalendar reservations={reservations} />
    </nav>
  );
}

function TodayCalendar({ reservations }: { reservations: ReservationV2[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(todayKorea());
  const box = useRef<HTMLDivElement>(null);
  const today = todayKorea();
  const monthStart = `${selected.slice(0, 7)}-01`;
  const first = new Date(`${monthStart}T00:00:00`);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const offset = first.getDay();
  const byDate = useMemo(() => groupBy(reservations, (item) => item.date), [reservations]);
  const selectedItems = byDate[selected] || [];

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, []);

  return (
    <div className="relative" ref={box}>
      <button className="quick-btn whitespace-nowrap" type="button" onClick={() => setOpen((value) => !value)}>
        <CalendarDays size={17} />
        <span>Today {formatDateDot(today)}</span>
      </button>
      {open ? (
        <div className="fixed inset-x-3 top-20 z-50 rounded-lg border border-[#d5ddd6] bg-white p-4 shadow-2xl sm:absolute sm:right-0 sm:inset-x-auto sm:top-12 sm:w-[24rem]">
          <div className="mb-3 flex items-center justify-between">
            <button className="small-btn" onClick={() => setSelected(`${selected.slice(0, 4)}-${String(Number(selected.slice(5, 7)) - 1).padStart(2, "0")}-01`)} type="button">
              이전
            </button>
            <strong>{selected.slice(0, 7)}</strong>
            <button className="small-btn" onClick={() => setSelected(`${selected.slice(0, 4)}-${String(Number(selected.slice(5, 7)) + 1).padStart(2, "0")}-01`)} type="button">
              다음
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-[#657268]">
            {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {Array.from({ length: offset }).map((_, index) => (
              <span key={`blank-${index}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = String(index + 1).padStart(2, "0");
              const date = `${selected.slice(0, 7)}-${day}`;
              const hasItems = (byDate[date] || []).length > 0;
              return (
                <button
                  className={`relative min-h-11 rounded-lg border text-sm font-black ${date === selected ? "border-[#116149] bg-[#e3f3eb]" : "border-[#edf0ec] bg-[#fafbf9]"}`}
                  key={date}
                  title={(byDate[date] || []).map(scheduleText).join("\n")}
                  type="button"
                  onClick={() => setSelected(date)}
                >
                  {index + 1}
                  {hasItems ? <span className="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#c4492d]" /> : null}
                </button>
              );
            })}
          </div>
          <div className="mt-4 rounded-lg bg-[#f5f7f4] p-3">
            <p className="mb-2 text-sm font-black">{formatDateDot(selected)} 일정</p>
            {selectedItems.length ? selectedItems.map((item) => <p className="text-sm" key={item.id}>{scheduleText(item)}</p>) : <p className="text-sm text-[#69736d]">예약일정 없음</p>}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function VehicleSearchCombobox({
  vehicles,
  value,
  onChange,
}: {
  vehicles: VehicleV2[];
  value?: string;
  onChange: (vehicle: VehicleV2) => void;
}) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vehicles.slice(0, 8);
    return vehicles
      .filter((vehicle) => {
        const plate = vehicle.plateNumber || "";
        const model = (vehicle.model || "").toLowerCase();
        return plate.includes(q) || plate.slice(-4).includes(q) || model.includes(q);
      })
      .slice(0, 12);
  }, [query, vehicles]);

  return (
    <div className="relative">
      <input
        className="field min-h-12 w-full"
        placeholder="차량번호 4자리 또는 차종 검색"
        value={query}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open ? (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-[#d8ded8] bg-white shadow-xl">
          {results.length ? (
            results.map((vehicle) => (
              <button
                className="flex min-h-12 w-full items-center justify-between px-3 text-left hover:bg-[#eef5ef]"
                key={vehicle.id}
                type="button"
                onClick={() => {
                  setQuery(`${vehicle.plateNumber} · ${vehicle.model}`);
                  onChange(vehicle);
                  setOpen(false);
                }}
              >
                <span className="font-black">{vehicle.plateNumber}</span>
                <span className="text-sm text-[#68746d]">{vehicle.model}</span>
              </button>
            ))
          ) : (
            <div className="px-3 py-4 text-sm font-bold text-[#68746d]">검색 결과 없음</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function HomeScreen() {
  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {appActions.slice(0, 2).map((item) => (
          <ActionButton item={item} key={item.href} />
        ))}
      </div>
      <div className="grid gap-3">
        {appActions.slice(2).map((item) => (
          <ActionButton item={item} key={item.href} />
        ))}
      </div>
    </section>
  );
}

function ActionButton({ item }: { item: (typeof appActions)[number] }) {
  const Icon = item.icon;
  return (
    <Link className={`flex min-h-24 items-center justify-between rounded-lg border p-5 shadow-sm ${item.primary ? "border-[#116149] bg-[#116149] text-white" : "border-[#dbe1db] bg-white text-[#16211d]"}`} href={item.href}>
      <span className="text-xl font-black">{item.label}</span>
      <Icon size={28} />
    </Link>
  );
}

function AdminNav() {
  return (
    <nav className="flex gap-2 overflow-x-auto pb-2">
      {adminItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-[#d8ded8] bg-white px-3 text-sm font-black" href={item.href} key={item.href}>
            <Icon size={16} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function DispatchForm({ vehicles }: { vehicles: VehicleV2[] }) {
  const [vehicle, setVehicle] = useState<VehicleV2>();
  const [businessType, setBusinessType] = useState("보험");
  const summaryKeys =
    businessType === "보험"
      ? ["orderedBy", "repairShop", "customerCarModel", "fuelDisplay", "customerPhone"]
      : businessType === "자차"
        ? ["orderedBy", "fuelDisplay", "customerPhone"]
        : ["customerName", "fuelDisplay", "customerPhone"];
  return (
    <DataForm
      endpoint="/api/dispatches"
      buildPayload={(data) => ({
        id: createId("dispatch"),
        rentalCarNumber: vehicle?.plateNumber || "",
        businessType,
        corporateVehicle: data.get("corporateVehicle") === "on",
        customerName: text(data, "customerName") || text(data, "orderedBy") || businessType,
        customerPhone: text(data, "customerPhone"),
        customerCarModel: text(data, "customerCarModel"),
        orderedBy: text(data, "orderedBy"),
        repairShop: text(data, "repairShop"),
        fuelDisplay: text(data, "fuelDisplay"),
        notes: text(data, "notes"),
        status: businessType,
      })}
      afterSave={(payload) => vehicle ? sendJson(`/api/vehicles?plateNumber=${encodeURIComponent(vehicle.plateNumber)}`, {
        status: businessType,
        fuelDisplay: String(payload.fuelDisplay || ""),
        damageVehicle: String(payload.customerCarModel || ""),
        activeSummary: summaryKeys.map((key) => String(payload[key] || "")).filter(Boolean).join(" / "),
      }, "PATCH") : undefined}
    >
      <Segmented value={businessType} values={["보험", "자차", "셀프"]} onChange={setBusinessType} />
      <FormBlock title="차량 선택">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem]">
          <VehicleSearchCombobox vehicles={vehicles} onChange={setVehicle} />
          {businessType === "보험" ? (
            <label className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#cfd8d1] bg-white px-3 text-sm font-black">
              <input name="corporateVehicle" type="checkbox" />
              법인차량
            </label>
          ) : null}
        </div>
      </FormBlock>
      {businessType === "보험" ? (
        <CompactRow>
          <Input name="orderedBy" label="오더자" />
          <Input name="repairShop" label="수리처" />
          <Input name="customerCarModel" label="고객차종" />
          <Input name="fuelDisplay" label="배차주유량" placeholder="8/12" />
          <Input name="customerPhone" label="고객연락처" />
        </CompactRow>
      ) : businessType === "자차" ? (
        <CompactRow>
          <Input name="orderedBy" label="오더자" />
          <Input name="fuelDisplay" label="배차주유량" placeholder="만땅" />
          <Input name="customerPhone" label="고객연락처" />
        </CompactRow>
      ) : (
        <CompactRow>
          <Input name="customerName" label="오더자/고객명" />
          <Input name="fuelDisplay" label="배차주유량" placeholder="3/4" />
          <Input name="customerPhone" label="고객연락처" />
        </CompactRow>
      )}
      <Textarea name="notes" label="특이사항" />
      <PhotoUploadButton />
    </DataForm>
  );
}

function ReturnForm({ vehicles, dispatches }: { vehicles: VehicleV2[]; dispatches: DispatchV2[] }) {
  const [vehicle, setVehicle] = useState<VehicleV2>();
  const latest = dispatches.find((item) => item.rentalCarNumber === vehicle?.plateNumber);
  return (
    <DataForm
      endpoint="/api/returns"
      buildPayload={(data) => ({
        id: createId("return"),
        rentalCarNumber: vehicle?.plateNumber || "",
        mileage: Number(text(data, "mileage") || 0),
        fuelDisplay: text(data, "fuelDisplay"),
        arrivalAddress: text(data, "location"),
        notes: text(data, "notes"),
        status: "회차등록",
      })}
      afterSave={(payload) => vehicle ? sendJson(`/api/vehicles?plateNumber=${encodeURIComponent(vehicle.plateNumber)}`, {
        status: "주차구역",
        location: String(payload.arrivalAddress || ""),
        fuelDisplay: String(payload.fuelDisplay || ""),
        activeSummary: String(payload.arrivalAddress || ""),
        mileage: Number(payload.mileage || 0),
      }, "PATCH") : undefined}
    >
      <FormBlock title="차량 선택">
        <VehicleSearchCombobox vehicles={vehicles} onChange={setVehicle} />
        {latest ? <p className="mt-2 text-sm font-bold text-[#68746d]">최근 배차건: {latest.customerName} · {latest.repairShop}</p> : null}
      </FormBlock>
      <CompactRow>
        <Input name="mileage" label="회차키로수" type="number" />
        <Input name="fuelDisplay" label="회차주유량" placeholder="7/12" />
        <Input name="location" label="주차구역" list="parking-locations" />
      </CompactRow>
      <Textarea name="notes" label="특이사항" />
      <PhotoUploadButton />
      <datalist id="parking-locations">{parkingLocations.map((location) => <option value={location} key={location} />)}</datalist>
    </DataForm>
  );
}

function ReservationForm({ reservations, onReservations }: { reservations: ReservationV2[]; onReservations: (reservations: ReservationV2[]) => void }) {
  const [draft, setDraft] = useState("");
  const parsed = useMemo(() => parseReservationText(draft), [draft]);
  return (
    <section className="space-y-4">
      <DataForm
        endpoint="/api/reservations"
        buttonLabel="예약일정 추가"
        buildPayload={(data) => ({
          id: createId("reservation"),
          date: text(data, "date") || parsed.date,
          time: parsed.time || "09:00",
          endTime: "",
          customerName: text(data, "customerName") || parsed.customerName || "예약",
          reservationText: text(data, "reservationText"),
          memo: text(data, "reservationText"),
          route: "예약",
          status: "예약",
        })}
        onSaved={(payload) => onReservations([payload as ReservationV2, ...reservations])}
      >
        <Input
          name="reservationText"
          label="예약내용"
          placeholder="6월20일 홍길동 쏘나타 대차"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          required
        />
        <Input key={parsed.date} name="date" label="날짜 선택" type="date" defaultValue={parsed.date} required />
        <Input key={parsed.customerName} name="customerName" label="예약자명" defaultValue={parsed.customerName} />
      </DataForm>
      <ReservationList reservations={reservations} onReservations={onReservations} />
    </section>
  );
}

function IncidentForm({ vehicles }: { vehicles: VehicleV2[] }) {
  const [vehicle, setVehicle] = useState<VehicleV2>();
  const [type, setType] = useState("사고");
  return (
    <DataForm
      endpoint={type === "사고" ? "/api/accident-histories" : "/api/maintenance-histories"}
      buildPayload={(data) => ({
        id: createId(type === "사고" ? "accident" : "maintenance"),
        plateNumber: vehicle?.plateNumber || "",
        accidentPart: text(data, "content"),
        title: text(data, "content"),
        description: text(data, "notes"),
        insuranceNumber: "",
        repairShopName: "",
        foundDate: todayKorea(),
        accidentDate: todayKorea(),
        status: "접수",
        maintenanceType: "기타",
        photos: [],
        videos: [],
        documents: [],
        memo: text(data, "notes"),
        createdBy: "field",
      })}
    >
      <Segmented value={type} values={["사고", "정비"]} onChange={setType} />
      <FormBlock title="차량 선택">
        <VehicleSearchCombobox vehicles={vehicles} onChange={setVehicle} />
      </FormBlock>
      <Input name="content" label={type === "사고" ? "사고부위" : "정비내용"} required />
      <Textarea name="notes" label="특이사항" />
      <PhotoUploadButton />
    </DataForm>
  );
}

function BillingForm({ dispatches }: { dispatches: DispatchV2[] }) {
  return (
    <DataForm endpoint="/api/billings" buildPayload={(data) => Object.fromEntries(data.entries())}>
      <label className="label">
        배차건 선택
        <select className="field min-h-12" name="dispatchId">
          {dispatches.map((dispatch) => (
            <option key={dispatch.id} value={dispatch.id}>{dispatch.rentalCarNumber} · {dispatch.customerName}</option>
          ))}
        </select>
      </label>
      <Input name="contractTitle" label="계약서 생성" placeholder="계약서 제목" />
      <Input name="amount" label="청구금액" type="number" />
      <Input name="faultRate" label="과실비율" />
      <Input name="taxInvoiceStatus" label="세금계산서 상태" />
      <Input name="receivableStatus" label="미수금 상태" />
    </DataForm>
  );
}

function LostItemForm({ vehicles }: { vehicles: VehicleV2[] }) {
  const [vehicle, setVehicle] = useState<VehicleV2>();
  return (
    <DataForm endpoint="/api/lost-items" buildPayload={(data) => ({
      id: createId("lost"),
      vehicleNumber: vehicle?.plateNumber || "",
      itemName: text(data, "customerName") || "분실물",
      customerName: text(data, "customerName"),
      memo: text(data, "notes"),
      foundDate: text(data, "foundDate"),
      status: "보관중",
    })}>
      <FormBlock title="차량 선택">
        <VehicleSearchCombobox vehicles={vehicles} onChange={setVehicle} />
      </FormBlock>
      <CompactRow>
        <Input name="customerName" label="고객명" />
        <Input name="notes" label="특이사항" />
        <Input name="foundDate" label="날짜" type="date" defaultValue={todayKorea()} />
      </CompactRow>
      <PhotoUploadButton />
    </DataForm>
  );
}

function PhotosPage({ admin }: { admin: boolean }) {
  const [files, setFiles] = useState<UploadedFileV2[]>([]);
  const [query, setQuery] = useState("");
  const [fileType, setFileType] = useState("");

  useEffect(() => {
    fetchJson<UploadedFileV2[]>("/api/uploaded-files", []).then(setFiles);
  }, []);

  const filtered = files.filter((file) => {
    const haystack = `${file.vehicleNumber || ""} ${file.insuranceNumber || ""} ${file.customerName || ""}`.toLowerCase();
    return haystack.includes(query.toLowerCase()) && (!fileType || file.fileType === fileType || file.intakeType === fileType);
  });
  const groups = groupBy(filtered, (file) => file.vehicleNumber || "차량번호 없음");
  const sortedKeys = Object.keys(groups).sort((a, b) => newest(groups[b]) - newest(groups[a]));

  return (
    <section className="space-y-4">
      <FilterBar query={query} onQuery={setQuery} placeholder="차량번호, 보험접수번호, 고객명 검색" />
      <select className="field min-h-12 w-full sm:w-64" value={fileType} onChange={(event) => setFileType(event.target.value)}>
        <option value="">파일 종류 전체</option>
        {fileTypes.map((type) => <option key={type}>{type}</option>)}
      </select>
      {admin ? <p className="text-sm font-bold text-[#667269]">관리자 필터: R2/Drive 백업 상태까지 함께 확인합니다.</p> : null}
      {sortedKeys.map((plate) => (
        <section className="panel" key={plate}>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-xl font-black">{plate}</h2>
              <p className="text-sm font-bold text-[#68746d]">최근 업로드 {formatDateTime(groups[plate][0]?.uploadedAt)}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {groups[plate].map((file, index) => (
              <article className="rounded-lg border border-[#d9dfd8] bg-white p-3" key={`${file.r2Key}-${index}`}>
                <a className="grid aspect-[4/3] place-items-center rounded-md bg-[#eef2ed] text-[#526157]" href={file.r2Url || file.driveUrl || "#"} target="_blank">
                  <Camera size={34} />
                </a>
                <p className="mt-2 truncate text-sm font-black">{file.fileName}</p>
                <p className="text-xs font-bold text-[#69736d]">{file.fileType || file.intakeType || "기타"} · {file.customerName || "-"}</p>
                {file.driveUrl ? <a className="mt-2 inline-flex text-sm font-black text-[#116149]" href={file.driveUrl} target="_blank">Drive 열기</a> : null}
              </article>
            ))}
          </div>
        </section>
      ))}
      {!sortedKeys.length ? <EmptyState text="사진촬영본 데이터가 없습니다." /> : null}
    </section>
  );
}

function PartnersPage() {
  const [partners, setPartners] = useState<PartnerAddressV2[]>([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<PartnerAddressV2 | null>(null);

  useEffect(() => {
    fetchJson<PartnerAddressV2[]>("/api/partner-addresses", []).then(setPartners);
  }, []);

  const filtered = partners.filter((partner) => `${partner.name} ${partner.category} ${partner.address} ${partner.phone}`.toLowerCase().includes(query.toLowerCase()));

  async function remove(id: string) {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    await fetch(`/api/partner-addresses?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setPartners((current) => current.filter((item) => item.id !== id));
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-4">
        <div className="flex gap-2">
          <FilterBar query={query} onQuery={setQuery} placeholder="거래처명, 주소, 연락처 검색" />
          <button className="primary-btn shrink-0" onClick={() => setEditing({ id: createId("partner"), name: "", address: "", category: "거래처" })} type="button">
            <Plus size={18} /> 주소 추가
          </button>
        </div>
        {filtered.map((partner) => (
          <article className="panel" key={partner.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black text-[#116149]">{partner.category || "기타"}</p>
                <h2 className="text-xl font-black">{partner.name}</h2>
                <p className="font-bold">{partner.address} {partner.detailAddress}</p>
                <p className="text-sm text-[#637168]">{partner.managerName || "-"} · {partner.phone || "-"}</p>
                {partner.latitude && partner.longitude ? <p className="text-xs text-[#637168]">{partner.latitude}, {partner.longitude}</p> : <p className="text-xs font-bold text-[#b25b2d]">좌표 등록 필요</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="small-btn" onClick={() => navigator.clipboard?.writeText(`${partner.address} ${partner.detailAddress || ""}`)} type="button">주소 복사</button>
                {partner.naverMapUrl ? <a className="small-btn" href={partner.naverMapUrl} target="_blank">네이버지도 열기</a> : null}
                <button className="small-btn" onClick={() => setEditing(partner)} type="button">수정</button>
                <button className="danger-btn" onClick={() => remove(partner.id)} type="button"><Trash2 size={16} /> 삭제</button>
              </div>
            </div>
          </article>
        ))}
        {!filtered.length ? <EmptyState text="등록된 거래처주소가 없습니다." /> : null}
      </div>
      <aside className="panel h-fit">
        <h2 className="mb-2 text-lg font-black">지도</h2>
        <div className="grid aspect-square place-items-center rounded-lg border border-dashed border-[#cdd6cf] bg-[#eef2ed] p-4 text-center text-sm font-bold text-[#647168]">
          네이버지도 API 키 또는 좌표가 없으면 좌표 등록 필요 상태로 표시합니다.
        </div>
      </aside>
      {editing ? <PartnerModal partner={editing} onClose={() => setEditing(null)} onSaved={(partner) => setPartners((current) => [partner, ...current.filter((item) => item.id !== partner.id)])} /> : null}
    </section>
  );
}

function PartnerModal({ partner, onClose, onSaved }: { partner: PartnerAddressV2; onClose: () => void; onSaved: (partner: PartnerAddressV2) => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/30 p-0 sm:place-items-center sm:p-4">
      <form
        className="max-h-[92vh] w-full overflow-auto rounded-t-lg bg-white p-4 shadow-2xl sm:max-w-xl sm:rounded-lg"
        onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const next = {
            ...partner,
            name: text(data, "name"),
            category: text(data, "category"),
            managerName: text(data, "managerName"),
            phone: text(data, "phone"),
            address: text(data, "address"),
            detailAddress: text(data, "detailAddress"),
            naverMapUrl: text(data, "naverMapUrl"),
            memo: text(data, "memo"),
            latitude: Number(text(data, "latitude")) || undefined,
            longitude: Number(text(data, "longitude")) || undefined,
          };
          await sendJson("/api/partner-addresses", next, partner.name ? "PATCH" : "POST");
          onSaved(next);
          onClose();
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black">주소 추가/수정</h2>
          <button className="small-btn" type="button" onClick={onClose}>닫기</button>
        </div>
        <Input name="name" label="거래처명" defaultValue={partner.name} required />
        <Input name="category" label="구분" defaultValue={partner.category || "거래처"} />
        <Input name="managerName" label="담당자" defaultValue={partner.managerName} />
        <Input name="phone" label="연락처" defaultValue={partner.phone} />
        <Input name="address" label="기본주소" defaultValue={partner.address} required />
        <Input name="detailAddress" label="상세주소" defaultValue={partner.detailAddress} />
        <Input name="naverMapUrl" label="네이버지도 URL" defaultValue={partner.naverMapUrl} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input name="latitude" label="위도" defaultValue={partner.latitude ? String(partner.latitude) : ""} />
          <Input name="longitude" label="경도" defaultValue={partner.longitude ? String(partner.longitude) : ""} />
        </div>
        <button className="small-btn mb-3" type="button">좌표 찾기</button>
        <Textarea name="memo" label="메모" defaultValue={partner.memo} />
        <button className="primary-btn w-full" type="submit">저장</button>
      </form>
    </div>
  );
}

function CalendarPage({ reservations }: { reservations: ReservationV2[] }) {
  const grouped = groupBy(reservations, (item) => item.date);
  return (
    <section className="panel">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Object.keys(grouped).sort().map((date) => (
          <article className="rounded-lg border border-[#d8ded8] bg-white p-4" key={date}>
            <h2 className="mb-2 text-lg font-black">{formatDateDot(date)}</h2>
            {grouped[date].map((item) => <p className="text-sm" key={item.id}>{scheduleText(item)}</p>)}
          </article>
        ))}
      </div>
    </section>
  );
}

function Dashboard({ vehicles, reservations, dispatches }: { vehicles: VehicleV2[]; reservations: ReservationV2[]; dispatches: DispatchV2[] }) {
  const today = todayKorea();
  const kpis = [
    ["전체차량", vehicles.length],
    ["대기중", vehicles.filter((v) => v.status === "대기중").length],
    ["배차중", vehicles.filter((v) => v.status === "배차중").length],
    ["정비중", vehicles.filter((v) => v.status === "정비중").length],
    ["사고중", vehicles.filter((v) => v.status === "사고중" || v.status === "사고").length],
    ["오늘 배차", dispatches.filter((d) => d.createdAt?.startsWith(today)).length],
    ["오늘 회차", 0],
    ["미수금", "0원"],
  ];
  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map(([label, value]) => <Kpi label={String(label)} value={String(value)} key={String(label)} />)}
      </div>
      <VehicleTable vehicles={vehicles} />
    </section>
  );
}

function VehicleAdmin({ vehicles, onVehicles }: { vehicles: VehicleV2[]; onVehicles: (vehicles: VehicleV2[]) => void }) {
  const [editing, setEditing] = useState<VehicleV2 | null>(null);
  const [deleting, setDeleting] = useState<VehicleV2 | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  async function persistOrder(next: VehicleV2[]) {
    onVehicles(next);
    await sendJson("/api/vehicles/reorder", { items: next.map((vehicle, index) => ({ id: vehicle.id, sortOrder: index })) }, "PATCH");
  }

  return (
    <section className="space-y-4">
      <DataForm
        endpoint="/api/vehicles"
        buildPayload={(data) => ({
          id: createId("vehicle"),
          plateNumber: text(data, "plateNumber"),
          model: text(data, "model"),
          fuelType: text(data, "fuelType"),
          mileage: Number(text(data, "mileage") || 0),
          purchaseDate: text(data, "purchaseDate"),
          location: "",
          status: "주차구역",
          memo: text(data, "memo"),
        })}
        onSaved={(payload) => onVehicles([payload as VehicleV2, ...vehicles])}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Input name="plateNumber" label="차량번호" required />
          <Input name="model" label="차종" required />
          <FuelTypeSelect />
          <Input name="mileage" label="총 키로수" type="number" />
          <Input name="purchaseDate" label="매입일" type="date" />
        </div>
        <Textarea name="memo" label="메모" />
      </DataForm>
      <section className="panel overflow-x-auto">
        <h2 className="mb-3 text-xl font-black">차량현황</h2>
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b">
              <th>드래그</th><th>차량번호</th><th>차종</th><th>유종</th><th>총 키로수</th><th>매입일</th><th>수정</th><th>삭제</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((vehicle) => (
              <tr
                className="border-b"
                draggable
                key={vehicle.id}
                onDragStart={() => setDraggingId(vehicle.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (!draggingId || draggingId === vehicle.id) return;
                  const from = vehicles.findIndex((item) => item.id === draggingId);
                  const to = vehicles.findIndex((item) => item.id === vehicle.id);
                  const next = [...vehicles];
                  const [moved] = next.splice(from, 1);
                  next.splice(to, 0, moved);
                  setDraggingId(null);
                  persistOrder(next);
                }}
              >
                <td><GripVertical className="cursor-grab text-[#6b756f]" size={20} /></td>
                <td className="font-black">{vehicle.plateNumber}</td>
                <td>{vehicle.model}</td>
                <td>{vehicle.fuelType}</td>
                <td>{vehicle.mileage?.toLocaleString()}</td>
                <td>{vehicle.purchaseDate || "-"}</td>
                <td><button className="small-btn" type="button" onClick={() => setEditing(vehicle)}>수정</button></td>
                <td><button className="danger-btn" type="button" onClick={() => setDeleting(vehicle)}><Trash2 size={16} /> 삭제</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {editing ? <VehicleEditModal vehicle={editing} onClose={() => setEditing(null)} onSaved={(next) => onVehicles(vehicles.map((vehicle) => vehicle.id === next.id ? next : vehicle))} /> : null}
      {deleting ? <ConfirmDelete vehicle={deleting} onCancel={() => setDeleting(null)} onDeleted={() => {
        onVehicles(vehicles.filter((vehicle) => vehicle.id !== deleting.id));
        setDeleting(null);
      }} /> : null}
    </section>
  );
}

function ReservationAdmin({ reservations, onReservations }: { reservations: ReservationV2[]; onReservations: (reservations: ReservationV2[]) => void }) {
  return <section className="space-y-4"><ReservationForm reservations={reservations} onReservations={onReservations} /><CalendarPage reservations={reservations} /></section>;
}

function DispatchAdmin({ dispatches }: { dispatches: DispatchV2[] }) {
  return (
    <section className="panel overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead><tr className="border-b"><th>차량번호</th><th>고객명</th><th>고객차량</th><th>수리처</th><th>접수번호</th><th>상태</th></tr></thead>
        <tbody>{dispatches.map((d) => <tr className="border-b" key={d.id}><td>{d.rentalCarNumber}</td><td>{d.customerName}</td><td>{d.customerCarNumber}</td><td>{d.repairShop}</td><td>{d.claimNumber}</td><td>{d.status}</td></tr>)}</tbody>
      </table>
    </section>
  );
}

function BillingAdmin() {
  return <StatusBoard labels={["계약서 생성", "청구금액 입력", "과실비율", "세금계산서 상태", "미수금 연동"]} />;
}

function ReceivablesAdmin() {
  return <StatusBoard labels={["청구완료", "입금대기", "부분입금", "입금완료", "장기미수"]} />;
}

function IncidentsAdmin() {
  return <StatusBoard labels={["사고기록", "정비기록", "정기검사 알림 기록"]} />;
}

function SettingsAdmin() {
  return <StatusBoard labels={["회사정보", "차량 주차구역 목록", "네이버지도 API 키", "R2 설정", "권한 설정", "OCR/AI 확장 슬롯"]} />;
}

function StatsAdmin({ vehicles, dispatches }: { vehicles: VehicleV2[]; dispatches: DispatchV2[] }) {
  return <StatusBoard labels={[`차량 ${vehicles.length}대`, `배차 ${dispatches.length}건`, "월별 매출", "차량별 가동률", "미수금 추이"]} />;
}

function StatusBoard({ labels }: { labels: string[] }) {
  return <section className="grid gap-3 md:grid-cols-2">{labels.map((label) => <article className="panel min-h-24" key={label}><h2 className="text-lg font-black">{label}</h2><p className="text-sm font-bold text-[#68746d]">D1 데이터 기준 관리 영역</p></article>)}</section>;
}

function VehicleTable({ vehicles }: { vehicles: VehicleV2[] }) {
  return (
    <section className="panel overflow-x-auto">
      <h2 className="mb-3 text-xl font-black">차량현황</h2>
      <table className="w-full min-w-[960px] text-left text-sm">
        <thead><tr className="border-b"><th>차량번호</th><th>차종</th><th>상태</th><th>주유량</th><th>피해차량</th><th>오더자/수리처 또는 주차구역</th><th>최근 업데이트</th></tr></thead>
        <tbody>{vehicles.map((v) => <tr className="border-b" key={v.id}><td className="font-black">{v.plateNumber}</td><td>{v.model}</td><td>{v.status || "주차구역"}</td><td>{v.fuelDisplay || "-"}</td><td>{v.damageVehicle || "-"}</td><td>{v.activeSummary || v.location || "-"}</td><td>{formatDateTime(v.updatedAt)}</td></tr>)}</tbody>
      </table>
    </section>
  );
}

function VehicleEditModal({ vehicle, onClose, onSaved }: { vehicle: VehicleV2; onClose: () => void; onSaved: (vehicle: VehicleV2) => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/30 p-0 sm:place-items-center sm:p-4">
      <form
        className="max-h-[92vh] w-full overflow-auto rounded-t-lg bg-white p-4 shadow-2xl sm:max-w-xl sm:rounded-lg"
        onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const next = {
            ...vehicle,
            plateNumber: text(data, "plateNumber"),
            model: text(data, "model"),
            fuelType: text(data, "fuelType"),
            mileage: Number(text(data, "mileage") || 0),
            purchaseDate: text(data, "purchaseDate"),
            memo: text(data, "memo"),
          };
          await sendJson(`/api/vehicles?plateNumber=${encodeURIComponent(vehicle.plateNumber)}`, next, "PATCH");
          onSaved(next);
          onClose();
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black">차량 수정</h2>
          <button className="small-btn" type="button" onClick={onClose}>닫기</button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input name="plateNumber" label="차량번호" defaultValue={vehicle.plateNumber} required />
          <Input name="model" label="차종" defaultValue={vehicle.model} required />
          <FuelTypeSelect defaultValue={vehicle.fuelType} />
          <Input name="mileage" label="총 키로수" type="number" defaultValue={vehicle.mileage} />
          <Input name="purchaseDate" label="매입일" type="date" defaultValue={vehicle.purchaseDate} />
        </div>
        <Textarea name="memo" label="메모" defaultValue={vehicle.memo} />
        <button className="primary-btn w-full" type="submit">저장</button>
      </form>
    </div>
  );
}

function ConfirmDelete({ vehicle, onCancel, onDeleted }: { vehicle: VehicleV2; onCancel: () => void; onDeleted: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-4 shadow-2xl">
        <h2 className="text-xl font-black">정말 삭제하시겠습니까?</h2>
        <p className="mt-2 text-sm font-bold text-[#68746d]">{vehicle.plateNumber} · {vehicle.model}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button className="small-btn" type="button" onClick={onCancel}>취소</button>
          <button
            className="danger-btn"
            type="button"
            onClick={async () => {
              await fetch(`/api/vehicles?id=${encodeURIComponent(vehicle.id)}`, { method: "DELETE" });
              onDeleted();
            }}
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}

function FuelTypeSelect({ defaultValue }: { defaultValue?: string }) {
  return (
    <label className="label">
      유종
      <select className="field min-h-12" name="fuelType" defaultValue={defaultValue || fuelTypes[0]}>
        {fuelTypes.map((type) => <option key={type}>{type}</option>)}
      </select>
    </label>
  );
}

function ReservationList({ reservations, onReservations }: { reservations: ReservationV2[]; onReservations: (reservations: ReservationV2[]) => void }) {
  const [editing, setEditing] = useState<ReservationV2 | null>(null);

  async function remove(id: string) {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    await fetch(`/api/reservations?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    onReservations(reservations.filter((reservation) => reservation.id !== id));
  }

  return (
    <section className="panel overflow-x-auto">
      <h2 className="mb-3 text-xl font-black">예약 목록</h2>
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead><tr className="border-b"><th>날짜</th><th>예약자명</th><th>예약내용</th><th>수정</th><th>삭제</th></tr></thead>
        <tbody>
          {reservations.map((reservation) => (
            <tr className="border-b" key={reservation.id}>
              <td>{reservation.date}</td>
              <td className="font-black">{reservation.customerName}</td>
              <td>{reservation.reservationText || reservation.memo}</td>
              <td><button className="small-btn" type="button" onClick={() => setEditing(reservation)}>수정</button></td>
              <td><button className="danger-btn" type="button" onClick={() => remove(reservation.id)}><Trash2 size={16} /> 삭제</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {editing ? <ReservationEditModal reservation={editing} onClose={() => setEditing(null)} onSaved={(next) => onReservations(reservations.map((item) => item.id === next.id ? next : item))} /> : null}
    </section>
  );
}

function ReservationEditModal({ reservation, onClose, onSaved }: { reservation: ReservationV2; onClose: () => void; onSaved: (reservation: ReservationV2) => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/30 p-0 sm:place-items-center sm:p-4">
      <form
        className="w-full rounded-t-lg bg-white p-4 shadow-2xl sm:max-w-xl sm:rounded-lg"
        onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const next = {
            ...reservation,
            date: text(data, "date"),
            customerName: text(data, "customerName"),
            reservationText: text(data, "reservationText"),
            memo: text(data, "reservationText"),
          };
          await sendJson(`/api/reservations?id=${encodeURIComponent(reservation.id)}`, next, "PATCH");
          onSaved(next);
          onClose();
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black">예약 수정</h2>
          <button className="small-btn" type="button" onClick={onClose}>닫기</button>
        </div>
        <Input name="date" label="날짜" type="date" defaultValue={reservation.date} required />
        <Input name="customerName" label="예약자명" defaultValue={reservation.customerName} />
        <Input name="reservationText" label="예약내용" defaultValue={reservation.reservationText || reservation.memo} />
        <button className="primary-btn mt-3 w-full" type="submit">저장</button>
      </form>
    </div>
  );
}

function DataForm({
  children,
  endpoint,
  buildPayload,
  afterSave,
  onSaved,
  buttonLabel = "저장",
}: {
  children: React.ReactNode;
  endpoint: string;
  buildPayload: (data: FormData) => Record<string, unknown>;
  afterSave?: (payload: Record<string, unknown>) => void | Promise<unknown>;
  onSaved?: (payload: Record<string, unknown>) => void;
  buttonLabel?: string;
}) {
  const [status, setStatus] = useState("");
  return (
    <form
      className="panel space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setStatus("저장 중");
        const payload = buildPayload(new FormData(event.currentTarget));
        try {
          await sendJson(endpoint, payload);
          await afterSave?.(payload);
          onSaved?.(payload);
          setStatus("저장 완료");
          event.currentTarget.reset();
        } catch (error) {
          setStatus(`저장 실패: ${String(error)}`);
        }
      }}
    >
      {children}
      <button className="primary-btn w-full" type="submit">{buttonLabel}</button>
      {status ? <p className="text-sm font-black text-[#116149]">{status}</p> : null}
    </form>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return <label className="label">{label}<input className="field min-h-12" {...rest} /></label>;
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const { label, ...rest } = props;
  return <label className="label">{label}<textarea className="field min-h-28" {...rest} /></label>;
}

function FormBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><p className="mb-1 text-sm font-black">{title}</p>{children}</div>;
}

function CompactRow({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-2 sm:grid-flow-col sm:auto-cols-fr">{children}</div>;
}

function PhotoUploadButton() {
  return (
    <label className="primary-btn w-full cursor-pointer">
      <Camera size={20} />
      사진업로드
      <input className="sr-only" type="file" accept=".jpg,.jpeg,.png,.webp,.mp4,image/jpeg,image/png,image/webp,video/mp4" multiple />
    </label>
  );
}

function Segmented({ value, values, onChange }: { value: string; values: string[]; onChange: (value: string) => void }) {
  return <div className="grid grid-cols-2 rounded-lg bg-[#e6ebe5] p-1">{values.map((item) => <button className={`min-h-12 rounded-md font-black ${value === item ? "bg-white shadow" : ""}`} key={item} type="button" onClick={() => onChange(item)}>{item}</button>)}</div>;
}

function FilterBar({ query, onQuery, placeholder }: { query: string; onQuery: (query: string) => void; placeholder: string }) {
  return <label className="relative block min-w-0 flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#68746d]" size={18} /><input className="field min-h-12 w-full pl-10" placeholder={placeholder} value={query} onChange={(event) => onQuery(event.target.value)} /></label>;
}

function Kpi({ label, value }: { label: string; value: string }) {
  return <article className="rounded-lg border border-[#d8ded8] bg-white p-4"><p className="text-sm font-black text-[#68746d]">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></article>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="panel grid min-h-40 place-items-center text-center font-black text-[#68746d]">{text}</div>;
}

function groupBy<T>(items: T[], key: (item: T) => string) {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const name = key(item) || "기타";
    acc[name] = acc[name] || [];
    acc[name].push(item);
    return acc;
  }, {});
}

function scheduleText(item: ReservationV2) {
  return `${item.time || "--:--"}~${item.endTime || "--:--"} ${item.factoryName || item.orderPerson || "-"} ${item.customerCarModel || ""} 대차 ${item.vehicleNumber || item.customerCarNumber || ""}`.trim();
}

function newest(files: UploadedFileV2[]) {
  return Math.max(...files.map((file) => new Date(file.uploadedAt || 0).getTime()));
}

function text(data: FormData, key: string) {
  return String(data.get(key) || "").trim();
}

function parseReservationText(value: string) {
  const today = todayKorea();
  let date = today;
  const monthDay = value.match(/(\d{1,2})월\s*(\d{1,2})일/);
  if (monthDay) {
    date = `${today.slice(0, 4)}-${monthDay[1].padStart(2, "0")}-${monthDay[2].padStart(2, "0")}`;
  } else if (value.includes("내일")) {
    const next = new Date(`${today}T00:00:00`);
    next.setDate(next.getDate() + 1);
    date = next.toISOString().slice(0, 10);
  }

  const timeMatch = value.match(/오전\s*(\d{1,2})시|오후\s*(\d{1,2})시|(\d{1,2}):(\d{2})/);
  const hour = timeMatch?.[1] || (timeMatch?.[2] ? String(Number(timeMatch[2]) + 12) : timeMatch?.[3]);
  const time = hour ? `${hour.padStart(2, "0")}:${timeMatch?.[4] || "00"}` : "";
  const cleaned = value.replace(/오늘|내일|\d{1,2}월\s*\d{1,2}일|오전\s*\d{1,2}시|오후\s*\d{1,2}시|\d{1,2}:\d{2}|대차/g, " ").trim();
  const customerName = cleaned.split(/\s+/).filter(Boolean)[0] || "";

  return { date, time, customerName };
}
