"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";

type RepairShop = {
  id: number;
  name: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
  createdAt?: string;
};

const markerIcon = L.divIcon({
  className: "",
  html: "<div style=\"width:18px;height:18px;border-radius:999px;background:#116149;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35)\"></div>",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export default function RepairShopMapClient() {
  const [shops, setShops] = useState<RepairShop[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/repair-shops", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setShops(Array.isArray(data) ? data : []))
      .catch(() => setShops([]));
  }, []);

  const filtered = shops.filter((shop) => `${shop.name} ${shop.address}`.toLowerCase().includes(query.toLowerCase()));
  const mapped = filtered.filter(hasCoordinates);
  const missing = filtered.filter((shop) => !hasCoordinates(shop));
  const center: [number, number] = mapped[0] ? [Number(mapped[0].lat), Number(mapped[0].lng)] : [37.5665, 126.9780];

  return (
    <main className="min-h-screen bg-[#f6f7f4] p-4 text-[#16211d]">
      <section className="mx-auto grid max-w-7xl gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-black">정비업체 지도</h1>
            <p className="text-sm font-bold text-[#667269]">OpenStreetMap 기반으로 좌표 등록 업체를 표시합니다.</p>
          </div>
          <Link className="small-btn" href="/admin/repair-shops/import">업체 가져오기</Link>
        </div>

        <section className="grid gap-3 sm:grid-cols-3">
          <SummaryCard label="총 업체 수" value={`${filtered.length}건`} />
          <SummaryCard label="좌표 등록 완료" value={`${mapped.length}건`} />
          <SummaryCard label="좌표 미등록" value={`${missing.length}건`} />
        </section>

        <label className="label">
          업체명/주소 검색
          <input className="field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="업체명 또는 주소" />
        </label>

        <section className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <aside className="order-2 grid max-h-[70vh] gap-2 overflow-auto lg:order-1">
            {filtered.map((shop) => (
              <article className="rounded-lg border border-[#d8ded8] bg-white p-4 shadow-sm" key={shop.id}>
                <h2 className="font-black">{shop.name}</h2>
                <p className="mt-1 text-sm font-bold text-[#667269]">{shop.address}</p>
                <p className={`mt-2 text-xs font-black ${hasCoordinates(shop) ? "text-[#116149]" : "text-[#a13f24]"}`}>
                  {hasCoordinates(shop) ? `${shop.lat}, ${shop.lng}` : "좌표 미등록"}
                </p>
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
              {mapped.map((shop) => (
                <Marker icon={markerIcon} key={shop.id} position={[Number(shop.lat), Number(shop.lng)]}>
                  <Popup>
                    <div className="grid gap-2 text-sm">
                      <strong>{shop.name}</strong>
                      <span>{shop.address}</span>
                      <a href={naverDirectionUrl(shop.address)} target="_blank">네이버 길찾기</a>
                      <a href={kakaoDirectionUrl(shop.address)} target="_blank">카카오맵 길찾기</a>
                      <a href={tmapDirectionUrl(shop.name, shop.lat, shop.lng)} target="_blank">티맵 길찾기</a>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </section>

        {missing.length ? (
          <section className="panel">
            <h2 className="mb-3 text-xl font-black">좌표 변환 실패 업체</h2>
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
    </main>
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

function hasCoordinates(shop: RepairShop) {
  return Number.isFinite(Number(shop.lat)) && Number.isFinite(Number(shop.lng));
}

function naverDirectionUrl(address: string) {
  return `https://map.naver.com/v5/search/${encodeURIComponent(address)}`;
}

function kakaoDirectionUrl(address: string) {
  return `https://map.kakao.com/link/search/${encodeURIComponent(address)}`;
}

function tmapDirectionUrl(name: string, lat?: number | null, lng?: number | null) {
  const query = new URLSearchParams({
    name,
    lon: String(lng || ""),
    lat: String(lat || ""),
  });
  return `https://apis.openapi.sk.com/tmap/app/routes?${query.toString()}`;
}
