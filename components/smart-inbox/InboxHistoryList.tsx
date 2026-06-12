import { Clock3 } from "lucide-react";
import type { InboxHistoryItem } from "./types";

const history: InboxHistoryItem[] = [
  {
    id: "IN-2408",
    title: "12가3456 사고부위 사진",
    meta: "오전 10:42 · 보험접수 123456789",
    status: "분석 완료",
  },
  {
    id: "IN-2407",
    title: "카톡 캡처 3장",
    meta: "오전 09:18 · 고객 확인 대기",
    status: "확인 필요",
  },
  {
    id: "IN-2406",
    title: "위임장 PDF",
    meta: "어제 · 계약서함 연결",
    status: "연결 완료",
  },
];

export function InboxHistoryList() {
  return (
    <section className="pb-6">
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-base font-bold text-ink">최근 접수 이력</h2>
        <button type="button" className="text-sm font-bold text-primary">
          전체보기
        </button>
      </div>
      <div className="space-y-3">
        {history.map((item) => (
          <article key={item.id} className="rounded-lg border border-line bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-ink">{item.title}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                  {item.meta}
                </p>
              </div>
              <span className="shrink-0 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">
                {item.status}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
