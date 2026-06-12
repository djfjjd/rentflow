"use client";

import { Copy, Paperclip } from "lucide-react";
import { useMemo, useState } from "react";
import type { Dispatch, ReturnRecord } from "@/lib/erp-data";

type ReportToolsProps =
  | { type: "dispatch"; record: Dispatch }
  | { type: "return"; record: ReturnRecord };

export function ReportTools(props: ReportToolsProps) {
  const [copied, setCopied] = useState("");
  const report = useMemo(() => {
    if (props.type === "dispatch") {
      const item = props.record;
      return {
        dispatch: `[배차보고]\n보험접수번호: ${item.claimNumber}\n고객: ${item.customerName} ${item.customerPhone}\n고객차량: ${item.customerCarNumber} / ${item.customerCarModel}\n렌트차량: ${item.rentalCarNumber}\n배차지: ${item.pickupAddress}\n탁송지: ${item.deliveryAddress}\n유량: ${item.fuelLevel}%\n특이사항: ${item.notes}`,
        start: `[출발보고]\n렌트차량 ${item.rentalCarNumber} 출발했습니다.\n출발지: ${item.pickupAddress}\n도착지: ${item.deliveryAddress}`,
        arrival: `[도착보고]\n렌트차량 ${item.rentalCarNumber} 도착했습니다.\n고객: ${item.customerName}\n유량: ${item.fuelLevel}%`,
      };
    }

    const item = props.record;
    return {
      return: `[회차보고]\n렌트차량: ${item.rentalCarNumber}\n회차지: ${item.returnAddress}\n도착지: ${item.arrivalAddress}\n유량: ${item.fuelLevel}%\n주행거리: ${item.mileage.toLocaleString()}km\n특이사항: ${item.notes}`,
      start: `[출발보고]\n회차 차량 ${item.rentalCarNumber} 출발했습니다.\n출발지: ${item.returnAddress}\n도착지: ${item.arrivalAddress}`,
      arrival: `[도착보고]\n회차 차량 ${item.rentalCarNumber} 도착했습니다.\n주행거리: ${item.mileage.toLocaleString()}km`,
    };
  }, [props]);

  const copy = async (label: string, body: string) => {
    await navigator.clipboard?.writeText(body);
    setCopied(label);
  };

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-ink">자동 보고문</h3>
          <p className="mt-1 text-sm text-gray-500">배차보고, 출발보고, 도착보고, 회차보고를 복사할 수 있습니다.</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Paperclip className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-4 grid gap-3">
        {Object.entries(report).map(([key, body]) => (
          <article key={key} className="rounded-lg bg-field p-4">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-ink">{body}</pre>
            <button
              type="button"
              onClick={() => copy(key, body)}
              className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              {copied === key ? "복사됨" : "복사"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
