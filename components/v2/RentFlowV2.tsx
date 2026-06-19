"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  CalendarDays,
  Camera,
  Car,
  Check,
  ClipboardList,
  CreditCard,
  FileText,
  GripVertical,
  Home,
  Info,
  MapPin,
  PackageSearch,
  Plus,
  Search,
  Settings,
  Trash2,
  Wrench,
} from "lucide-react";
import { OverlayModal } from "@/components/OverlayModal";
import { Pagination } from "@/components/Pagination";
import { RepairShopMapPage } from "@/components/repair-shops/RepairShopMapPage";
import {
  createId,
  fetchJson,
  formatDateDot,
  formatDateTime,
  fuelTypes,
  parkingLocations,
  sendJson,
  todayKorea,
  type DispatchV2,
  type IncidentRecordV2,
  type LostItemV2,
  type PartnerAddressV2,
  type ReservationV2,
  type ReturnV2,
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
  | "app-dashboard"
  | "admin-dashboard"
  | "admin-vehicles"
  | "admin-reservations"
  | "admin-dispatches"
  | "admin-billing"
  | "admin-receivables"
  | "admin-incidents"
  | "admin-settings"
  | "admin-stats";

type ReloadHandler<T> = (items?: T[]) => void | Promise<void>;

const appActions = [
  { href: "/app/dispatch", label: "배차", icon: Car, primary: true },
  { href: "/app/return", label: "회차", icon: Check, primary: true },
  { href: "/app/dashboard", label: "차량현황판", icon: Car, emoji: "🚗" },
  { href: "/app/reservation", label: "예약일정 추가", icon: CalendarDays },
  { href: "/app/incident", label: "사고/정비 기록", icon: Wrench },
  { href: "/app/billing", label: "계약서/청구", icon: FileText },
  { href: "/app/lost-items", label: "분실물 관리", icon: PackageSearch },
];

const adminItems = [
  { href: "/admin/dispatches", label: "배회차관리", icon: ClipboardList },
  { href: "/admin/billing", label: "계약서/청구", icon: FileText },
  { href: "/admin/dashboard", label: "차량현황판", icon: BarChart3 },
  { href: "/admin/vehicles", label: "차량수정", icon: Car },
  { href: "/admin/receivables", label: "미수금", icon: CreditCard },
  { href: "/admin/stats", label: "통계", icon: BarChart3 },
];

const dispatchBoardColumns = [
  { label: "날짜", width: "w-[130px]" },
  { label: "차량번호", width: "w-[100px]" },
  { label: "구분", width: "w-[70px]" },
  { label: "차종/색상", width: "w-[160px]" },
  { label: "오더자", width: "w-[180px]" },
  { label: "고객차종", width: "w-[130px]" },
  { label: "주유량", width: "w-[80px]" },
  { label: "수리처", width: "w-[160px]" },
  { label: "연락처", width: "w-[170px]" },
  { label: "메모", width: "w-[220px]" },
  { label: "사진링크", width: "w-[80px]" },
  { label: "사진추가업로드", width: "w-[100px]" },
  { label: "수정", width: "w-[70px]" },
  { label: "삭제", width: "w-[70px]" },
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
  "app-dashboard": "차량현황판",
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
  const [returns, setReturns] = useState<ReturnV2[]>([]);
  const [accidents, setAccidents] = useState<IncidentRecordV2[]>([]);
  const [maintenance, setMaintenance] = useState<IncidentRecordV2[]>([]);
  const [lostItems, setLostItems] = useState<LostItemV2[]>([]);
  const [activeOverlay, setActiveOverlay] = useState<"calendar" | "unread" | null>(null);
  const isAdmin = kind.startsWith("admin");

  async function reloadReservations() {
    setReservations(await fetchJson<ReservationV2[]>("/api/reservations", []));
  }

  async function reloadDispatches() {
    setDispatches(await fetchJson<DispatchV2[]>("/api/dispatches", []));
  }

  async function reloadReturns() {
    setReturns(await fetchJson<ReturnV2[]>("/api/returns", []));
  }

  async function reloadAccidents() {
    setAccidents(await fetchJson<IncidentRecordV2[]>("/api/accident-histories", []));
  }

  async function reloadMaintenance() {
    setMaintenance(await fetchJson<IncidentRecordV2[]>("/api/maintenance-histories", []));
  }

  async function reloadLostItems() {
    setLostItems(await fetchJson<LostItemV2[]>("/api/lost-items", []));
  }

  useEffect(() => {
    Promise.all([
      fetchJson<VehicleV2[]>("/api/vehicles", []),
      fetchJson<ReservationV2[]>("/api/reservations", []),
      fetchJson<DispatchV2[]>("/api/dispatches", []),
      fetchJson<ReturnV2[]>("/api/returns", []),
      fetchJson<IncidentRecordV2[]>("/api/accident-histories", []),
      fetchJson<IncidentRecordV2[]>("/api/maintenance-histories", []),
      fetchJson<LostItemV2[]>("/api/lost-items", []),
    ]).then(([v, r, d, ret, acc, maint, lost]) => {
      setVehicles(v);
      setReservations(r);
      setDispatches(d);
      setReturns(ret);
      setAccidents(acc);
      setMaintenance(maint);
      setLostItems(lost);
    });
  }, []);

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[#f6f7f4] text-[#16211d]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-30 -mx-4 border-b border-[#d7ddd4] bg-[#f6f7f4]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="relative grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:flex sm:flex-nowrap sm:items-center sm:justify-between">
            <Link href={isAdmin ? "/admin" : "/app"} className="flex min-h-12 items-center gap-2 font-black">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#116149] text-white">
                <Home size={20} />
              </span>
              <span className="block leading-tight">
                <span className="block text-base font-black sm:inline sm:text-lg">{isAdmin ? "사무실용 관리자" : "배회차톡"}</span>
                {!isAdmin ? <span className="block text-xs font-bold text-[#6b756f] sm:inline sm:text-lg sm:text-[#16211d]"> <span className="sm:hidden">(현장용)</span><span className="hidden sm:inline">(현장용)</span></span> : null}
              </span>
            </Link>
            <UnreadMessagesButton
              dispatches={dispatches}
              returns={returns}
              vehicles={vehicles}
              onDispatches={reloadDispatches}
              onReturns={reloadReturns}
              open={activeOverlay === "unread"}
              onOpenChange={(open) => setActiveOverlay(open ? "unread" : null)}
            />
            <QuickMenu reservations={reservations} calendarOpen={activeOverlay === "calendar"} onCalendarOpenChange={(open) => setActiveOverlay(open ? "calendar" : null)} />
          </div>
        </header>

        {isAdmin ? <AdminNav /> : null}

        {kind === "home" ? <HomeScreen /> : null}
        {kind === "dispatch" ? <DispatchForm vehicles={vehicles} dispatches={dispatches} onDispatches={reloadDispatches} /> : null}
        {kind === "return" ? <ReturnForm vehicles={vehicles} dispatches={dispatches} returns={returns} onReturns={reloadReturns} /> : null}
        {kind === "reservation" ? <ReservationForm reservations={reservations} onReservations={reloadReservations} /> : null}
        {kind === "incident" ? <IncidentForm vehicles={vehicles} accidents={accidents} maintenance={maintenance} onAccidents={reloadAccidents} onMaintenance={reloadMaintenance} /> : null}
        {kind === "billing" ? <BillingForm dispatches={dispatches} /> : null}
        {kind === "lost-items" ? <LostItemForm vehicles={vehicles} lostItems={lostItems} onLostItems={reloadLostItems} /> : null}
        {kind === "photos" ? <PhotosPage admin={false} /> : null}
        {kind === "partners" ? <PartnersPage /> : null}
        {kind === "calendar" ? <CalendarPage reservations={reservations} /> : null}
        {kind === "app-dashboard" ? <Dashboard vehicles={vehicles} reservations={reservations} dispatches={dispatches} returns={returns} /> : null}
        {kind === "admin-dashboard" ? <Dashboard vehicles={vehicles} reservations={reservations} dispatches={dispatches} returns={returns} /> : null}
        {kind === "admin-vehicles" ? <VehicleAdmin vehicles={vehicles} onVehicles={setVehicles} /> : null}
        {kind === "admin-reservations" ? <ReservationAdmin reservations={reservations} onReservations={reloadReservations} /> : null}
        {kind === "admin-dispatches" ? <DispatchAdmin dispatches={dispatches} returns={returns} vehicles={vehicles} onDispatches={reloadDispatches} onReturns={reloadReturns} /> : null}
        {kind === "admin-billing" ? <BillingAdmin /> : null}
        {kind === "admin-receivables" ? <ReceivablesAdmin /> : null}
        {kind === "admin-incidents" ? <IncidentsAdmin /> : null}
        {kind === "admin-settings" ? <SettingsAdmin /> : null}
        {kind === "admin-stats" ? <StatsAdmin vehicles={vehicles} dispatches={dispatches} /> : null}
      </div>
    </main>
  );
}

function QuickMenu({
  reservations,
  calendarOpen,
  onCalendarOpenChange,
}: {
  reservations: ReservationV2[];
  calendarOpen: boolean;
  onCalendarOpenChange: (open: boolean) => void;
}) {
  return (
    <nav className="relative z-20 col-start-3 row-start-1 flex flex-col items-end gap-2 sm:flex-row sm:flex-nowrap sm:items-center sm:justify-end sm:overflow-x-auto sm:pb-1">
      <div className="flex flex-nowrap items-center justify-end gap-2">
        <PushPermissionButton />
        <Link className="quick-btn h-11 min-h-11 w-11 min-w-11 px-0 sm:w-auto sm:px-3" href="/photos" title="사진촬영본" aria-label="사진촬영본">
          <Camera size={17} />
          <span className="hidden sm:inline">사진촬영본</span>
        </Link>
        <Link className="quick-btn h-11 min-h-11 w-11 min-w-11 px-0 sm:w-auto sm:px-3" href="/partners" title="거래처주소" aria-label="거래처주소">
          <MapPin size={17} />
          <span className="hidden sm:inline">거래처주소</span>
        </Link>
      </div>
      <div className="flex w-full justify-end sm:w-auto">
        <TodayCalendar reservations={reservations} open={calendarOpen} onOpenChange={onCalendarOpenChange} />
      </div>
    </nav>
  );
}

function UnreadMessagesButton({
  dispatches,
  returns,
  vehicles,
  onDispatches,
  onReturns,
  open,
  onOpenChange,
}: {
  dispatches: DispatchV2[];
  returns: ReturnV2[];
  vehicles: VehicleV2[];
  onDispatches: ReloadHandler<DispatchV2>;
  onReturns: ReloadHandler<ReturnV2>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const unread = [
    ...dispatches.filter((item) => !item.isCompleted).map((item) => ({ kind: "배차" as const, createdAt: item.createdAt, dispatch: item })),
    ...returns.filter((item) => !item.isCompleted).map((item) => ({ kind: "회차" as const, createdAt: item.createdAt, returnItem: item })),
  ].sort((a, b) => sortDateCreatedValues(rowDate(b), rowTime(b), b.createdAt, rowDate(a), rowTime(a), a.createdAt));

  if (unread.length === 0) return null;

  async function complete(kind: "배차" | "회차", id: string) {
    if (kind === "배차") {
      await sendJson(`/api/dispatches?id=${encodeURIComponent(id)}`, { isCompleted: true }, "PATCH");
      await onDispatches();
      return;
    }
    await sendJson(`/api/returns?id=${encodeURIComponent(id)}`, { isCompleted: true }, "PATCH");
    await onReturns();
  }

  return (
    <div className="absolute left-1/2 top-1 z-40 -translate-x-1/2 sm:top-4">
      <button className="quick-btn whitespace-nowrap" type="button" onClick={() => onOpenChange(!open)}>
        안 읽은 메시지
      </button>
      {open ? (
        <OverlayModal
          align="top"
          onClose={() => onOpenChange(false)}
          panelClassName="w-full max-w-full rounded-2xl bg-white p-5 shadow-2xl sm:max-w-6xl"
        >
          <h2 className="mb-3 text-xl font-black">안 읽은 메시지</h2>
          <div data-horizontal-scroll="true" className="max-h-[70vh] overflow-x-auto overflow-y-auto whitespace-nowrap">
            {unread.length ? (
              <table className="w-full min-w-[1050px] table-fixed text-left text-sm">
                <colgroup>
                  <col className="w-[130px]" />
                  <col className="w-[100px]" />
                  <col className="w-[80px]" />
                  <col className="w-[150px]" />
                  <col className="w-[60px]" />
                  <col className="w-[160px]" />
                  <col className="w-[120px]" />
                  <col className="w-[80px]" />
                  <col className="w-[150px]" />
                  <col className="w-[180px]" />
                </colgroup>
                <thead><tr className="border-b"><th>날짜</th><th>차량번호</th><th>배차/회차</th><th>차종/색상</th><th>상태</th><th>오더자</th><th>고객차종</th><th>주유량</th><th>수리처</th><th>메모</th></tr></thead>
                <tbody>{unread.map((row) => {
                  const dispatch = row.kind === "배차" ? row.dispatch : undefined;
                  const ret = row.kind === "회차" ? row.returnItem : undefined;
                  const plate = dispatch?.rentalCarNumber || ret?.rentalCarNumber || "";
                  const vehicle = findVehicle(vehicles, plate);
                  const linkedDispatch = dispatch || findLinkedDispatchForReturn(ret, dispatches);
                  return (
                    <tr className="border-b" key={`${row.kind}-${dispatch?.id || ret?.id}`}>
                      <td>{formatBoardDateTime(dispatch?.date || ret?.date, dispatch?.time || ret?.time, dispatch?.createdAt || ret?.createdAt)}</td>
                      <td className="font-black">{plate}</td>
                      <td>{row.kind}</td>
                      <td>{vehicleModelColor(vehicle)}</td>
                      <td><UnreadStatusBadge status={firstText(linkedDispatch?.dispatchType, linkedDispatch?.businessType, linkedDispatch?.status)} /></td>
                      <td>{clean(linkedDispatch?.orderedBy || linkedDispatch?.customerName)}</td>
                      <td>{clean(linkedDispatch?.customerCarModel)}</td>
                      <td>{clean(dispatch?.fuelDisplay || ret?.fuelDisplay)}</td>
                      <td>{clean(linkedDispatch?.repairShop)}</td>
                      <td>{clean(ret?.notes || linkedDispatch?.notes || dispatch?.notes)}</td>
                    </tr>
                  );
                })}</tbody>
              </table>
            ) : <p className="py-12 text-center text-sm font-bold text-[#68746d]">안 읽은 메시지가 없습니다.</p>}
          </div>
        </OverlayModal>
      ) : null}
    </div>
  );
}

function TodayCalendar({ reservations, open, onOpenChange }: { reservations: ReservationV2[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [selected, setSelected] = useState(todayKorea());
  const today = todayKorea();
  const monthStart = `${selected.slice(0, 7)}-01`;
  const first = new Date(`${monthStart}T00:00:00`);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const offset = first.getDay();
  const byDate = useMemo(() => groupBy(reservations, (item) => item.date), [reservations]);
  const selectedItems = byDate[selected] || [];

  return (
    <div className="flex w-full justify-end sm:w-auto sm:block">
      <button className="quick-btn whitespace-nowrap" type="button" onClick={() => onOpenChange(!open)}>
        <CalendarDays size={17} />
        <span>{formatDateDot(today)}</span>
      </button>
      {open ? (
        <OverlayModal
          align="top"
          onClose={() => onOpenChange(false)}
          panelClassName="w-full max-w-full rounded-2xl border border-[#d5ddd6] bg-white p-5 shadow-2xl sm:max-w-xl"
        >
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
                    className={`relative min-h-12 rounded-lg border text-center text-sm font-black ${date === selected ? "border-[#116149] bg-[#e3f3eb]" : "border-[#edf0ec] bg-[#fafbf9]"}`}
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
              {selectedItems.length ? selectedItems.map((item) => <p className="break-words whitespace-normal text-sm leading-relaxed" key={item.id}>* {scheduleText(item)}</p>) : <p className="text-sm text-[#69736d]">예약일정 없음</p>}
            </div>
        </OverlayModal>
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
    if (!q) return vehicles;
    return vehicles
      .filter((vehicle) => {
        const plate = vehicle.plateNumber || "";
        const model = (vehicle.model || "").toLowerCase();
        return plate.includes(q) || plate.slice(-4).includes(q) || model.includes(q);
      });
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
        <div className="absolute z-40 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-[#d8ded8] bg-white shadow-xl">
          {results.length ? (
            results.map((vehicle) => (
              <button
                className="flex min-h-12 w-full items-center justify-between gap-3 px-3 text-left hover:bg-[#eef5ef]"
                key={vehicle.id}
                type="button"
                onClick={() => {
                  setQuery(`${vehicle.plateNumber} · ${vehicle.model}`);
                  onChange(vehicle);
                  setOpen(false);
                }}
              >
                <span className="font-black">{vehicle.plateNumber}</span>
                <span className="truncate text-sm text-[#68746d]">{vehicle.model}</span>
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
    <section className="mx-auto w-full max-w-2xl space-y-3">
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

function PushPermissionButton() {
  const [status, setStatus] = useState("");
  const [permission, setPermission] = useState<string>("default");

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  if (permission === "granted") return null;

  async function requestPermission() {
    if (!("Notification" in window)) {
      setStatus("알림 미지원");
      return;
    }

    const permission = await Notification.requestPermission();
    setPermission(permission);
    if (permission !== "granted") {
      setStatus("알림 차단됨");
      return;
    }

    try {
      const registration = await navigator.serviceWorker?.ready;
      let subscription = await registration?.pushManager?.getSubscription();
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || await fetchVapidPublicKey();
      if (!subscription && registration?.pushManager && vapidPublicKey) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }
      if (subscription) {
        await sendJson("/api/push/subscribe", { subscription, userLabel: "field" });
      } else {
        setStatus("VAPID 설정 필요");
        return;
      }
      setStatus("알림 허용됨");
      setPermission("granted");
    } catch (error) {
      console.error("push subscribe failed", error);
      setStatus("알림 등록 실패");
    }
  }

  return (
    <button className="quick-btn h-11 min-h-11 w-11 min-w-11 px-0 sm:w-auto sm:px-3" type="button" onClick={requestPermission} title={status || "알림 권한"} aria-label="알림 권한">
      <Bell size={16} />
      <span className="hidden sm:inline">알림</span>
    </button>
  );
}

async function fetchVapidPublicKey() {
  try {
    const response = await fetch("/api/push/subscribe", { cache: "no-store" });
    if (!response.ok) return "";
    const data = await response.json() as { publicKey?: string };
    return data.publicKey || "";
  } catch {
    return "";
  }
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replaceAll("-", "+").replaceAll("_", "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function ActionButton({ item }: { item: (typeof appActions)[number] }) {
  const Icon = item.icon;
  return (
    <Link className={`flex min-h-24 w-full flex-col items-center justify-center gap-2 rounded-lg border p-5 text-center shadow-sm ${item.primary ? "border-[#116149] bg-[#116149] text-white" : "border-[#dbe1db] bg-white text-[#16211d]"}`} href={item.href}>
      <span className="text-center text-xl font-black">{item.label}</span>
      {"emoji" in item ? <span className="text-3xl" aria-hidden="true">{item.emoji}</span> : <Icon size={28} />}
    </Link>
  );
}

function AdminNav() {
  const pathname = usePathname();
  const visibleItems = adminItems.filter((item) => item.href === "/admin/dispatches" || item.href === "/admin/vehicles");
  return (
    <nav className="flex w-full items-center justify-between gap-2 pb-2">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link className={`flex min-h-11 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-black ${active ? "border-[#116149] bg-[#116149] text-white" : "border-[#d8ded8] bg-white text-gray-700"}`} href={item.href} key={item.href}>
            <Icon size={16} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function DispatchForm({ vehicles, dispatches, onDispatches }: { vehicles: VehicleV2[]; dispatches: DispatchV2[]; onDispatches: ReloadHandler<DispatchV2> }) {
  const [vehicle, setVehicle] = useState<VehicleV2>();
  const [businessType, setBusinessType] = useState("보험");
  const [date, setDate] = useState(todayKorea());
  const [time, setTime] = useState(currentTimeKorea());
  const [recordId, setRecordId] = useState(() => createId("dispatch"));
  const [resetKey, setResetKey] = useState(0);
  return (
    <section className="space-y-4">
      <DataForm
        endpoint="/api/dispatches"
        buildPayload={(data) => ({
          id: recordId,
          date,
          time,
          rentalCarNumber: vehicle?.plateNumber || "",
          vehicleColor: vehicle?.color || "",
          businessType,
          corporateVehicle: data.get("corporateVehicle") === "on",
          customerName: text(data, "customerName") || text(data, "orderedBy") || businessType,
          customerPhone: text(data, "customerPhone"),
          customerCarModel: text(data, "customerCarModel"),
          orderedBy: text(data, "orderedBy"),
          repairShop: text(data, "repairShop"),
          fuelDisplay: text(data, "fuelDisplay"),
          fuelLevelText: text(data, "fuelDisplay"),
          notes: text(data, "notes"),
          memo: text(data, "notes"),
          status: businessType,
          isCompleted: false,
        })}
        afterSave={(payload) => vehicle ? sendJson(`/api/vehicles?plateNumber=${encodeURIComponent(vehicle.plateNumber)}`, {
          status: businessType,
          fuelDisplay: String(payload.fuelDisplay || ""),
          damageVehicle: String(payload.customerCarModel || ""),
          activeSummary: formatOrdererShop(payload.orderedBy || payload.customerName, payload.repairShop),
        }, "PATCH") : undefined}
        notify={(payload) => ({
          title: "새 배차 등록",
          body: `${payload.rentalCarNumber || ""} ${businessType} ${payload.customerCarModel || ""}\n${formatOrdererShop(payload.orderedBy || payload.customerName, payload.repairShop)}`.trim(),
          url: "/app/dispatch",
        })}
        reloadEndpoint="/api/dispatches"
        onReloaded={(items) => onDispatches(items as DispatchV2[])}
        afterReset={() => {
          setVehicle(undefined);
          setDate(todayKorea());
          setTime(currentTimeKorea());
          setRecordId(createId("dispatch"));
          setResetKey((key) => key + 1);
        }}
      >
        <Segmented value={businessType} values={["보험", "자차", "셀프"]} onChange={setBusinessType} />
        <FormBlock title="차량 선택">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem]">
            <VehicleSearchCombobox key={resetKey} vehicles={vehicles} onChange={setVehicle} />
            {businessType === "보험" ? (
              <label className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#cfd8d1] bg-white px-3 text-sm font-black">
                <input name="corporateVehicle" type="checkbox" />
                법인차량
              </label>
            ) : null}
          </div>
        </FormBlock>
        <DateTimeTodayField key={`dispatch-date-${resetKey}`} date={date} time={time} onDateChange={setDate} onTimeChange={setTime} />
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
        <PhotoUploadButton key={`dispatch-upload-${resetKey}`} recordId={recordId} recordType="dispatch" vehicleNumber={vehicle?.plateNumber || ""} />
      </DataForm>
      <DispatchBoard dispatches={dispatches} vehicles={vehicles} onDispatches={onDispatches} />
    </section>
  );
}

function ReturnForm({ vehicles, dispatches, returns, onReturns }: { vehicles: VehicleV2[]; dispatches: DispatchV2[]; returns: ReturnV2[]; onReturns: ReloadHandler<ReturnV2> }) {
  const [vehicle, setVehicle] = useState<VehicleV2>();
  const [date, setDate] = useState(todayKorea());
  const [time, setTime] = useState(currentTimeKorea());
  const [recordId, setRecordId] = useState(() => createId("return"));
  const [resetKey, setResetKey] = useState(0);
  const latest = vehicle ? latestByVehicle(dispatches, vehicle.plateNumber) : undefined;
  return (
    <section className="space-y-4">
    <DataForm
      endpoint="/api/returns"
      buildPayload={(data) => ({
        id: recordId,
        date,
        time,
        rentalCarNumber: vehicle?.plateNumber || "",
        vehicleColor: vehicle?.color || "",
        mileage: Number(text(data, "mileage") || 0),
        fuelDisplay: text(data, "fuelDisplay"),
        fuelLevelText: text(data, "fuelDisplay"),
        dispatchId: latest?.id || "",
        arrivalAddress: text(data, "location"),
        notes: text(data, "notes"),
        memo: text(data, "notes"),
        status: "회차등록",
        isCompleted: false,
      })}
      afterSave={(payload) => vehicle ? sendJson(`/api/vehicles?plateNumber=${encodeURIComponent(vehicle.plateNumber)}`, {
        status: "주차구역표시",
        location: String(payload.arrivalAddress || ""),
        fuelDisplay: String(payload.fuelDisplay || ""),
        activeSummary: String(payload.arrivalAddress || ""),
        mileage: Number(payload.mileage || 0),
      }, "PATCH") : undefined}
      notify={(payload) => ({
        title: "새 회차 등록",
        body: `${payload.rentalCarNumber || ""} 회차\n주차구역: ${payload.arrivalAddress || ""}\n주유량: ${payload.fuelDisplay || ""}`.trim(),
        url: "/app/return",
      })}
      reloadEndpoint="/api/returns"
      onReloaded={(items) => onReturns(items as ReturnV2[])}
      afterReset={() => {
        setVehicle(undefined);
        setDate(todayKorea());
        setTime(currentTimeKorea());
        setRecordId(createId("return"));
        setResetKey((key) => key + 1);
      }}
    >
      <FormBlock title="차량 선택">
        <VehicleSearchCombobox key={resetKey} vehicles={vehicles} onChange={setVehicle} />
      </FormBlock>
      <DateTimeTodayField key={`return-date-${resetKey}`} date={date} time={time} onDateChange={setDate} onTimeChange={setTime} />
      <Input
        label="배차정보"
        value={formatLatestDispatchInfo(latest)}
        readOnly
        className="field min-h-12 truncate bg-[#f8faf7] text-[#16211d]"
      />
      <CompactRow>
        <Input name="mileage" label="회차키로수" type="number" />
        <div className="grid grid-cols-2 gap-2">
          <Input
            label="배차주유량"
            value={latest ? firstText(latest.fuelLevelText, latest.fuelDisplay) : ""}
            readOnly
            className="field min-h-12 bg-[#f8faf7] text-[#16211d]"
          />
          <Input name="fuelDisplay" label="회차시주유량" placeholder="7/12" />
        </div>
        <Input name="location" label="주차구역" list="parking-locations" />
      </CompactRow>
      <Textarea name="notes" label="특이사항" />
      <PhotoUploadButton key={`return-upload-${resetKey}`} recordId={recordId} recordType="return" vehicleNumber={vehicle?.plateNumber || ""} />
      <datalist id="parking-locations">{parkingLocations.map((location) => <option value={location} key={location} />)}</datalist>
    </DataForm>
    <ReturnBoard returns={returns} vehicles={vehicles} onReturns={onReturns} />
    </section>
  );
}

function ReservationForm({ reservations, onReservations }: { reservations: ReservationV2[]; onReservations: ReloadHandler<ReservationV2> }) {
  const [draft, setDraft] = useState("");
  const [recordId, setRecordId] = useState(() => createId("reservation"));
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const parsed = useMemo(() => parseReservationText(draft), [draft]);
  return (
    <section className="space-y-4">
      <CalendarSubscribeBox />
      <DataForm
        endpoint="/api/reservations"
        buttonLabel="예약일정 추가"
        buildPayload={(data) => ({
          id: recordId,
          date: text(data, "date") || parsed.date,
          time: parsed.time || "09:00",
          endTime: "",
          customerName: text(data, "customerName") || parsed.customerName || "예약",
          reservationText: text(data, "reservationText"),
          memo: text(data, "reservationText"),
          route: "예약",
          status: "예약",
        })}
        afterSave={async () => {
          if (!pendingFiles.length) return;
          setUploadProgress({ completed: 0, total: pendingFiles.length, failed: 0, label: uploadProgressLabel(pendingFiles) });
          const result = await uploadSelectedFiles(pendingFiles, { recordType: "reservation", recordId, vehicleNumber: "" }, setUploadProgress);
          setUploadProgress({
            completed: result.success,
            total: pendingFiles.length,
            failed: result.failed,
            label: uploadProgressLabel(pendingFiles),
            done: true,
          });
        }}
        reloadEndpoint="/api/reservations"
        onReloaded={(items) => onReservations(items as ReservationV2[])}
        afterReset={() => {
          setDraft("");
          setPendingFiles([]);
          setRecordId(createId("reservation"));
          setResetKey((key) => key + 1);
          setTimeout(() => setUploadProgress(null), 3000);
        }}
        notify={(payload) => ({
          title: "새 예약 등록",
          body: String(payload.reservationText || payload.customerName || ""),
          url: "/app/reservation",
        })}
      >
        <Input
          name="reservationText"
          label="예약내용"
          placeholder="6월20일 홍길동 쏘나타 대차"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          required
        />
        <div className="grid grid-cols-2 gap-2 min-[360px]:grid-cols-2">
          <Input key={parsed.date} name="date" label="날짜 선택" type="date" defaultValue={parsed.date} required />
          <Input key={parsed.customerName} name="customerName" label="예약자명" defaultValue={parsed.customerName} />
        </div>
        <PendingPhotoPicker key={`reservation-upload-${resetKey}`} files={pendingFiles} onFiles={setPendingFiles} progress={uploadProgress} />
      </DataForm>
      <ReservationList reservations={reservations} onReservations={onReservations} />
    </section>
  );
}

function IncidentForm({
  vehicles,
  accidents,
  maintenance,
  onAccidents,
  onMaintenance,
}: {
  vehicles: VehicleV2[];
  accidents: IncidentRecordV2[];
  maintenance: IncidentRecordV2[];
  onAccidents: ReloadHandler<IncidentRecordV2>;
  onMaintenance: ReloadHandler<IncidentRecordV2>;
}) {
  const [vehicle, setVehicle] = useState<VehicleV2>();
  const [type, setType] = useState("사고");
  const [recordId, setRecordId] = useState(() => createId("accident"));
  const [resetKey, setResetKey] = useState(0);

  function changeType(nextType: string) {
    setType(nextType);
    setRecordId(createId(nextType === "사고" ? "accident" : "maintenance"));
  }

  return (
    <section className="space-y-4">
      <DataForm
        endpoint={type === "사고" ? "/api/accident-histories" : "/api/maintenance-histories"}
        buildPayload={(data) => ({
          id: recordId,
          plateNumber: vehicle?.plateNumber || "",
          accidentPart: text(data, "content"),
          title: text(data, "content"),
          description: text(data, "notes"),
          insuranceNumber: "",
          repairShopName: "",
          foundDate: text(data, "recordDate") || todayKorea(),
          accidentDate: text(data, "recordDate") || todayKorea(),
          status: "접수",
          maintenanceType: type === "정비" ? text(data, "content") : "기타",
          photos: [],
          videos: [],
          documents: [],
          memo: text(data, "notes"),
          createdBy: "field",
          isCompleted: false,
        })}
        reloadEndpoint={type === "사고" ? "/api/accident-histories" : "/api/maintenance-histories"}
        onReloaded={(items) => type === "사고" ? onAccidents(items as IncidentRecordV2[]) : onMaintenance(items as IncidentRecordV2[])}
        afterReset={() => {
          setVehicle(undefined);
          setRecordId(createId(type === "사고" ? "accident" : "maintenance"));
          setResetKey((key) => key + 1);
        }}
        notify={(payload) => ({
          title: type === "사고" ? "새 사고 기록" : "새 정비 기록",
          body: `${payload.plateNumber || ""} ${payload.accidentPart || payload.title || ""}`.trim(),
          url: "/app/incident",
        })}
      >
        <Segmented value={type} values={["사고", "정비"]} onChange={changeType} />
        <FormBlock title="차량 선택">
          <VehicleSearchCombobox key={resetKey} vehicles={vehicles} onChange={setVehicle} />
        </FormBlock>
        <Input name="content" label={type === "사고" ? "사고부위" : "정비내용"} required />
        <Textarea name="notes" label="특이사항" />
        <Input name="recordDate" label="날짜" type="date" defaultValue={todayKorea()} />
        <PhotoUploadButton key={`incident-upload-${resetKey}`} recordId={recordId} recordType={type === "사고" ? "accident" : "maintenance"} vehicleNumber={vehicle?.plateNumber || ""} />
      </DataForm>
      <IncidentBoard accidents={accidents} maintenance={maintenance} onAccidents={onAccidents} onMaintenance={onMaintenance} />
    </section>
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

function LostItemForm({ vehicles, lostItems, onLostItems }: { vehicles: VehicleV2[]; lostItems: LostItemV2[]; onLostItems: ReloadHandler<LostItemV2> }) {
  const [vehicle, setVehicle] = useState<VehicleV2>();
  const [recordId, setRecordId] = useState(() => createId("lost"));
  const [resetKey, setResetKey] = useState(0);
  return (
    <section className="space-y-4">
      <DataForm endpoint="/api/lost-items" buildPayload={(data) => ({
        id: recordId,
        vehicleNumber: vehicle?.plateNumber || "",
        itemName: text(data, "customerName") || "분실물",
        customerName: text(data, "customerName"),
        memo: text(data, "notes"),
        foundDate: text(data, "foundDate"),
        status: "보관중",
        isCompleted: false,
      })}
      reloadEndpoint="/api/lost-items"
      onReloaded={(items) => onLostItems(items as LostItemV2[])}
      afterReset={() => {
        setVehicle(undefined);
        setRecordId(createId("lost"));
        setResetKey((key) => key + 1);
      }}
      notify={(payload) => ({
        title: "새 분실물 등록",
        body: `${payload.vehicleNumber || ""} ${payload.customerName || payload.memo || ""}`.trim(),
        url: "/app/lost-items",
      })}
      >
        <FormBlock title="차량 선택">
          <VehicleSearchCombobox key={resetKey} vehicles={vehicles} onChange={setVehicle} />
        </FormBlock>
        <CompactRow>
          <Input name="customerName" label="고객명" />
          <Input name="notes" label="특이사항" />
          <Input name="foundDate" label="날짜" type="date" defaultValue={todayKorea()} />
        </CompactRow>
        <PhotoUploadButton key={`lost-upload-${resetKey}`} recordId={recordId} recordType="lost_item" vehicleNumber={vehicle?.plateNumber || ""} />
      </DataForm>
      <LostItemBoard items={lostItems} onLostItems={onLostItems} />
    </section>
  );
}

type PhotoArchiveFolder = {
  key: string;
  folderName: string;
  kind: string;
  vehicleNumber: string;
  businessDate?: string;
  businessTime?: string;
  newestUpload: number;
  sortValue: number;
  files: UploadedFileV2[];
};

const thumbnailMemoryCache = new Set<string>();

type UploadProgressState = {
  completed: number;
  total: number;
  failed: number;
  label: string;
  done?: boolean;
};

function PhotosPage({ admin }: { admin: boolean }) {
  const [files, setFiles] = useState<UploadedFileV2[]>([]);
  const [query, setQuery] = useState("");
  const [selectedFolderKey, setSelectedFolderKey] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchJson<UploadedFileV2[]>("/api/uploaded-files", []).then(setFiles);
  }, []);

  const folders = useMemo(() => buildPhotoArchiveFolders(files), [files]);
  const queryText = query.toLowerCase();
  const filteredFolders = folders
    .map((folder) => ({
      ...folder,
      files: folder.files.filter((file) => {
        const haystack = `${folder.folderName} ${folder.vehicleNumber} ${folder.kind} ${fileName(file)} ${file.vehicleNumber || ""} ${file.insuranceNumber || ""} ${file.customerName || ""}`.toLowerCase();
        const matchesQuery = haystack.includes(queryText);
        return matchesQuery;
      }),
    }))
    .filter((folder) => folder.files.length > 0);
  const selectedFolder = folders.find((folder) => folder.key === selectedFolderKey) || null;

  useEffect(() => {
    prefetchThumbnailUrls(filteredFolders.map(folderCoverThumbnailUrl).filter(Boolean));
  }, [filteredFolders]);

  if (selectedFolder) {
    const sortedFiles = [...selectedFolder.files].sort((a, b) => fileUploadedTime(a) - fileUploadedTime(b));
    prefetchThumbnailUrls(sortedFiles.map(fileThumbnailUrl).filter(Boolean));
    return (
      <section className="space-y-4">
        <div className="panel">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <button className="small-btn" type="button" onClick={() => { setSelectedIndex(null); setSelectedFolderKey(null); }}>뒤로가기</button>
            <div className="min-w-0 text-right">
              <h2 className="truncate text-lg font-black">{selectedFolder.folderName}</h2>
              <p className="text-sm font-bold text-[#68746d]">총 {sortedFiles.length}개</p>
            </div>
          </div>
          {sortedFiles.length ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {sortedFiles.map((file, index) => (
                <button className="aspect-square overflow-hidden rounded-lg border border-[#d8ded8] bg-[#f3f5f2]" key={`${file.id}-${fileName(file)}`} type="button" onClick={() => setSelectedIndex(index)}>
                  {isImageFile(file) ? (
                    <img alt={fileName(file)} className="h-full w-full object-cover" src={fileThumbnailUrl(file)} />
                  ) : isVideoFile(file) ? (
                    <video className="h-full w-full object-cover" muted src={fileUrl(file)} />
                  ) : (
                    <span className="grid h-full place-items-center p-2 text-xs font-black text-[#68746d]">{fileName(file)}</span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="py-12 text-center text-sm font-bold text-[#68746d]">업로드된 사진이 없습니다.</p>
          )}
        </div>
        {selectedIndex !== null ? (
          <OverlayModal onClose={() => setSelectedIndex(null)} panelClassName="h-[90vh] w-[95vw] max-w-5xl overflow-hidden rounded-2xl bg-white p-4 shadow-2xl">
            <PhotoDetailView currentIndex={selectedIndex} files={sortedFiles} onBack={() => setSelectedIndex(null)} onIndexChange={setSelectedIndex} />
          </OverlayModal>
        ) : null}
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <FilterBar query={query} onQuery={setQuery} placeholder="차량번호, 보험접수번호, 고객명, 파일명 검색" />
      <p className="rounded-lg border border-[#d8ded8] bg-white px-4 py-3 text-sm font-black text-[#667269]">
        파일 보관기간은 업로드 후 60일이며, 이후 자동삭제 됩니다.
      </p>
      <ThumbnailBackfillButton />
      {admin ? <p className="text-sm font-bold text-[#667269]">관리자 필터: R2/Drive 백업 상태까지 함께 확인합니다.</p> : null}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filteredFolders.map((folder) => {
          const photoCount = folder.files.filter((file) => !isVideoFile(file)).length;
          const videoCount = folder.files.filter(isVideoFile).length;
          const coverUrl = folderCoverThumbnailUrl(folder);
          return (
            <button className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 rounded-lg border border-[#d9dfd8] bg-white p-3 text-left shadow-sm hover:bg-[#f5f7f4]" key={folder.key} type="button" onClick={() => setSelectedFolderKey(folder.key)}>
              <div className="aspect-square overflow-hidden rounded-lg bg-[#eef1ed]">
                {coverUrl ? <img alt="" className="h-full w-full object-cover" src={coverUrl} /> : <span className="grid h-full place-items-center text-xl">📁</span>}
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-black">📁 {folder.folderName}</p>
                <div className="mt-2 grid gap-1 text-sm font-bold text-[#68746d]">
                  <p>{folder.vehicleNumber || "차량번호 없음"} · {folder.kind}</p>
                  <p>{folderFileSummary(photoCount, videoCount)}</p>
                  <p>최근 업로드 {formatDateTime(new Date(folder.newestUpload).toISOString())}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {!files.length ? <EmptyState text="업로드된 사진이 없습니다." /> : null}
      {files.length && !filteredFolders.length ? <EmptyState text="검색 결과가 없습니다." /> : null}
    </section>
  );
}

function buildPhotoArchiveFolders(files: UploadedFileV2[]) {
  const folders = new Map<string, PhotoArchiveFolder>();
  const legacyFiles: UploadedFileV2[] = [];

  for (const file of files) {
    const recordType = clean(file.recordType);
    const recordId = clean(file.recordId);

    if (!recordId) {
      legacyFiles.push(file);
      continue;
    }

    addFileToPhotoFolder(folders, `${recordType || "unknown"}:${recordId}`, file);
  }

  const sortedLegacyFiles = [...legacyFiles].sort((a, b) => {
    const typeCompare = clean(a.recordType).localeCompare(clean(b.recordType));
    if (typeCompare) return typeCompare;
    const vehicleCompare = clean(a.vehicleNumber).localeCompare(clean(b.vehicleNumber));
    if (vehicleCompare) return vehicleCompare;
    return fileUploadedTime(a) - fileUploadedTime(b);
  });
  let lastLegacyType = "";
  let lastLegacyVehicle = "";
  let lastLegacyTime = 0;
  let lastLegacyKey = "";
  let legacyGroupIndex = 0;

  for (const file of sortedLegacyFiles) {
    const recordType = clean(file.recordType) || "unknown";
    const vehicleNumber = clean(file.vehicleNumber) || "unknown";
    const uploadedAt = fileUploadedTime(file);
    const canMerge =
      recordType === lastLegacyType &&
      vehicleNumber === lastLegacyVehicle &&
      uploadedAt - lastLegacyTime <= 5 * 60 * 1000;
    const key = canMerge ? lastLegacyKey : `legacy:${recordType}:${vehicleNumber}:${legacyGroupIndex++}`;

    addFileToPhotoFolder(folders, key, file);
    lastLegacyType = recordType;
    lastLegacyVehicle = vehicleNumber;
    lastLegacyTime = uploadedAt;
    lastLegacyKey = key;
  }

  return [...folders.values()].sort((a, b) => {
    if (b.sortValue !== a.sortValue) return b.sortValue - a.sortValue;
    return b.newestUpload - a.newestUpload;
  });
}

function ThumbnailBackfillButton() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ processed: number; created: number; skipped: number; remaining: number } | null>(null);
  const [error, setError] = useState("");

  async function runBackfill() {
    setRunning(true);
    setError("");
    try {
      const response = await fetch("/api/uploads/backfill-thumbnails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchSize: 20 }),
      });
      const data = await response.json() as { processed: number; created: number; skipped: number; remaining: number; error?: string };
      if (!response.ok) throw new Error(data.error || "thumbnail backfill failed");
      setResult(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="rounded-lg border border-[#d8ded8] bg-white px-4 py-3">
      <button className="small-btn" type="button" disabled={running} onClick={runBackfill}>
        {running ? "생성 중" : "기존 사진 썸네일 생성"}
      </button>
      {result ? (
        <p className="mt-2 text-sm font-bold text-[#667269]">
          총 {result.processed}개 중 {result.created}개 생성 완료, {result.skipped}개 제외 · 남은 {result.remaining}개
        </p>
      ) : null}
      {error ? <p className="mt-2 text-sm font-bold text-red-700">{error}</p> : null}
    </div>
  );
}

function addFileToPhotoFolder(folders: Map<string, PhotoArchiveFolder>, key: string, file: UploadedFileV2) {
  const recordType = clean(file.recordType);
  const vehicleNumber = clean(file.vehicleNumber);
  const kind = clean(file.businessKind) || photoRecordKind(recordType);
  const reservationLabel = recordType === "reservation" ? clean((file as UploadedFileV2 & { businessLabel?: string }).businessLabel || file.customerName || fileName(file)) : "";
  const businessDate = clean(file.businessDate) || undefined;
  const businessTime = clean(file.businessTime) || undefined;
  const folderName = recordType === "reservation"
    ? [kind, reservationLabel].filter(Boolean).join(" ") || "예약"
    : [kind, vehicleNumber].filter(Boolean).join(" ") || "사진";
  const uploadedAt = fileUploadedTime(file);
  const existing = folders.get(key);

  if (existing) {
    existing.files.push(file);
    existing.newestUpload = Math.max(existing.newestUpload, uploadedAt);
    existing.sortValue = Math.max(existing.sortValue, uploadedAt);
    return;
  }

  folders.set(key, {
    key,
    folderName,
    kind,
    vehicleNumber,
    businessDate,
    businessTime,
    newestUpload: uploadedAt,
    sortValue: uploadedAt,
    files: [file],
  });
}

function photoRecordKind(recordType: string) {
  if (recordType === "dispatch") return "배차";
  if (recordType === "return") return "회차";
  if (recordType === "accident") return "사고";
  if (recordType === "maintenance") return "정비";
  if (recordType === "lost_item") return "분실물";
  if (recordType === "reservation") return "예약";
  return "사진";
}

function fileUploadedTime(file: UploadedFileV2) {
  const value = new Date(file.uploadedAt || file.createdAt || 0).getTime();
  return Number.isFinite(value) ? value : 0;
}

function PartnersPage() {
  return (
    <RepairShopMapPage
      title="거래처주소"
      subtitle="지도에 표시되어 있는 좌표는 네이버지도 및 카카오지도가 더 정확합니다. 현재 지도는 참고용으로만 확인해주세요."
      showImportLink={false}
      embedded
    />
  );
}

function LegacyPartnersPage() {
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
    <section className="panel space-y-4">
      <CalendarSubscribeBox />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Object.keys(grouped).sort().map((date) => (
          <article className="rounded-lg border border-[#d8ded8] bg-white p-4" key={date}>
            <h2 className="mb-2 text-lg font-black">{formatDateDot(date)}</h2>
            {grouped[date].map((item) => <p className="break-words whitespace-normal text-sm leading-relaxed" key={item.id}>* {scheduleText(item)}</p>)}
          </article>
        ))}
      </div>
    </section>
  );
}

function CalendarSubscribeBox() {
  const url = "https://rentflow-9yg.pages.dev/api/calendar.ics";
  const [toast, setToast] = useState("");

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      setToast("클립보드에 복사되었습니다.");
    } catch {
      setToast("복사에 실패했습니다.");
    }
    window.setTimeout(() => setToast(""), 2000);
  }

  return (
    <div className="relative rounded-lg border border-[#d8ded8] bg-white p-3">
      <button className="small-btn" type="button" onClick={copyUrl}>
        캘린더 구독 URL 복사
      </button>
      {toast ? <div className="fixed bottom-5 left-1/2 z-[10000] -translate-x-1/2 rounded-lg bg-[#16211d] px-4 py-3 text-sm font-black text-white shadow-2xl">{toast}</div> : null}
      <p className="mt-2 text-xs font-bold leading-relaxed text-[#68746d]">
        아이폰: 설정 &gt; 캘린더 &gt; 계정 &gt; 계정 추가 &gt; 기타 &gt; 구독 캘린더 추가 / 구글 캘린더: 다른 캘린더 + &gt; URL로 추가 / 네이버 캘린더: 외부 캘린더 URL 구독
      </p>
    </div>
  );
}

function Dashboard({ vehicles, reservations, dispatches, returns }: { vehicles: VehicleV2[]; reservations: ReservationV2[]; dispatches: DispatchV2[]; returns: ReturnV2[] }) {
  const today = todayKorea();
  const dashboardRows = buildVehicleDashboardRows(vehicles, dispatches, returns);
  const todayReservationsCount = reservations.filter((reservation) => normalizeReservationDate(reservation.date) === today).length;
  const kpis = [
    ["전체차량", vehicles.length],
    ["보험", dashboardRows.filter((row) => row.statusLabel === "보험").length],
    ["자차", dashboardRows.filter((row) => row.statusLabel === "자차").length],
    ["셀프", dashboardRows.filter((row) => row.statusLabel === "셀프").length],
    ["삼실", dashboardRows.filter((row) => row.statusLabel === "주차구역표시").length],
    ["오늘 배차", dispatches.filter((d) => d.createdAt?.startsWith(today)).length],
    ["오늘 회차", returns.filter((r) => r.createdAt?.startsWith(today)).length],
    ["오늘 예약일정", `${todayReservationsCount}건`],
  ];
  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map(([label, value]) => <Kpi label={String(label)} value={String(value)} key={String(label)} />)}
      </div>
      <VehicleStatusBoard rows={dashboardRows} />
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
          color: text(data, "color"),
          fuelType: text(data, "fuelType"),
          mileage: Number(text(data, "mileage") || 0),
          purchaseDate: text(data, "purchaseDate"),
          location: "",
          status: "주차구역표시",
          memo: text(data, "memo"),
        })}
        onSaved={(payload) => onVehicles([payload as VehicleV2, ...vehicles])}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Input name="plateNumber" label="차량번호" required />
          <Input name="model" label="차종" required />
          <Input name="color" label="색상" />
          <FuelTypeSelect />
          <Input name="mileage" label="총 키로수" type="number" />
          <Input name="purchaseDate" label="매입일" type="date" />
        </div>
        <Textarea name="memo" label="메모" />
      </DataForm>
      <section data-horizontal-scroll="true" className="panel overflow-x-auto">
        <h2 className="mb-3 text-xl font-black">차량현황</h2>
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b">
              <th>드래그</th><th>차량번호</th><th>차종</th><th>색상</th><th>유종</th><th>총 키로수</th><th>매입일</th><th>수정</th><th>삭제</th>
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
                <td>{vehicle.color}</td>
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

function ReservationAdmin({ reservations, onReservations }: { reservations: ReservationV2[]; onReservations: ReloadHandler<ReservationV2> }) {
  return <section className="space-y-4"><ReservationForm reservations={reservations} onReservations={onReservations} /><CalendarPage reservations={reservations} /></section>;
}

function DispatchAdmin({
  dispatches,
  returns,
  vehicles,
  onDispatches,
  onReturns,
}: {
  dispatches: DispatchV2[];
  returns: ReturnV2[];
  vehicles: VehicleV2[];
  onDispatches: ReloadHandler<DispatchV2>;
  onReturns: ReloadHandler<ReturnV2>;
}) {
  const [filter, setFilter] = useState("전체");
  const [page, setPage] = useState(1);
  const [memo, setMemo] = useState("");
  const rows = [
    ...dispatches.map((item) => ({ kind: "배차" as const, id: item.id, createdAt: item.createdAt, completed: !!item.isCompleted, dispatch: item })),
    ...returns.map((item) => ({ kind: "회차" as const, id: item.id, createdAt: item.createdAt, completed: !!item.isCompleted, returnItem: item })),
  ].filter((row) => filter === "전체" || (filter === "미정리" ? !row.completed : row.completed))
    .sort((a, b) => sortDateCreatedValues(rowDate(b), rowTime(b), b.createdAt, rowDate(a), rowTime(a), a.createdAt));

  async function toggle(row: typeof rows[number], checked: boolean) {
    if (row.kind === "배차") {
      await sendJson(`/api/dispatches?id=${encodeURIComponent(row.id)}`, { isCompleted: checked }, "PATCH");
      await onDispatches();
      return;
    }
    await sendJson(`/api/returns?id=${encodeURIComponent(row.id)}`, { isCompleted: checked }, "PATCH");
    await onReturns();
  }

  return (
    <section className="panel space-y-3 overflow-hidden">
      <div className="sticky top-0 z-10 rounded-lg bg-[#eef4ed] p-1.5">
        <Segmented value={filter} values={["전체", "미정리", "정리완료"]} onChange={setFilter} />
      </div>
      <div data-horizontal-scroll="true" className="w-full overflow-x-auto">
        <table className="w-full min-w-[1680px] table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[80px]" />
            {dispatchBoardColumns.slice(0, 3).map((column) => <col className={column.width} key={column.label} />)}
            <col className="w-[80px]" />
            {dispatchBoardColumns.slice(3, 10).map((column) => <col className={column.width} key={column.label} />)}
            <col className="w-[120px]" />
          </colgroup>
          <thead><tr className="border-b"><th>정리완료</th><th>날짜</th><th>차량번호</th><th>구분</th><th>상태</th><th>차종/색상</th><th>오더자</th><th>고객차종</th><th>주유량</th><th>수리처</th><th>연락처</th><th>메모</th><th>접수번호/면허정보</th></tr></thead>
          <tbody>{paginate(rows, page).map((row) => {
            const dispatch = row.kind === "배차" ? row.dispatch : undefined;
            const ret = row.kind === "회차" ? row.returnItem : undefined;
            const plate = dispatch?.rentalCarNumber || ret?.rentalCarNumber || "";
            const vehicle = findVehicle(vehicles, plate);
            const linkedDispatch = dispatch || findLinkedDispatchForReturn(ret, dispatches);
            const status = dispatch ? dispatchAdminDispatchStatus(dispatch) : dispatchAdminReturnStatus(ret, dispatches);
            return (
              <tr className="border-b" key={`${row.kind}-${row.id}`}>
                <td className="h-11 whitespace-nowrap"><input type="checkbox" checked={row.completed} onChange={(event) => toggle(row, event.target.checked)} /></td>
                <TruncatedCell value={formatBoardDateTime(dispatch?.date || ret?.date, dispatch?.time || ret?.time, dispatch?.createdAt || ret?.createdAt)} />
                <TruncatedCell className="font-black" value={plate} />
                <TruncatedCell value={row.kind} />
                <td className="h-11 whitespace-nowrap"><DispatchAdminStatusPill status={status} /></td>
                <TruncatedCell value={vehicleModelColor(vehicle)} />
                <TruncatedCell value={clean(linkedDispatch?.orderedBy || linkedDispatch?.customerName)} />
                <TruncatedCell value={clean(linkedDispatch?.customerCarModel)} />
                <TruncatedCell value={clean(dispatch?.fuelDisplay || ret?.fuelDisplay)} />
                <TruncatedCell value={clean(linkedDispatch?.repairShop)} />
                <td className="h-11 whitespace-nowrap px-1 align-middle"><PhoneCell phone={dispatchPhone(linkedDispatch)} /></td>
                <MemoCell value={ret?.notes || linkedDispatch?.notes || dispatch?.notes} onOpen={setMemo} />
                <td className="h-11 whitespace-nowrap">
                  <PhotoGalleryButton
                    date={dispatch?.date || ret?.date}
                    kind={row.kind}
                    recordId={row.id}
                    recordType={row.kind === "배차" ? "dispatch" : "return"}
                    time={dispatch?.time || ret?.time}
                    vehicleNumber={plate}
                  />
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      <Pagination page={page} totalItems={rows.length} onPageChange={setPage} />
      {memo ? <MemoModal memo={memo} onClose={() => setMemo("")} /> : null}
    </section>
  );
}

function DispatchBoard({ dispatches, vehicles, onDispatches }: { dispatches: DispatchV2[]; vehicles: VehicleV2[]; onDispatches: ReloadHandler<DispatchV2> }) {
  const [editing, setEditing] = useState<DispatchV2 | null>(null);
  const [deleting, setDeleting] = useState<DispatchV2 | null>(null);
  const [memo, setMemo] = useState("");
  const [page, setPage] = useState(1);
  const rows = [...dispatches].sort(sortDateCreatedDesc);
  useEffect(() => {
    console.log("dispatch board items", dispatches.length);
  }, [dispatches.length]);
  return (
    <section className="panel w-full overflow-hidden">
      <h2 className="mb-3 text-xl font-black">배차 현황판</h2>
      <div data-horizontal-scroll="true" className="w-full overflow-x-auto [-webkit-overflow-scrolling:touch]">
        <table className="w-full min-w-[1640px] table-fixed text-left text-sm">
          <colgroup>
            {dispatchBoardColumns.map((column) => <col className={column.width} key={column.label} />)}
          </colgroup>
          <thead><tr className="border-b"><th>날짜</th><th>차량번호</th><th>구분</th><th>차종/색상</th><th>오더자</th><th>고객차종</th><th>주유량</th><th>수리처</th><th>연락처</th><th>메모</th><th>사진링크</th><th>사진추가업로드</th><th>수정</th><th>삭제</th></tr></thead>
          <tbody>{paginate(rows, page).map((item) => {
            const vehicle = findVehicle(vehicles, item.rentalCarNumber || "");
            return (
              <tr className="border-b" key={item.id}>
                <TruncatedCell value={formatBoardDateTime(item.date, item.time, item.createdAt)} />
                <TruncatedCell className="font-black" value={clean(item.rentalCarNumber)} />
                <td className="h-11 whitespace-nowrap px-1 align-middle"><DispatchTypeBadge status={clean(item.businessType || item.status)} /></td>
                <TruncatedCell value={vehicleModelColor(vehicle)} />
                <TruncatedCell value={clean(item.orderedBy || item.customerName)} />
                <TruncatedCell value={clean(item.customerCarModel)} />
                <TruncatedCell value={clean(item.fuelDisplay)} />
                <TruncatedCell value={clean(item.repairShop)} />
                <td className="h-11 whitespace-nowrap px-1 align-middle"><PhoneCell phone={dispatchPhone(item)} /></td>
                <MemoCell value={item.notes} onOpen={setMemo} />
                <td className="h-11 whitespace-nowrap">
                  <PhotoGalleryButton date={item.date} kind="배차" recordId={item.id} recordType="dispatch" time={item.time} vehicleNumber={item.rentalCarNumber || ""} />
                </td>
                <td className="h-11 whitespace-nowrap"><AdditionalUploadButton recordType="dispatch" recordId={item.id} vehicleNumber={item.rentalCarNumber || ""} /></td>
                <td className="h-11 whitespace-nowrap"><button className="small-btn" type="button" onClick={() => setEditing(item)}>수정</button></td>
                <td className="h-11 whitespace-nowrap"><button className="danger-btn" type="button" onClick={() => setDeleting(item)}><Trash2 size={16} /> 삭제</button></td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      <Pagination page={page} totalItems={rows.length} onPageChange={setPage} />
      {editing ? <DispatchEditModal dispatch={editing} vehicles={vehicles} onClose={() => setEditing(null)} onSaved={() => onDispatches()} /> : null}
      {deleting ? <GenericDeleteModal label={`${deleting.rentalCarNumber || ""} 배차`} onCancel={() => setDeleting(null)} onDelete={async () => {
        await fetch(`/api/dispatches?id=${encodeURIComponent(deleting.id)}`, { method: "DELETE" });
        await onDispatches();
        setDeleting(null);
      }} /> : null}
      {memo ? <MemoModal memo={memo} onClose={() => setMemo("")} /> : null}
    </section>
  );
}

function ReturnBoard({ returns, vehicles, onReturns }: { returns: ReturnV2[]; vehicles: VehicleV2[]; onReturns: ReloadHandler<ReturnV2> }) {
  const [editing, setEditing] = useState<ReturnV2 | null>(null);
  const [deleting, setDeleting] = useState<ReturnV2 | null>(null);
  const [page, setPage] = useState(1);
  const rows = [...returns].sort(sortDateCreatedDesc);
  useEffect(() => {
    console.log("return board items", returns.length);
  }, [returns.length]);
  return (
    <section className="panel w-full overflow-hidden">
      <h2 className="mb-3 text-xl font-black">회차 현황판</h2>
      <div data-horizontal-scroll="true" className="w-full overflow-x-auto [-webkit-overflow-scrolling:touch]">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead><tr className="border-b"><th>날짜</th><th>차량번호</th><th>구분</th><th>차종/색상</th><th>회차키로수</th><th>회차주유량</th><th>주차구역</th><th>메모</th><th>사진링크</th><th>사진추가업로드</th><th>수정</th><th>삭제</th></tr></thead>
          <tbody>{paginate(rows, page).map((item) => {
            const vehicle = findVehicle(vehicles, item.rentalCarNumber || "");
            return (
              <tr className="border-b" key={item.id}>
                <td>{formatBoardDateTime(item.date, item.time, item.createdAt)}</td>
                <td className="font-black">{clean(item.rentalCarNumber)}</td>
                <td>회차</td>
                <td>{vehicleModelColor(vehicle)}</td>
                <td>{clean(String(item.mileage || ""))}</td>
                <td>{clean(item.fuelDisplay)}</td>
                <td>{clean(item.parkingZone || item.arrivalAddress)}</td>
                <td>{clean(item.notes)}</td>
                <td><PhotoGalleryButton date={item.date} kind="회차" recordId={item.id} recordType="return" time={item.time} vehicleNumber={item.rentalCarNumber || ""} /></td>
                <td><AdditionalUploadButton recordType="return" recordId={item.id} vehicleNumber={item.rentalCarNumber || ""} /></td>
                <td><button className="small-btn" type="button" onClick={() => setEditing(item)}>수정</button></td>
                <td><button className="danger-btn" type="button" onClick={() => setDeleting(item)}><Trash2 size={16} /> 삭제</button></td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      <Pagination page={page} totalItems={rows.length} onPageChange={setPage} />
      {editing ? <ReturnEditModal record={editing} vehicles={vehicles} onClose={() => setEditing(null)} onSaved={() => onReturns()} /> : null}
      {deleting ? <GenericDeleteModal label={`${deleting.rentalCarNumber || ""} 회차`} onCancel={() => setDeleting(null)} onDelete={async () => {
        await fetch(`/api/returns?id=${encodeURIComponent(deleting.id)}`, { method: "DELETE" });
        await onReturns();
        setDeleting(null);
      }} /> : null}
    </section>
  );
}

function DispatchEditModal({ dispatch, vehicles, onClose, onSaved }: { dispatch: DispatchV2; vehicles: VehicleV2[]; onClose: () => void; onSaved: ReloadHandler<DispatchV2> }) {
  const [selected, setSelected] = useState<VehicleV2 | undefined>(findVehicle(vehicles, dispatch.rentalCarNumber || ""));
  const [date, setDate] = useState(dispatch.date || todayKorea());
  const [time, setTime] = useState(dispatch.time || currentTimeKorea());
  return (
    <ModalShell title="배차 수정" onClose={onClose}>
      <form onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const next = {
          ...dispatch,
          date,
          time,
          rentalCarNumber: selected?.plateNumber || dispatch.rentalCarNumber,
          vehicleColor: selected?.color || dispatch.vehicleColor || "",
          businessType: text(data, "businessType"),
          status: text(data, "businessType"),
          orderedBy: text(data, "orderedBy"),
          repairShop: text(data, "repairShop"),
          customerCarModel: text(data, "customerCarModel"),
          fuelDisplay: text(data, "fuelDisplay"),
          fuelLevelText: text(data, "fuelDisplay"),
          customerPhone: text(data, "customerPhone"),
          notes: text(data, "notes"),
          memo: text(data, "notes"),
          corporateVehicle: data.get("corporateVehicle") === "on",
        };
        await sendJson(`/api/dispatches?id=${encodeURIComponent(dispatch.id)}`, next, "PATCH");
        await onSaved();
        onClose();
      }} className="space-y-3">
        <FormBlock title="차량번호"><VehicleSearchCombobox vehicles={vehicles} value={dispatch.rentalCarNumber} onChange={setSelected} /></FormBlock>
        <DateTimeTodayField date={date} time={time} onDateChange={setDate} onTimeChange={setTime} />
        <label className="label">구분<select className="field min-h-12" name="businessType" defaultValue={dispatch.businessType || dispatch.status || "보험"}><option>보험</option><option>자차</option><option>셀프</option></select></label>
        <Input name="orderedBy" label="오더자" defaultValue={dispatch.orderedBy} />
        <Input name="repairShop" label="수리처" defaultValue={dispatch.repairShop} />
        <Input name="customerCarModel" label="고객차종" defaultValue={dispatch.customerCarModel} />
        <Input name="fuelDisplay" label="주유량" defaultValue={dispatch.fuelDisplay} />
        <Input name="customerPhone" label="고객연락처" defaultValue={dispatch.customerPhone} />
        <label className="flex min-h-12 items-center gap-2 font-black"><input name="corporateVehicle" type="checkbox" defaultChecked={dispatch.corporateVehicle} /> 법인차량</label>
        <Textarea name="notes" label="특이사항" defaultValue={dispatch.notes} />
        <button className="primary-btn w-full" type="submit">저장</button>
      </form>
    </ModalShell>
  );
}

function ReturnEditModal({ record, vehicles, onClose, onSaved }: { record: ReturnV2; vehicles: VehicleV2[]; onClose: () => void; onSaved: ReloadHandler<ReturnV2> }) {
  const [selected, setSelected] = useState<VehicleV2 | undefined>(findVehicle(vehicles, record.rentalCarNumber || ""));
  const [date, setDate] = useState(record.date || todayKorea());
  const [time, setTime] = useState(record.time || currentTimeKorea());
  return (
    <ModalShell title="회차 수정" onClose={onClose}>
      <form onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const next = {
          ...record,
          date,
          time,
          rentalCarNumber: selected?.plateNumber || record.rentalCarNumber,
          vehicleColor: selected?.color || record.vehicleColor || "",
          mileage: Number(text(data, "mileage") || 0),
          fuelDisplay: text(data, "fuelDisplay"),
          fuelLevelText: text(data, "fuelDisplay"),
          arrivalAddress: text(data, "arrivalAddress"),
          parkingZone: text(data, "arrivalAddress"),
          notes: text(data, "notes"),
          memo: text(data, "notes"),
        };
        await sendJson(`/api/returns?id=${encodeURIComponent(record.id)}`, next, "PATCH");
        await onSaved();
        onClose();
      }} className="space-y-3">
        <FormBlock title="차량번호"><VehicleSearchCombobox vehicles={vehicles} value={record.rentalCarNumber} onChange={setSelected} /></FormBlock>
        <DateTimeTodayField date={date} time={time} onDateChange={setDate} onTimeChange={setTime} />
        <Input name="mileage" label="회차키로수" type="number" defaultValue={record.mileage} />
        <Input name="fuelDisplay" label="회차주유량" defaultValue={record.fuelDisplay} />
        <Input name="arrivalAddress" label="주차구역" defaultValue={record.arrivalAddress} />
        <Textarea name="notes" label="특이사항" defaultValue={record.notes} />
        <button className="primary-btn w-full" type="submit">저장</button>
      </form>
    </ModalShell>
  );
}

function IncidentBoard({
  accidents,
  maintenance,
  onAccidents,
  onMaintenance,
}: {
  accidents: IncidentRecordV2[];
  maintenance: IncidentRecordV2[];
  onAccidents: ReloadHandler<IncidentRecordV2>;
  onMaintenance: ReloadHandler<IncidentRecordV2>;
}) {
  const [page, setPage] = useState(1);
  const rows = [
    ...accidents.map((item) => ({ type: "사고" as const, endpoint: "/api/accident-histories", item })),
    ...maintenance.map((item) => ({ type: "정비" as const, endpoint: "/api/maintenance-histories", item })),
  ].sort((a, b) => new Date((b.item.accidentDate || b.item.foundDate || b.item.createdAt || 0) as string).getTime() - new Date((a.item.accidentDate || a.item.foundDate || a.item.createdAt || 0) as string).getTime());
  async function toggle(row: typeof rows[number], checked: boolean) {
    await sendJson(`${row.endpoint}?id=${encodeURIComponent(row.item.id)}`, { isCompleted: checked }, "PATCH");
    if (row.type === "사고") await onAccidents();
    else await onMaintenance();
  }
  return (
    <section data-horizontal-scroll="true" className="panel overflow-x-auto">
      <h2 className="mb-3 text-xl font-black">사고/정비 현황판</h2>
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead><tr className="border-b"><th>작업완료</th><th>차량번호</th><th>사고부위 또는 정비내용</th><th>특이사항</th><th>날짜</th><th>사진촬영본 링크</th></tr></thead>
        <tbody>{paginate(rows, page).map((row) => {
          const content = row.type === "사고" ? row.item.accidentPart : row.item.title || row.item.maintenanceType;
          const date = row.type === "사고" ? row.item.accidentDate : row.item.foundDate;
          return <tr className="border-b" key={`${row.type}-${row.item.id}`}><td><input type="checkbox" checked={!!row.item.isCompleted} onChange={(event) => toggle(row, event.target.checked)} /></td><td className="font-black">{clean(row.item.plateNumber)}</td><td>{clean(content)}</td><td>{clean(row.item.memo || row.item.description)}</td><td>{clean(date)}</td><td><PhotoGalleryButton date={date} kind={row.type} recordId={row.item.id} recordType={row.type === "사고" ? "accident" : "maintenance"} vehicleNumber={row.item.plateNumber || ""} /></td></tr>;
        })}</tbody>
      </table>
      <Pagination page={page} totalItems={rows.length} onPageChange={setPage} />
    </section>
  );
}

function LostItemBoard({ items, onLostItems }: { items: LostItemV2[]; onLostItems: ReloadHandler<LostItemV2> }) {
  const [page, setPage] = useState(1);
  const rows = [...items].sort((a, b) => new Date(b.foundDate || b.createdAt || 0).getTime() - new Date(a.foundDate || a.createdAt || 0).getTime());
  async function toggle(id: string, checked: boolean) {
    await sendJson(`/api/lost-items?id=${encodeURIComponent(id)}`, { isCompleted: checked }, "PATCH");
    await onLostItems();
  }
  return (
    <section data-horizontal-scroll="true" className="panel overflow-x-auto">
      <h2 className="mb-3 text-xl font-black">분실물 현황판</h2>
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead><tr className="border-b"><th>해결</th><th>차량번호</th><th>고객명</th><th>특이사항</th><th>날짜</th><th>사진촬영본 링크</th></tr></thead>
        <tbody>{paginate(rows, page).map((item) => <tr className="border-b" key={item.id}><td><input type="checkbox" checked={!!item.isCompleted} onChange={(event) => toggle(item.id, event.target.checked)} /></td><td className="font-black">{clean(item.vehicleNumber)}</td><td>{clean(item.customerName)}</td><td>{clean(item.memo)}</td><td>{clean(item.foundDate)}</td><td><PhotoGalleryButton date={item.foundDate} kind="분실물" recordId={item.id} recordType="lost_item" vehicleNumber={item.vehicleNumber || ""} /></td></tr>)}</tbody>
      </table>
      <Pagination page={page} totalItems={rows.length} onPageChange={setPage} />
    </section>
  );
}

function PhotoGalleryButton({
  date,
  time,
  kind,
  recordType,
  recordId,
  vehicleNumber,
}: {
  date?: string;
  time?: string;
  kind: string;
  recordType: string;
  recordId: string;
  vehicleNumber?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="font-black text-[#116149]" type="button" onClick={() => setOpen(true)}>
        사진보기
      </button>
      {open ? (
        <PhotoFolderGalleryModal
          date={date}
          kind={kind}
          onClose={() => setOpen(false)}
          recordId={recordId}
          recordType={recordType}
          time={time}
          vehicleNumber={vehicleNumber}
        />
      ) : null}
    </>
  );
}

function PhotoFolderGalleryModal({
  date,
  time,
  kind,
  recordType,
  recordId,
  vehicleNumber,
  onClose,
}: {
  date?: string;
  time?: string;
  kind: string;
  recordType: string;
  recordId: string;
  vehicleNumber?: string;
  onClose: () => void;
}) {
  const [files, setFiles] = useState<UploadedFileV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const folderName = formatPhotoFolderName(date, time, kind, vehicleNumber);
  const sortedFiles = [...files].sort((a, b) => new Date(b.createdAt || b.uploadedAt || 0).getTime() - new Date(a.createdAt || a.uploadedAt || 0).getTime());
  const photoCount = sortedFiles.filter((file) => !isVideoFile(file)).length;
  const videoCount = sortedFiles.filter(isVideoFile).length;

  useEffect(() => {
    setLoading(true);
    fetchJson<UploadedFileV2[]>(`/api/uploads?recordType=${encodeURIComponent(recordType)}&recordId=${encodeURIComponent(recordId)}&vehicleNumber=${encodeURIComponent(vehicleNumber || "")}`, [])
      .then(setFiles)
      .finally(() => setLoading(false));
  }, [recordId, recordType, vehicleNumber]);

  useEffect(() => {
    prefetchThumbnailUrls(sortedFiles.map(fileThumbnailUrl).filter(Boolean));
  }, [sortedFiles]);

  return (
    <OverlayModal onClose={onClose} panelClassName="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-2xl bg-white p-4 shadow-2xl">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-lg font-black">사진촬영본</h2>
        <button className="small-btn" type="button" onClick={onClose}>닫기</button>
      </div>

      {selectedIndex !== null ? (
        <PhotoDetailView currentIndex={selectedIndex} files={sortedFiles} onBack={() => setSelectedIndex(null)} onIndexChange={setSelectedIndex} />
      ) : galleryOpen ? (
        <div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <button className="small-btn" type="button" onClick={() => setGalleryOpen(false)}>폴더 목록</button>
            <p className="truncate text-sm font-black">{folderName}</p>
          </div>
          {sortedFiles.length ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {sortedFiles.map((file, index) => (
                <button className="aspect-square overflow-hidden rounded-lg border border-[#d8ded8] bg-[#f3f5f2]" key={`${file.id}-${fileName(file)}`} type="button" onClick={() => setSelectedIndex(index)}>
                  {isImageFile(file) ? (
                    <img alt={fileName(file)} className="h-full w-full object-cover" src={fileThumbnailUrl(file)} />
                  ) : isVideoFile(file) ? (
                    <video className="h-full w-full object-cover" muted src={fileUrl(file)} />
                  ) : (
                    <span className="grid h-full place-items-center p-2 text-xs font-black text-[#68746d]">{fileName(file)}</span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="py-12 text-center text-sm font-bold text-[#68746d]">업로드된 사진이 없습니다.</p>
          )}
        </div>
      ) : (
        <div>
          {loading ? <p className="py-12 text-center text-sm font-bold text-[#68746d]">불러오는 중</p> : null}
          {!loading && !sortedFiles.length ? <p className="py-12 text-center text-sm font-bold text-[#68746d]">업로드된 사진이 없습니다.</p> : null}
          {!loading && sortedFiles.length ? (
            <button className="flex w-full items-center justify-between gap-3 rounded-lg border border-[#d8ded8] bg-white p-4 text-left hover:bg-[#f5f7f4]" type="button" onClick={() => setGalleryOpen(true)}>
              <div className="min-w-0">
                <p className="truncate text-base font-black">📁 {folderName}</p>
                <p className="mt-1 text-sm font-bold text-[#68746d]">{folderFileSummary(photoCount, videoCount)}</p>
              </div>
              <p className="shrink-0 text-xs font-bold text-[#68746d]">{formatPhotoBusinessDate(date, time)}</p>
            </button>
          ) : null}
        </div>
      )}
    </OverlayModal>
  );
}

function PhotoDetailView({
  files,
  currentIndex,
  onIndexChange,
  onBack,
}: {
  files: UploadedFileV2[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onBack: () => void;
}) {
  const file = files[currentIndex];
  const url = fileUrl(file);
  const [zoom, setZoom] = useState(1);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const pinchStartRef = useRef<{ distance: number; zoom: number } | null>(null);
  const canPrev = currentIndex > 0;
  const canNext = currentIndex < files.length - 1;
  const isVideo = isVideoFile(file);

  function goTo(index: number) {
    if (index < 0 || index >= files.length) return;
    setZoom(1);
    onIndexChange(index);
  }

  useEffect(() => {
    setZoom(1);
  }, [currentIndex]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        event.stopPropagation();
        if (canPrev) goTo(currentIndex - 1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        event.stopPropagation();
        if (canNext) goTo(currentIndex + 1);
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onBack();
      }
    }

    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [canNext, canPrev, currentIndex, onBack]);

  function zoomBy(delta: number) {
    setZoom((value) => Math.min(4, Math.max(1, value + delta)));
  }

  function touchDistance(touches: React.TouchList) {
    const first = touches[0];
    const second = touches[1];
    return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
  }

  return (
    <div
      className="flex h-full flex-col"
      onTouchStart={(event) => {
        if (event.touches.length === 2 && !isVideo) {
          pinchStartRef.current = { distance: touchDistance(event.touches), zoom };
          touchStartRef.current = null;
          return;
        }
        if (event.touches.length === 1) {
          const touch = event.touches[0];
          touchStartRef.current = { x: touch.clientX, y: touch.clientY };
          pinchStartRef.current = null;
        }
      }}
      onTouchMove={(event) => {
        if (event.touches.length === 2 && pinchStartRef.current && !isVideo) {
          const nextDistance = touchDistance(event.touches);
          const ratio = nextDistance / pinchStartRef.current.distance;
          setZoom(Math.min(4, Math.max(1, pinchStartRef.current.zoom * ratio)));
        }
      }}
      onTouchEnd={(event) => {
        if (pinchStartRef.current) {
          pinchStartRef.current = null;
          return;
        }
        if (!touchStartRef.current || event.changedTouches.length === 0) return;
        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - touchStartRef.current.x;
        const deltaY = touch.clientY - touchStartRef.current.y;
        touchStartRef.current = null;
        if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
          if (deltaX < 0 && canNext) goTo(currentIndex + 1);
          if (deltaX > 0 && canPrev) goTo(currentIndex - 1);
        }
      }}
    >
      <div className="mb-3 grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <button className="small-btn" type="button" onClick={onBack}>닫기</button>
        <p className="text-center text-sm font-black">{currentIndex + 1} / {files.length}</p>
        {url ? <a className="small-btn" download={fileName(file)} href={url} target="_blank">다운로드</a> : null}
      </div>
      {!isVideo ? (
        <div className="mb-3 flex items-center justify-center gap-2">
          <button className="small-btn" disabled={zoom <= 1} type="button" onClick={() => zoomBy(-0.5)}>-</button>
          <button className="small-btn min-w-14" type="button" onClick={() => setZoom(1)}>{zoom.toFixed(zoom % 1 === 0 ? 0 : 1)}x</button>
          <button className="small-btn" disabled={zoom >= 4} type="button" onClick={() => zoomBy(0.5)}>+</button>
        </div>
      ) : null}
      <div className="relative grid min-h-0 flex-1 place-items-center overflow-auto rounded-lg bg-[#111] p-2">
        <button
          className="absolute left-2 top-1/2 z-10 h-11 w-11 -translate-y-1/2 rounded-full bg-white/80 text-xl font-black shadow disabled:opacity-40"
          disabled={!canPrev}
          type="button"
          onClick={() => goTo(currentIndex - 1)}
          aria-label="이전 사진"
        >
          ←
        </button>
        <button
          className="absolute right-2 top-1/2 z-10 h-11 w-11 -translate-y-1/2 rounded-full bg-white/80 text-xl font-black shadow disabled:opacity-40"
          disabled={!canNext}
          type="button"
          onClick={() => goTo(currentIndex + 1)}
          aria-label="다음 사진"
        >
          →
        </button>
        {isVideo ? (
          <video className="max-h-[72vh] max-w-full" controls src={url} />
        ) : isImageFile(file) ? (
          <img
            alt={fileName(file)}
            className="max-h-[72vh] max-w-full object-contain transition-transform"
            src={url}
            style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
          />
        ) : (
          <a className="font-black text-white underline" href={url} target="_blank">{fileName(file)}</a>
        )}
      </div>
    </div>
  );
}

function GenericDeleteModal({ label, onCancel, onDelete }: { label: string; onCancel: () => void; onDelete: () => void | Promise<void> }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-4 shadow-2xl">
        <h2 className="text-xl font-black">정말 삭제하시겠습니까?</h2>
        <p className="mt-2 text-sm font-bold text-[#68746d]">{label}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button className="small-btn" type="button" onClick={onCancel}>취소</button>
          <button className="danger-btn" type="button" onClick={onDelete}>삭제</button>
        </div>
      </div>
    </div>
  );
}

function ModalShell({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/30 p-0 sm:place-items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-auto rounded-t-lg bg-white p-4 shadow-2xl sm:max-w-xl sm:rounded-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black">{title}</h2>
          <button className="small-btn" type="button" onClick={onClose}>닫기</button>
        </div>
        {children}
      </div>
    </div>
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

type VehicleDashboardRow = {
  key: string;
  vehicleNumber: string;
  model: string;
  statusLabel: string;
  dispatchDate: string;
  fuelLevelText: string;
  customerCarModel: string;
  ordererRepairShop: string;
  updatedAt?: string;
};

function VehicleStatusBoard({ rows }: { rows: VehicleDashboardRow[] }) {
  return (
    <section data-horizontal-scroll="true" className="panel overflow-x-auto">
      <h2 className="mb-3 text-xl font-black">차량현황</h2>
      <table className="w-full min-w-[960px] text-left text-sm">
        <thead><tr className="border-b"><th>차량번호</th><th>차종</th><th>상태</th><th>배차날짜</th><th>주유량</th><th>피해차량</th><th>오더자/수리처</th><th>최근 업데이트</th></tr></thead>
        <tbody>{rows.map((row) => (
          <tr className="border-b" key={row.key}>
            <td className="font-black">{row.vehicleNumber}</td>
            <td>{row.model}</td>
            <td><StatusPill status={row.statusLabel} /></td>
            <td className="whitespace-nowrap">{row.dispatchDate}</td>
            <td>{row.fuelLevelText || "-"}</td>
            <td>{row.customerCarModel || "-"}</td>
            <td>{row.ordererRepairShop || "-"}</td>
            <td className="whitespace-nowrap">{formatDateTime(row.updatedAt)}</td>
          </tr>
        ))}</tbody>
      </table>
    </section>
  );
}

function VehicleEditModal({ vehicle, onClose, onSaved }: { vehicle: VehicleV2; onClose: () => void; onSaved: (vehicle: VehicleV2) => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/30 p-0 sm:place-items-center sm:p-4">
      <form
        className="max-h-[92vh] w-full overflow-auto rounded-t-lg bg-white p-4 shadow-2xl sm:max-w-xl sm:rounded-lg"
        onSubmit={async (event) => {
          event.preventDefault();
          if (saving) return;
          setSaving(true);
          setError("");
          const data = new FormData(event.currentTarget);
          const next = {
            ...vehicle,
            plateNumber: text(data, "plateNumber"),
            model: text(data, "model"),
            color: text(data, "color"),
            fuelType: text(data, "fuelType"),
            mileage: Number(text(data, "mileage") || 0),
            purchaseDate: text(data, "purchaseDate"),
            memo: text(data, "memo"),
          };
          try {
            await sendJson(`/api/vehicles?id=${encodeURIComponent(vehicle.id)}`, next, "PATCH");
            onSaved(next);
            onClose();
          } catch (caught) {
            const message = caught instanceof Error ? caught.message : String(caught);
            setError(message);
            alert(`저장 실패: ${message}`);
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black">차량 수정</h2>
          <button className="small-btn" type="button" onClick={onClose}>닫기</button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input name="plateNumber" label="차량번호" defaultValue={vehicle.plateNumber} required />
          <Input name="model" label="차종" defaultValue={vehicle.model} required />
          <Input name="color" label="색상" defaultValue={vehicle.color} />
          <FuelTypeSelect defaultValue={vehicle.fuelType} />
          <Input name="mileage" label="총 키로수" type="number" defaultValue={vehicle.mileage} />
          <Input name="purchaseDate" label="매입일" type="date" defaultValue={vehicle.purchaseDate} />
        </div>
        <Textarea name="memo" label="메모" defaultValue={vehicle.memo} />
        {error ? <p className="my-2 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
        <button className="primary-btn w-full disabled:opacity-60" type="submit" disabled={saving}>{saving ? "저장 중" : "저장"}</button>
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

function ReservationList({ reservations, onReservations }: { reservations: ReservationV2[]; onReservations: ReloadHandler<ReservationV2> }) {
  const [editing, setEditing] = useState<ReservationV2 | null>(null);
  const [page, setPage] = useState(1);
  const rows = [...reservations].sort((a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime());

  async function remove(id: string) {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    await fetch(`/api/reservations?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await onReservations();
  }

  return (
    <section data-horizontal-scroll="true" className="panel overflow-x-auto">
      <h2 className="mb-3 text-xl font-black">예약 목록</h2>
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead><tr className="border-b"><th>날짜</th><th>예약자명</th><th>예약내용</th><th>사진링크</th><th>사진추가업로드</th><th>수정</th><th>삭제</th></tr></thead>
        <tbody>
          {paginate(rows, page).map((reservation) => (
            <tr className="border-b" key={reservation.id}>
              <td>{reservation.date}</td>
              <td className="font-black">{reservation.customerName}</td>
              <td>{reservation.reservationText || reservation.memo}</td>
              <td>
                <PhotoGalleryButton
                  date={reservation.date}
                  kind="예약"
                  recordId={reservation.id}
                  recordType="reservation"
                  time={reservation.time}
                  vehicleNumber=""
                />
              </td>
              <td><AdditionalUploadButton recordType="reservation" recordId={reservation.id} vehicleNumber="" /></td>
              <td><button className="small-btn" type="button" onClick={() => setEditing(reservation)}>수정</button></td>
              <td><button className="danger-btn" type="button" onClick={() => remove(reservation.id)}><Trash2 size={16} /> 삭제</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination page={page} totalItems={rows.length} onPageChange={setPage} />
      {editing ? <ReservationEditModal reservation={editing} onClose={() => setEditing(null)} onSaved={() => onReservations()} /> : null}
    </section>
  );
}

function ReservationEditModal({ reservation, onClose, onSaved }: { reservation: ReservationV2; onClose: () => void; onSaved: ReloadHandler<ReservationV2> }) {
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
          await onSaved();
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
  afterReset,
  reloadEndpoint,
  onReloaded,
  onSaved,
  notify,
  buttonLabel = "저장",
}: {
  children: React.ReactNode;
  endpoint: string;
  buildPayload: (data: FormData) => Record<string, unknown>;
  afterSave?: (payload: Record<string, unknown>) => void | Promise<unknown>;
  afterReset?: () => void;
  reloadEndpoint?: string;
  onReloaded?: (items: unknown) => void;
  onSaved?: (payload: Record<string, unknown>) => void;
  notify?: (payload: Record<string, unknown>) => { title: string; body: string; url: string };
  buttonLabel?: string;
}) {
  const [status, setStatus] = useState("");
  return (
    <form
      className="panel space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        setStatus("저장 중");
        const payload = buildPayload(new FormData(form));
        try {
          await sendJson(endpoint, payload);
          await afterSave?.(payload);
          if (reloadEndpoint) {
            onReloaded?.(await fetchJson<unknown>(reloadEndpoint, []));
          } else {
            onSaved?.(payload);
          }
          if (notify) {
            await notifyWorkflow(notify(payload));
          }
          setStatus("저장 완료");
        } catch (error) {
          setStatus(`저장 실패: ${String(error)}`);
          return;
        }

        try {
          form?.reset();
          afterReset?.();
        } catch (error) {
          console.error("폼 초기화 실패", error);
        }
      }}
    >
      {children}
      <button className="primary-btn w-full" type="submit">{buttonLabel}</button>
      {status ? <p className="text-sm font-black text-[#116149]">{status}</p> : null}
    </form>
  );
}

async function notifyWorkflow(message: { title: string; body: string; url: string }) {
  try {
    await sendJson("/api/push/send", message);
  } catch (error) {
    console.error("push send request failed", error);
  }
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

function DateTimeTodayField({
  date,
  time,
  onDateChange,
  onTimeChange,
}: {
  date: string;
  time: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
}) {
  const [isToday, setIsToday] = useState(date === todayKorea());
  function resetToNow() {
    onDateChange(todayKorea());
    onTimeChange(currentTimeKorea());
  }
  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_8rem]">
      <Input
        name="date"
        label="날짜"
        type="date"
        value={date}
        onChange={(event) => {
          onDateChange(event.target.value);
          setIsToday(false);
        }}
      />
      <Input
        name="time"
        label="시간"
        type="time"
        value={time}
        onChange={(event) => {
          onTimeChange(event.target.value);
          setIsToday(false);
        }}
      />
      <label className="mt-0 flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#cfd8d1] bg-white px-3 text-sm font-black sm:mt-6">
        <input
          type="checkbox"
          checked={isToday}
          onChange={(event) => {
            setIsToday(event.target.checked);
            if (event.target.checked) resetToNow();
          }}
        />
        오늘
      </label>
    </div>
  );
}

function PhotoUploadButton({ recordType, recordId, vehicleNumber }: { recordType: string; recordId?: string; vehicleNumber: string }) {
  const [statusTone, setStatusTone] = useState<"info" | "success" | "error">("info");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgressState | null>(null);

  async function handleFiles(files: File[], input: HTMLInputElement) {
    if (!files.length) {
      setProgress(null);
      setUploading(false);
      return;
    }

    const label = uploadProgressLabel(files);
    setProgress({ completed: 0, total: files.length, failed: 0, label });
    setStatusTone("info");
    setUploading(true);

    try {
      const result = await uploadSelectedFiles(files, { recordType, recordId, vehicleNumber }, setProgress);
      setProgress({ completed: result.success, total: files.length, failed: result.failed, label, done: true });
      setStatusTone(result.failed ? "error" : "success");
      setTimeout(() => setProgress(null), 3000);
    } catch (error) {
      setProgress({ completed: 0, total: files.length, failed: files.length, label, done: true });
      setStatusTone("error");
      console.error("file upload failed", error);
    } finally {
      setUploading(false);
      input.value = "";
    }
  }

  return (
    <div>
      <label className={`primary-btn w-full cursor-pointer ${uploading ? "pointer-events-none opacity-70" : ""}`}>
        <Camera size={20} />
        {uploading ? "업로드 중" : "사진업로드"}
        <input
          className="sr-only"
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.mp4,image/jpeg,image/png,image/webp,video/mp4"
          multiple
          disabled={uploading}
          onChange={(event) => handleFiles(Array.from(event.target.files || []), event.currentTarget)}
        />
      </label>
      {progress ? <UploadProgressView progress={progress} tone={statusTone} /> : null}
    </div>
  );
}

function AdditionalUploadButton({ recordType, recordId, vehicleNumber }: { recordType: "dispatch" | "return" | "reservation"; recordId: string; vehicleNumber: string }) {
  const [statusTone, setStatusTone] = useState<"info" | "success" | "error">("info");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgressState | null>(null);
  return (
    <div className="min-w-0">
      <label className={`small-btn cursor-pointer whitespace-nowrap ${uploading ? "pointer-events-none opacity-70" : ""}`}>
        {uploading ? "업로드중" : "추가"}
        <input
          className="sr-only"
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.mp4,image/jpeg,image/png,image/webp,video/mp4"
          multiple
          disabled={uploading}
          onChange={async (event) => {
            const files = Array.from(event.target.files || []);
            if (!files.length) {
              setProgress(null);
              return;
            }
            const label = uploadProgressLabel(files);
            setProgress({ completed: 0, total: files.length, failed: 0, label });
            setStatusTone("info");
            setUploading(true);
            try {
              const result = await uploadSelectedFiles(files, { recordType, recordId, vehicleNumber }, setProgress);
              setProgress({ completed: result.success, total: files.length, failed: result.failed, label, done: true });
              setStatusTone(result.failed ? "error" : "success");
              setTimeout(() => setProgress(null), 2000);
            } catch (error) {
              setProgress({ completed: 0, total: files.length, failed: files.length, label, done: true });
              setStatusTone("error");
              console.error("file upload failed", error);
            } finally {
              setUploading(false);
              event.currentTarget.value = "";
            }
          }}
        />
      </label>
      {progress ? <MiniUploadProgress progress={progress} tone={statusTone} /> : null}
    </div>
  );
}

function PendingPhotoPicker({ files, onFiles, progress }: { files: File[]; onFiles: (files: File[]) => void; progress: UploadProgressState | null }) {
  return (
    <div>
      <label className="primary-btn w-full cursor-pointer">
        <Camera size={20} />
        사진업로드
        <input
          className="sr-only"
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.mp4,image/jpeg,image/png,image/webp,video/mp4"
          multiple
          onChange={(event) => onFiles(Array.from(event.target.files || []))}
        />
      </label>
      {files.length && !progress ? <p className="mt-2 text-sm font-bold text-[#116149]">{fileCountLabel(files)} 선택됨</p> : null}
      {progress ? <UploadProgressView progress={progress} tone={progress.failed ? "error" : progress.done ? "success" : "info"} /> : null}
    </div>
  );
}

function UploadProgressView({ progress, tone }: { progress: UploadProgressState; tone: "info" | "success" | "error" }) {
  const percent = uploadProgressPercent(progress);
  const color = tone === "error" ? "text-red-700" : tone === "success" ? "text-green-700" : "text-[#116149]";
  return (
    <div className={`mt-2 text-sm font-bold ${color}`}>
      <p>{uploadProgressText(progress)}</p>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#dfe5df]">
        <div className={`h-full ${tone === "error" ? "bg-red-600" : tone === "success" ? "bg-green-600" : "bg-[#116149]"}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function MiniUploadProgress({ progress, tone }: { progress: UploadProgressState; tone: "info" | "success" | "error" }) {
  const text = progress.done && !progress.failed ? "✓ 완료" : progress.total ? `${uploadProgressPercent(progress)}%` : "";
  const color = tone === "error" ? "text-red-700" : tone === "success" ? "text-green-700" : "text-[#667269]";
  return <p className={`mt-1 max-w-[90px] truncate text-[11px] font-black ${color}`} title={uploadProgressText(progress)}>{text || `(${progress.completed}/${progress.total})`}</p>;
}

function uploadProgressLabel(files: File[]) {
  return files.some((file) => file.type.startsWith("video/")) ? "파일" : "사진";
}

function uploadProgressPercent(progress: UploadProgressState) {
  if (!progress.total) return 0;
  return Math.round(((progress.completed + progress.failed) / progress.total) * 100);
}

function uploadProgressText(progress: UploadProgressState) {
  const percent = uploadProgressPercent(progress);
  if (progress.done && progress.failed) return `성공 ${progress.completed}건 / 실패 ${progress.failed}건`;
  if (progress.done) return `✅ ${fileCountLabelFromParts(progress.label, progress.total)} 업로드 완료`;
  return `업로드 중 (${progress.completed + progress.failed}/${progress.total}) ${percent}%`;
}

function fileCountLabelFromParts(label: string, total: number) {
  return label === "사진" ? `사진 ${total}장` : `파일 ${total}개`;
}

async function uploadSelectedFiles(
  files: File[],
  metadata: { recordType: string; recordId?: string; vehicleNumber: string },
  onProgress?: (progress: UploadProgressState) => void
) {
  let success = 0;
  let failed = 0;
  const label = uploadProgressLabel(files);
  for (const file of files) {
    const fileMetadata = {
      fileName: file.name,
      vehicleNumber: metadata.vehicleNumber,
      mimeType: file.type || "application/octet-stream",
      recordType: metadata.recordType,
      recordId: metadata.recordId || "",
      intakeType: metadata.recordType,
      fileType: file.type.startsWith("video/") ? "영상" : "사진",
    };
    try {
      const formData = new FormData();
      formData.append("file", file);
      const thumbnail = await createImageThumbnail(file);
      if (thumbnail) formData.append("thumbnail", thumbnail);
      formData.append("metadata", JSON.stringify(fileMetadata));
      const uploadResponse = await fetch("/api/uploads", { method: "POST", body: formData, cache: "no-store" });
      if (!uploadResponse.ok) throw new Error(await uploadResponse.text());
      const uploaded = (await uploadResponse.json()) as Record<string, unknown>;
      await sendJson("/api/uploaded-files", { ...fileMetadata, ...uploaded });
      success += 1;
    } catch (error) {
      failed += 1;
      console.error("single file upload failed", { fileName: file.name, error });
    }
    onProgress?.({ completed: success, total: files.length, failed, label });
  }
  if (failed === files.length && files.length > 0) throw new Error("all uploads failed");
  return { success, failed };
}

async function createImageThumbnail(file: File) {
  if (!file.type.startsWith("image/")) return null;
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    const maxSize = 300;
    const ratio = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * ratio));
    const height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.78));
    if (!blob) return null;
    return new File([blob], thumbnailFileName(file.name), { type: "image/webp" });
  } catch (error) {
    console.error("thumbnail create failed", error);
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function thumbnailFileName(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  const baseName = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
  return `${baseName}_thumb.webp`;
}

function fileCountLabel(files: File[]) {
  const allImages = files.every((file) => file.type.startsWith("image/"));
  return allImages ? `사진 ${files.length}장` : `파일 ${files.length}개`;
}

function fileName(file: UploadedFileV2) {
  const raw = file as UploadedFileV2 & { file_name?: string };
  return raw.fileName || raw.file_name || "파일";
}

function fileUrl(file: UploadedFileV2) {
  const raw = file as UploadedFileV2 & { r2_url?: string; drive_url?: string };
  return raw.r2Url || raw.r2_url || raw.driveUrl || raw.drive_url || "";
}

function fileThumbnailUrl(file: UploadedFileV2) {
  const raw = file as UploadedFileV2 & { thumbnail_url?: string };
  return raw.thumbnailUrl || raw.thumbnail_url || fileUrl(file);
}

function folderCoverThumbnailUrl(folder: PhotoArchiveFolder) {
  const image = folder.files.find(isImageFile);
  return image ? fileThumbnailUrl(image) : "";
}

function prefetchThumbnailUrls(urls: string[]) {
  if (typeof window === "undefined") return;
  for (const url of urls) {
    if (!url || thumbnailMemoryCache.has(url)) continue;
    thumbnailMemoryCache.add(url);
    const image = new Image();
    image.decoding = "async";
    image.src = url;
  }
}

function fileMime(file: UploadedFileV2) {
  const raw = file as UploadedFileV2 & { mime_type?: string; file_type?: string };
  return `${raw.mimeType || raw.mime_type || raw.fileType || raw.file_type || ""}`.toLowerCase();
}

function isVideoFile(file: UploadedFileV2) {
  const name = fileName(file).toLowerCase();
  const mime = fileMime(file);
  return mime.startsWith("video/") || mime.includes("영상") || name.endsWith(".mp4");
}

function isImageFile(file: UploadedFileV2) {
  const name = fileName(file).toLowerCase();
  const mime = fileMime(file);
  if (name.endsWith(".heic")) return false;
  return mime.startsWith("image/") || /\.(jpg|jpeg|png|webp)$/i.test(name) || mime.includes("사진");
}

function folderFileSummary(photoCount: number, videoCount: number) {
  const parts = [];
  if (photoCount) parts.push(`사진 ${photoCount}장`);
  if (videoCount) parts.push(`영상 ${videoCount}개`);
  return parts.length ? parts.join(" / ") : "파일 없음";
}

function formatPhotoFolderName(date: string | undefined, time: string | undefined, kind: string, vehicleNumber?: string) {
  const parsed = parseBusinessDateTime(date, time);
  return `${parsed.dateKey}_${parsed.timeText} ${kind}${vehicleNumber ? ` ${vehicleNumber}` : ""}`;
}

function formatPhotoBusinessDate(date: string | undefined, time: string | undefined) {
  const parsed = parseBusinessDateTime(date, time);
  return `${parsed.dateText} ${parsed.timeText}`;
}

function parseBusinessDateTime(date: string | undefined, time: string | undefined) {
  const source = clean(date);
  const normalizedDate = source
    .replaceAll(".", "-")
    .replace(/\s+/g, "")
    .replace(/-$/g, "");
  const dateMatch = normalizedDate.match(/(\d{4})-?(\d{2})-?(\d{2})/);
  const timeMatch = clean(time).match(/(\d{1,2}):(\d{2})/) || source.match(/(\d{1,2}):(\d{2})/);
  const year = dateMatch?.[1] || "0000";
  const month = dateMatch?.[2] || "00";
  const day = dateMatch?.[3] || "00";
  const hour = timeMatch?.[1]?.padStart(2, "0") || "00";
  const minute = timeMatch?.[2] || "00";

  return {
    dateKey: `${year}${month}${day}`,
    dateText: `${year}.${month}.${day}`,
    timeText: `${hour}:${minute}`,
  };
}

function Segmented({ value, values, onChange }: { value: string; values: string[]; onChange: (value: string) => void }) {
  return <div className={`grid ${values.length === 3 ? "grid-cols-3" : "grid-cols-2"} gap-2 rounded-lg bg-[#e6ebe5] p-1`}>{values.map((item) => <button className={`min-h-11 whitespace-nowrap rounded-md text-center font-black ${value === item ? "bg-white shadow" : ""}`} key={item} type="button" onClick={() => onChange(item)}>{item}</button>)}</div>;
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

function TruncatedCell({ value, className = "" }: { value: unknown; className?: string }) {
  const textValue = clean(value);
  return (
    <td className={`h-11 whitespace-nowrap px-1 align-middle ${className}`} title={textValue}>
      <div className="truncate">{textValue}</div>
    </td>
  );
}

function MemoCell({ value, onOpen }: { value: unknown; onOpen: (memo: string) => void }) {
  const textValue = clean(value);
  if (!textValue) return <td className="h-11 whitespace-nowrap px-1 align-middle">-</td>;
  return (
    <td className="h-11 whitespace-nowrap px-1 align-middle" title={textValue}>
      <div className="flex min-w-0 items-center gap-1">
        <span className="min-w-0 flex-1 truncate">{textValue}</span>
        <button
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#cfd8d1] bg-white text-[#116149]"
          title="메모 보기"
          type="button"
          onClick={() => onOpen(textValue)}
        >
          <Info size={15} />
        </button>
      </div>
    </td>
  );
}

function MemoModal({ memo, onClose }: { memo: string; onClose: () => void }) {
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-lg bg-white p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black">메모</h2>
          <button className="small-btn" type="button" onClick={onClose}>닫기</button>
        </div>
        <p className="whitespace-pre-wrap break-words leading-relaxed">{memo}</p>
      </div>
    </div>
  );
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
  return firstText(item.reservationText, item.reserverName, item.customerName, "예약내용 없음");
}

function newest(files: UploadedFileV2[]) {
  return Math.max(...files.map((file) => new Date(file.uploadedAt || 0).getTime()));
}

function paginate<T>(items: T[], page: number, pageSize = 10) {
  const start = (Math.max(page, 1) - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

function sortDateCreatedDesc<T extends { date?: string; time?: string; createdAt?: string }>(a: T, b: T) {
  return sortDateCreatedValues(b.date, b.time, b.createdAt, a.date, a.time, a.createdAt);
}

function sortDateCreatedValues(leftDate?: string, leftTime?: string, leftCreated?: string, rightDate?: string, rightTime?: string, rightCreated?: string) {
  const left = dateTimeSortValue(leftDate, leftTime, leftCreated);
  const right = dateTimeSortValue(rightDate, rightTime, rightCreated);
  if (left !== right) return left - right;
  return new Date(leftCreated || 0).getTime() - new Date(rightCreated || 0).getTime();
}

function rowDate(row: { dispatch?: DispatchV2; returnItem?: ReturnV2 }) {
  return row.dispatch?.date || row.returnItem?.date;
}

function rowTime(row: { dispatch?: DispatchV2; returnItem?: ReturnV2 }) {
  return row.dispatch?.time || row.returnItem?.time;
}

function dateTimeSortValue(date?: string, time?: string, createdAt?: string) {
  if (date) return new Date(`${date}T${(time || "00:00").slice(0, 5)}:00`).getTime();
  return new Date(createdAt || 0).getTime();
}

function formatBoardDateTime(date?: string, time?: string, createdAt?: string) {
  if (!date && !createdAt) return "";
  const datePart = (date || createdAt?.slice(0, 10) || "").replaceAll("-", ".");
  let timePart = time ? time.slice(0, 5) : "";
  if (!timePart && createdAt) {
    const parsed = new Date(createdAt);
    if (!Number.isNaN(parsed.getTime())) {
      timePart = new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(parsed);
    } else if (createdAt.length >= 16) {
      timePart = createdAt.slice(11, 16);
    }
  }
  return [datePart, timePart].filter(Boolean).join(" ");
}

function normalizeReservationDate(value?: string) {
  const text = clean(value);
  const match = text.match(/(\d{4})[.\-\s]*?(\d{1,2})[.\-\s]*?(\d{1,2})/);
  if (!match) return "";
  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function currentTimeKorea() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function displayVehicleStatus(vehicle: VehicleV2) {
  const status = String(vehicle.status || "");
  if (status === "보험" || status === "자차" || status === "셀프") return status;
  return "주차구역표시";
}

function StatusPill({ status }: { status: string }) {
  const label = status === "주차구역표시" ? "삼실" : status;
  const className =
    status === "보험"
      ? "bg-red-100 text-red-700"
      : status === "자차"
        ? "bg-green-100 text-green-700"
        : status === "셀프"
          ? "bg-blue-100 text-blue-700"
          : "bg-gray-100 text-gray-700";
  return <span className={`inline-flex min-h-8 items-center rounded-full px-3 text-xs font-black ${className}`}>{label}</span>;
}

function DispatchTypeBadge({ status }: { status: string }) {
  const normalized = normalizeDispatchStatus(status);
  if (normalized === "주차구역표시") return <span>{status || "-"}</span>;
  return <StatusPill status={normalized} />;
}

function UnreadStatusBadge({ status }: { status: string }) {
  const normalized = normalizeDispatchStatus(status);
  if (normalized === "주차구역표시") return <span className="inline-block w-[60px] text-center">-</span>;
  const className =
    normalized === "보험"
      ? "bg-[#DC2626]"
      : normalized === "자차"
        ? "bg-[#16A34A]"
        : "bg-[#2563EB]";
  return (
    <span className={`inline-flex h-7 w-[60px] items-center justify-center rounded-full text-xs font-black text-white ${className}`}>
      {normalized}
    </span>
  );
}

function PhoneCell({ phone }: { phone?: string }) {
  const value = clean(phone);
  if (!value) return <span>-</span>;
  const href = `tel:${value.replace(/[^\d+]/g, "") || value}`;
  const display = formatPhoneNumber(value);
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      <span className="whitespace-nowrap" title={value}>{display}</span>
      <a className="small-btn shrink-0" href={href}>통화</a>
    </div>
  );
}

function dispatchPhone(dispatch?: DispatchV2) {
  if (!dispatch) return "";
  return firstText(dispatch.customerPhone, dispatch.phone, dispatch.customer_contact, dispatch.contact, dispatch.customer_phone);
}

function formatPhoneNumber(value: unknown) {
  if (!value) return "";
  const original = String(value);
  const digits = original.replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("010")) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10 && digits.startsWith("02")) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return original;
}

function DispatchAdminStatusPill({ status }: { status: string }) {
  if (!status) return <span />;
  const label = status === "주차구역표시" ? "삼실" : status;
  const className =
    status === "보험"
      ? "bg-red-100 text-red-700"
      : status === "자차"
        ? "bg-green-100 text-green-700"
        : status === "셀프"
          ? "bg-blue-100 text-blue-700"
          : "bg-gray-100 text-gray-700";
  return <span className={`inline-flex min-h-8 items-center rounded-full px-3 text-xs font-black ${className}`}>{label}</span>;
}

function dispatchAdminDispatchStatus(dispatch: DispatchV2) {
  const raw = dispatch.dispatchType || dispatch.businessType || dispatch.status;
  return raw ? normalizeDispatchStatus(raw) : "";
}

function dispatchAdminReturnStatus(returnItem: ReturnV2 | undefined, dispatches: DispatchV2[]) {
  if (!returnItem) return "";
  const rawReturn = returnStatusValue(returnItem);
  if (rawReturn) return normalizeDispatchStatus(rawReturn);
  const latestDispatch = latestByVehicle(dispatches, returnItem.rentalCarNumber || returnItem.vehicleNumber || "");
  return latestDispatch ? dispatchAdminDispatchStatus(latestDispatch) : "";
}

function findLinkedDispatchForReturn(returnItem: ReturnV2 | undefined, dispatches: DispatchV2[]) {
  if (!returnItem) return undefined;
  const raw = returnItem as ReturnV2 & {
    dispatchId?: string;
    dispatch_id?: string;
    parentDispatchId?: string;
    parent_dispatch_id?: string;
    originalDispatchId?: string;
    original_dispatch_id?: string;
  };
  const dispatchId = firstText(
    raw.dispatchId,
    raw.dispatch_id,
    raw.parentDispatchId,
    raw.parent_dispatch_id,
    raw.originalDispatchId,
    raw.original_dispatch_id
  );
  if (dispatchId) {
    const byId = dispatches.find((dispatch) => dispatch.id === dispatchId);
    if (byId) return byId;
  }
  return latestByVehicle(dispatches, returnItem.rentalCarNumber || returnItem.vehicleNumber || "");
}

function returnStatusValue(returnItem: ReturnV2) {
  const raw = returnItem as ReturnV2 & { dispatchType?: string; businessType?: string; statusType?: string; typeDetail?: string; category?: string };
  return firstText(raw.dispatchType, raw.businessType, raw.statusType, raw.typeDetail, raw.category);
}

function vehicleDashboardSummary(vehicle: VehicleV2) {
  if (displayVehicleStatus(vehicle) === "주차구역표시") return normalizeParkingLocation(vehicle.location || vehicle.activeSummary);
  const [orderer, repairShop] = String(vehicle.activeSummary || "").split("/").map((value) => value.trim());
  return formatOrdererShop(orderer, repairShop);
}

function buildVehicleDashboardRows(vehicles: VehicleV2[], dispatches: DispatchV2[], returns: ReturnV2[]): VehicleDashboardRow[] {
  return vehicles.map((vehicle) => {
    const vehicleNumber = vehicle.plateNumber;
    const latestDispatch = latestByVehicle(dispatches, vehicleNumber);
    const latestReturn = latestByVehicle(returns, vehicleNumber);
    const dispatchTime = latestDispatch ? recordSortValue(latestDispatch) : 0;
    const returnTime = latestReturn ? recordSortValue(latestReturn) : 0;

    if (latestReturn && returnTime >= dispatchTime) {
      return {
        key: vehicle.id,
        vehicleNumber,
        model: vehicle.model,
        statusLabel: "주차구역표시",
        dispatchDate: formatMonthDay(latestReturn.date || latestReturn.createdAt),
        fuelLevelText: firstText(latestReturn.fuelLevelText, latestReturn.fuelDisplay),
        customerCarModel: "",
        ordererRepairShop: normalizeParkingLocation(firstText(latestReturn.parkingZone, latestReturn.arrivalAddress, latestReturn.returnAddress)),
        updatedAt: latestReturn.updatedAt || latestReturn.createdAt || vehicle.updatedAt,
      };
    }

    if (latestDispatch) {
      const statusLabel = normalizeDispatchStatus(firstText(latestDispatch.dispatchType, latestDispatch.businessType, latestDispatch.status));
      return {
        key: vehicle.id,
        vehicleNumber,
        model: vehicle.model,
        statusLabel,
        dispatchDate: formatMonthDay(latestDispatch.date || latestDispatch.createdAt),
        fuelLevelText: firstText(latestDispatch.fuelLevelText, latestDispatch.fuelDisplay),
        customerCarModel: firstText(latestDispatch.customerCarModel),
        ordererRepairShop: statusLabel === "셀프"
          ? firstText(latestDispatch.customerName, latestDispatch.orderer, latestDispatch.orderedBy)
          : formatDashboardOrdererShop(firstText(latestDispatch.orderer, latestDispatch.orderedBy, latestDispatch.customerName), latestDispatch.repairShop),
        updatedAt: latestDispatch.updatedAt || latestDispatch.createdAt || vehicle.updatedAt,
      };
    }

    return {
      key: vehicle.id,
      vehicleNumber,
      model: vehicle.model,
      statusLabel: "주차구역표시",
      dispatchDate: "",
      fuelLevelText: vehicle.fuelDisplay || "",
      customerCarModel: "",
      ordererRepairShop: normalizeParkingLocation(vehicle.location || vehicle.activeSummary),
      updatedAt: vehicle.updatedAt,
    };
  });
}

function latestByVehicle<T extends { date?: string; time?: string; createdAt?: string; vehicleNumber?: string; rentalCarNumber?: string; plateNumber?: string }>(items: T[], vehicleNumber: string) {
  return items
    .filter((item) => normalizeVehicleNumber(item) === vehicleNumber)
    .sort((a, b) => recordSortValue(b) - recordSortValue(a))[0];
}

function normalizeVehicleNumber(row: { vehicleNumber?: string; rentalCarNumber?: string; plateNumber?: string }) {
  return firstText(row.vehicleNumber, row.rentalCarNumber, row.plateNumber);
}

function recordSortValue(row: { date?: string; time?: string; createdAt?: string }) {
  return dateTimeSortValue(row.date, row.time, row.createdAt);
}

function normalizeDispatchStatus(value: unknown) {
  const status = firstText(value);
  if (status === "insurance" || status === "보험") return "보험";
  if (status === "self" || status === "자차") return "자차";
  if (status === "direct" || status === "셀프") return "셀프";
  return "주차구역표시";
}

function formatDashboardOrdererShop(orderer: unknown, repairShop: unknown) {
  const left = clean(orderer).trim();
  const right = clean(repairShop).trim();
  if (left && right) return `${left} / ${right}`;
  return left || right;
}

function formatMonthDay(value?: string) {
  if (!value) return "";
  const datePart = value.slice(0, 10);
  const parsed = new Date(`${datePart}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${String(parsed.getMonth() + 1).padStart(2, "0")}월 ${String(parsed.getDate()).padStart(2, "0")}일`;
}

function formatLatestDispatchInfo(dispatch?: DispatchV2) {
  if (!dispatch) return "최근 배차정보 없음";
  const orderer = firstText(dispatch.orderer, dispatch.orderedBy, dispatch.customerName);
  const repairShop = clean(dispatch.repairShop).trim();
  const summary = orderer && repairShop ? `${orderer} / ${repairShop}` : orderer || repairShop;
  const date = formatMonthDay(dispatch.date || dispatch.createdAt);
  if (!summary) return "최근 배차정보 없음";
  return date ? `${summary} · ${date}` : summary;
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = clean(value).trim();
    if (text) return text;
  }
  return "";
}

function formatOrdererShop(orderer: unknown, repairShop: unknown) {
  const left = clean(orderer).trim() || "?";
  const right = clean(repairShop).trim() || "?";
  return `${left}/${right}`;
}

function normalizeParkingLocation(value: unknown) {
  return clean(value).replaceAll("천섬", "천삼");
}

function clean(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function findVehicle(vehicles: VehicleV2[], plate: string) {
  return vehicles.find((vehicle) => vehicle.plateNumber === plate);
}

function vehicleModelColor(vehicle?: VehicleV2) {
  if (!vehicle) return "";
  return [vehicle.model, vehicle.color].filter(Boolean).join("/");
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
