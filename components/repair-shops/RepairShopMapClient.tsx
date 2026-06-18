"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { Trash2 } from "lucide-react";

type RepairShop = {
  id: number;
  name: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
  createdAt?: string;
};

type RepairShopMapClientProps = {
  title?: string;
  subtitle?: string;
  showImportLink?: boolean;
  embedded?: boolean;
};

const markerIcon = L.divIcon({
  className: "",
  html: "<div style=\"width:18px;height:18px;border-radius:999px;background:#116149;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35)\"></div>",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export default function RepairShopMapClient({
  title = "정비업체 지도",
  subtitle = "지도에 표시되어 있는 좌표는 네이버지도 및 카카오지도가 더 정확합니다. 현재 지도는 참고용으로만 확인해주세요.",
  showImportLink = true,
  embedded = false,
}: RepairShopMapClientProps) {
  const [shops, setShops] = useState<RepairShop[]>([]);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState("");
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);
  const markerRefs = useRef<Record<number, L.Marker | null>>({});

  useEffect(() => {
    loadShops()
      .then((response) => response.json())
      .then((data) => setShops(Array.isArray(data) ? data.map(normalizeRepairShop) : []))
      .catch(() => setShops([]));
  }, []);

  const filtered = shops.filter((shop) => `${shop.name} ${shop.address}`.toLowerCase().includes(query.toLowerCase()));
  const mapped = filtered.filter(hasCoordinates);
  const center: [number, number] = mapped[0] ? [Number(mapped[0].lat), Number(mapped[0].lng)] : [37.5665, 126.9780];

  async function addShop(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const address = String(data.get("address") || "").trim();
    if (!name || !address) return;

    setAdding(true);
    setMessage("");
    try {
      const response = await fetch("/api/repair-shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geocode: false, shops: [{ name, address }] }),
        cache: "no-store",
      });
      const body = await response.text();
      console.log("repair shop add response", { status: response.status, body });
      if (!response.ok) throw new Error(body || "저장 실패");
      const refreshed = await loadShops().then((result) => result.json());
      setShops(Array.isArray(refreshed) ? refreshed.map(normalizeRepairShop) : []);
      setMessage("저장 완료");
      setShowAddModal(false);
      form.reset();
    } catch (error) {
      setMessage(`저장 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setAdding(false);
    }
  }

  useEffect(() => {
    if (selectedShopId === null) return;
    const marker = markerRefs.current[selectedShopId];
    if (!marker) return;
    const timer = window.setTimeout(() => marker.openPopup(), 120);
    return () => window.clearTimeout(timer);
  }, [selectedShopId]);

  async function handleCopyAddress(address: string) {
    try {
      await copyAddress(address);
      showToast("클립보드에 복사되었습니다.");
    } catch {
      showToast("복사에 실패했습니다.");
    }
  }

  function showToast(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(""), 2000);
  }

  async function deleteShop(shop: RepairShop) {
    if (!confirm("삭제하시겠습니까?")) return;

    try {
      const response = await fetch(`/api/repair-shops?id=${encodeURIComponent(String(shop.id))}`, {
        method: "DELETE",
        cache: "no-store",
      });
      if (!response.ok) throw new Error(await response.text());
      setShops((current) => current.filter((item) => item.id !== shop.id));
      if (selectedShopId === shop.id) setSelectedShopId(null);
      showToast("삭제되었습니다.");
    } catch {
      showToast("삭제에 실패했습니다.");
    }
  }

  const content = (
    <section className="mx-auto grid max-w-7xl gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-black">{title}</h1>
            <p className="text-sm font-bold text-[#667269]">{subtitle}</p>
          </div>
          {showImportLink ? <Link className="small-btn" href="/admin/repair-shops/import">업체 가져오기</Link> : null}
        </div>

        <section className="grid gap-2">
          <div className="flex flex-col gap-3 sm:flex-row">
            <button className="primary-btn w-full shrink-0 sm:w-[120px]" type="button" onClick={() => setShowAddModal(true)}>
              주소 추가
            </button>
            <input
              className="field flex-1"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="검색할 주소를 입력하세요."
            />
          </div>
          {message ? <p className={`text-sm font-black ${message.startsWith("저장 실패") ? "text-red-700" : "text-green-700"}`}>{message}</p> : null}
        </section>

        <section className="grid min-h-[640px] grid-cols-[45vw_55vw] gap-2 overflow-hidden lg:grid-cols-[minmax(420px,420px)_minmax(0,1fr)] lg:gap-4">
          <aside className="grid max-h-[calc(100vh-260px)] min-h-[420px] w-[45vw] max-w-[45vw] gap-2 overflow-auto lg:max-h-[70vh] lg:w-auto lg:max-w-none">
            {filtered.map((shop) => (
              <article
                className={`rounded-lg border bg-white p-2 text-left shadow-sm lg:p-4 ${selectedShopId === shop.id ? "border-[#116149] ring-2 ring-[#116149]/20" : "border-[#d8ded8]"}`}
                key={shop.id}
                onClick={() => {
                  if (hasCoordinates(shop)) setSelectedShopId(shop.id);
                }}
              >
                <h2 className="text-sm font-black lg:text-base">{shop.name}</h2>
                <p className="mt-1 text-xs font-bold text-[#667269] lg:text-sm">{shop.address}</p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5 lg:flex-nowrap lg:gap-2 lg:overflow-x-auto">
                  <a className="small-btn min-h-8 px-2 text-[11px] lg:min-h-10 lg:px-3 lg:text-sm" href={naverMapUrl(shop.address)} target="_blank" onClick={(event) => event.stopPropagation()}>네이버지도</a>
                  <a className="small-btn min-h-8 px-2 text-[11px] lg:min-h-10 lg:px-3 lg:text-sm" href={kakaoMapUrl(shop.address)} target="_blank" onClick={(event) => event.stopPropagation()}>카카오맵</a>
                  <button className="small-btn min-h-8 px-2 text-[11px] lg:min-h-10 lg:px-3 lg:text-sm" type="button" onClick={(event) => { event.stopPropagation(); void handleCopyAddress(shop.address); }}>주소복사</button>
                  <button
                    aria-label="주소 삭제"
                    className="inline-flex h-8 min-h-8 w-8 min-w-8 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-800 lg:h-11 lg:min-h-11 lg:w-11 lg:min-w-11"
                    title="주소 삭제"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void deleteShop(shop);
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
            {!filtered.length ? <div className="panel text-center font-black text-[#667269]">검색 결과가 없습니다.</div> : null}
          </aside>

          <div className="w-[55vw] max-w-[55vw] overflow-hidden rounded-lg border border-[#d8ded8] bg-white shadow-sm lg:w-auto lg:max-w-none">
            <MapContainer center={center} zoom={12} scrollWheelZoom className="h-[calc(100vh-260px)] min-h-[420px] w-full lg:h-[70vh]">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapFocus shop={mapped.find((shop) => shop.id === selectedShopId) || null} />
              {mapped.map((shop) => (
                <Marker
                  icon={markerIcon}
                  key={shop.id}
                  position={[Number(shop.lat), Number(shop.lng)]}
                  ref={(marker) => {
                    markerRefs.current[shop.id] = marker;
                  }}
                >
                  <Popup>
                    <div className="grid gap-2 text-sm">
                      <strong>{shop.name}</strong>
                      <span>{shop.address}</span>
                      <a href={naverMapUrl(shop.address)} target="_blank">네이버지도 검색</a>
                      <a href={kakaoMapUrl(shop.address)} target="_blank">카카오맵 검색</a>
                      <button className="small-btn" type="button" onClick={() => void handleCopyAddress(shop.address)}>주소복사</button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </section>
      </section>
  );

  const modal = showAddModal ? <RepairShopModal adding={adding} onClose={() => setShowAddModal(false)} onSubmit={addShop} /> : null;
  if (embedded) {
    return <section className="text-[#16211d]">{content}{modal}<Toast message={toast} /></section>;
  }

  return <main className="min-h-screen bg-[#f6f7f4] p-4 text-[#16211d]">{content}{modal}<Toast message={toast} /></main>;
}

function Toast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-5 left-1/2 z-[10000] -translate-x-1/2 rounded-lg bg-[#16211d] px-4 py-3 text-sm font-black text-white shadow-2xl">
      {message}
    </div>
  );
}

function MapFocus({ shop }: { shop: RepairShop | null }) {
  const map = useMap();

  useEffect(() => {
    if (!shop || !hasCoordinates(shop)) return;
    map.flyTo([Number(shop.lat), Number(shop.lng)], Math.max(map.getZoom(), 15), { duration: 0.5 });
  }, [map, shop]);

  return null;
}

function RepairShopModal({
  adding,
  onClose,
  onSubmit,
}: {
  adding: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-[9999] grid place-items-end bg-black/30 p-0 sm:place-items-center sm:p-4" onClick={onClose}>
      <form
        className="w-full rounded-t-lg bg-white p-4 shadow-2xl sm:max-w-md sm:rounded-lg"
        onClick={(event) => event.stopPropagation()}
        onSubmit={onSubmit}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black">주소 추가/수정</h2>
          <button className="small-btn" type="button" onClick={onClose}>닫기</button>
        </div>
        <div className="grid gap-3">
          <label className="label">
            상호명
            <input className="field" name="name" placeholder="상호명 입력" required />
          </label>
          <label className="label">
            주소
            <input className="field" name="address" placeholder="주소 입력" required />
          </label>
          <button className="primary-btn w-full" disabled={adding} type="submit">
            {adding ? "저장 중" : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}

function hasCoordinates(shop: RepairShop) {
  return Number.isFinite(Number(shop.lat)) && Number.isFinite(Number(shop.lng));
}

function normalizeRepairShop(shop: RepairShop): RepairShop {
  return {
    ...shop,
    name: cleanShopName(shop.name),
  };
}

function cleanShopName(name: string) {
  return String(name || "").replace(/\([^)]*\)/g, "").trim();
}

function loadShops() {
  return fetch("/api/repair-shops", { cache: "no-store" });
}

function naverMapUrl(address: string) {
  return `https://map.naver.com/v5/search/${encodeURIComponent(address)}`;
}

function kakaoMapUrl(address: string) {
  return `https://map.kakao.com/link/search/${encodeURIComponent(address)}`;
}

async function copyAddress(address: string) {
  await navigator.clipboard?.writeText(address);
}
