"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import { geocodeAddressWithCache } from "@/src/lib/geocodeCache";

type RepairShop = {
  id: number;
  name: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
  createdAt?: string;
};

type Coordinates = {
  lat: number;
  lng: number;
};

type RepairShopMapClientProps = {
  title?: string;
  subtitle?: string;
  showImportLink?: boolean;
};

const markerIcon = L.divIcon({
  className: "",
  html: "<div style=\"width:18px;height:18px;border-radius:999px;background:#116149;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35)\"></div>",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export default function RepairShopMapClient({
  title = "정비업체 지도",
  subtitle = "OpenStreetMap 기반으로 주소를 좌표 변환해 표시합니다.",
  showImportLink = true,
}: RepairShopMapClientProps) {
  const [shops, setShops] = useState<RepairShop[]>([]);
  const [query, setQuery] = useState("");
  const [coordinates, setCoordinates] = useState<Record<string, Coordinates>>({});
  const [cacheUsedCount, setCacheUsedCount] = useState(0);
  const [geocodingDone, setGeocodingDone] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadShops()
      .then((response) => response.json())
      .then((data) => setShops(Array.isArray(data) ? data : []))
      .catch(() => setShops([]));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setGeocodingDone(false);
      setCacheUsedCount(0);
      const next: Record<string, Coordinates> = {};
      const seen = new Set<string>();

      for (const shop of shops) {
        const address = shop.address.trim();
        if (!address || seen.has(address)) continue;
        seen.add(address);

        const result = await geocodeAddressWithCache(address);
        if (cancelled) return;
        if (result.coordinates) next[address] = result.coordinates;
        if (result.cacheHit) {
          setCacheUsedCount((count) => count + 1);
        } else {
          await delay(1000);
        }
        setCoordinates({ ...next });
      }

      if (!cancelled) setGeocodingDone(true);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [shops]);

  const filtered = shops.filter((shop) => `${shop.name} ${shop.address}`.toLowerCase().includes(query.toLowerCase()));
  const mapped = filtered.filter((shop) => coordinates[shop.address]);
  const missing = filtered.filter((shop) => !coordinates[shop.address]);
  const firstCoordinate = mapped[0] ? coordinates[mapped[0].address] : null;
  const center: [number, number] = firstCoordinate ? [firstCoordinate.lat, firstCoordinate.lng] : [37.5665, 126.9780];

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
        body: JSON.stringify({ shops: [{ name, address }] }),
        cache: "no-store",
      });
      const body = await response.text();
      console.log("repair shop add response", { status: response.status, body });
      if (!response.ok) throw new Error(body || "저장 실패");
      const refreshed = await loadShops().then((result) => result.json());
      setShops(Array.isArray(refreshed) ? refreshed : []);
      setMessage("저장 완료");
      setShowAddModal(false);
      form.reset();
    } catch (error) {
      setMessage(`저장 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setAdding(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f7f4] p-4 text-[#16211d]">
      <section className="mx-auto grid max-w-7xl gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-black">{title}</h1>
            <p className="text-sm font-bold text-[#667269]">{subtitle}</p>
          </div>
          {showImportLink ? <Link className="small-btn" href="/admin/repair-shops/import">업체 가져오기</Link> : null}
        </div>

        <section className="grid gap-3 sm:grid-cols-4">
          <SummaryCard label="전체 업체" value={`${filtered.length}건`} />
          <SummaryCard label="좌표 성공" value={`${mapped.length}건`} />
          <SummaryCard label="실패" value={`${missing.length}건`} />
          <SummaryCard label="캐시 사용" value={`${cacheUsedCount}건`} />
        </section>

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

        <section className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <aside className="order-2 grid max-h-[70vh] gap-2 overflow-auto lg:order-1">
            {filtered.map((shop) => (
              <article className="rounded-lg border border-[#d8ded8] bg-white p-4 shadow-sm" key={shop.id}>
                <h2 className="font-black">{shop.name}</h2>
                <p className="mt-1 text-sm font-bold text-[#667269]">{shop.address}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a className="small-btn" href={naverMapUrl(shop.address)} target="_blank">네이버지도</a>
                  <a className="small-btn" href={kakaoMapUrl(shop.address)} target="_blank">카카오맵</a>
                  <a className="small-btn" href={tmapSearchUrl(shop.address)} target="_blank">티맵</a>
                </div>
              </article>
            ))}
            {!filtered.length ? <div className="panel text-center font-black text-[#667269]">검색 결과가 없습니다.</div> : null}
          </aside>

          <div className="order-1 overflow-hidden rounded-lg border border-[#d8ded8] bg-white shadow-sm lg:order-2">
            <MapContainer center={center} zoom={12} scrollWheelZoom className="h-[58vh] min-h-[360px] w-full lg:h-[70vh]">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {mapped.map((shop) => {
                const coordinate = coordinates[shop.address];
                return (
                <Marker icon={markerIcon} key={shop.id} position={[coordinate.lat, coordinate.lng]}>
                  <Popup>
                    <div className="grid gap-2 text-sm">
                      <strong>{shop.name}</strong>
                      <span>{shop.address}</span>
                      <a href={naverMapUrl(shop.address)} target="_blank">네이버지도 검색</a>
                      <a href={kakaoMapUrl(shop.address)} target="_blank">카카오맵 검색</a>
                      <a href={tmapSearchUrl(shop.address)} target="_blank">티맵 검색</a>
                    </div>
                  </Popup>
                </Marker>
                );
              })}
            </MapContainer>
          </div>
        </section>

        {missing.length ? (
          <section className="panel">
            <h2 className="mb-3 text-xl font-black">좌표 변환 실패 업체</h2>
            {!geocodingDone ? <p className="mb-3 text-sm font-bold text-[#667269]">주소 좌표를 순차 조회 중입니다.</p> : null}
            <div className="grid gap-2 md:grid-cols-2">
              {missing.map((shop) => (
                <p className="rounded-lg bg-[#fff7f4] p-3 text-sm font-bold text-[#9a3f24]" key={shop.id}>
                  {shop.name} · {shop.address}
                </p>
              ))}
            </div>
          </section>
        ) : null}
      </section>
      {showAddModal ? <RepairShopModal adding={adding} onClose={() => setShowAddModal(false)} onSubmit={addShop} /> : null}
    </main>
  );
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

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-[#d8ded8] bg-white p-4">
      <p className="text-sm font-black text-[#68746d]">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </article>
  );
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

function tmapSearchUrl(address: string) {
  return `https://www.tmap.co.kr/search?searchKeyword=${encodeURIComponent(address)}`;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
