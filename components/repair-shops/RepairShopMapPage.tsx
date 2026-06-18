"use client";

import dynamic from "next/dynamic";

type RepairShopMapPageProps = {
  title?: string;
  subtitle?: string;
  showImportLink?: boolean;
};

const RepairShopMapClient = dynamic(() => import("./RepairShopMapClient"), {
  ssr: false,
  loading: () => (
    <main className="min-h-screen bg-[#f6f7f4] p-4 text-[#16211d]">
      <section className="mx-auto max-w-7xl">
        <div className="panel text-center font-black text-[#667269]">지도 불러오는 중</div>
      </section>
    </main>
  ),
});

export function RepairShopMapPage(props: RepairShopMapPageProps) {
  return <RepairShopMapClient {...props} />;
}
