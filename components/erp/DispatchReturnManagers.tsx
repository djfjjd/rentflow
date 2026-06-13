"use client";

import type React from "react";
import { useState } from "react";
import { ReportTools } from "@/components/erp/ReportTools";
import { useERPState } from "@/lib/erp-state";

type Tab = "dispatches" | "returns";

export function DispatchReturnManager() {
  const { dispatches, returns, isLoaded } = useERPState();
  const [tab, setTab] = useState<Tab>("dispatches");

  if (!isLoaded) return <div className="p-5 text-sm font-bold text-gray-500">배회차 데이터를 불러오는 중입니다...</div>;

  return (
    <div className="space-y-5">
      <div className="inline-flex rounded-lg border border-line bg-white p-1 shadow-sm">
        <TabButton active={tab === "dispatches"} onClick={() => setTab("dispatches")}>
          배차 {dispatches.length}
        </TabButton>
        <TabButton active={tab === "returns"} onClick={() => setTab("returns")}>
          회차 {returns.length}
        </TabButton>
      </div>

      {tab === "dispatches" ? (
        <section className="space-y-4">
          {dispatches.map((item) => (
            <article key={item.id} className="rounded-lg border border-line bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-black text-ink">{item.rentalCarNumber} · {item.customerName}</h3>
                  <p className="mt-1 text-sm text-gray-500">{item.claimNumber} / {item.repairShop} / {item.pickupAddress} {"->"} {item.deliveryAddress}</p>
                </div>
                <span className="rounded-md bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{item.status}</span>
              </div>
              <div className="mt-4">
                <ReportTools type="dispatch" record={item} />
              </div>
            </article>
          ))}
          {dispatches.length === 0 && <Empty text="배차 기록이 없습니다. AI 접수 업로드 후 이곳에 표시됩니다." />}
        </section>
      ) : (
        <section className="space-y-4">
          {returns.map((item) => (
            <article key={item.id} className="rounded-lg border border-line bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-black text-ink">{item.rentalCarNumber} 회차</h3>
                  <p className="mt-1 text-sm text-gray-500">{item.returnAddress} {"->"} {item.arrivalAddress}</p>
                </div>
                <span className="rounded-md bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{item.status}</span>
              </div>
              <div className="mt-4">
                <ReportTools type="return" record={item} />
              </div>
            </article>
          ))}
          {returns.length === 0 && <Empty text="회차 기록이 없습니다. AI 접수 업로드 후 이곳에 표시됩니다." />}
        </section>
      )}
    </div>
  );
}

export function DispatchManager() {
  return <DispatchReturnManager />;
}

export function ReturnManager() {
  return <DispatchReturnManager />;
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? "min-h-10 rounded-md bg-primary px-4 text-sm font-black text-white" : "min-h-10 rounded-md px-4 text-sm font-black text-gray-600 hover:bg-field"}
    >
      {children}
    </button>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-line bg-white p-5 text-sm font-bold text-gray-500 shadow-sm">{text}</div>;
}
