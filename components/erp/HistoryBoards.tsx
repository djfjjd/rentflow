"use client";

import { AlertTriangle, CheckCircle2, FileDown, Wrench } from "lucide-react";
import { cardTransactions, getCardExpenseByPlate } from "@/lib/corporate-card-data";
import {
  accidentHistories,
  maintenanceHistories,
  notifications,
  vehicleRevenues,
  type AccidentHistory,
  type MaintenanceHistory,
} from "@/lib/erp-data";
import { buildReturnReport, returnAutoProcesses } from "@/lib/auto-return-data";

export function MaintenanceHistoryBoard({ plateNumber }: { plateNumber?: string }) {
  const items = plateNumber ? maintenanceHistories.filter((item) => item.plateNumber === plateNumber) : maintenanceHistories;
  const totalCost = items.reduce((sum, item) => sum + item.cost, 0);

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="정비건수" value={`${items.length}건`} />
        <Metric label="비용 합계" value={`${totalCost.toLocaleString()}원`} />
        <Metric label="긴급/운행불가" value={`${items.filter((item) => item.priority === "높음" || item.priority === "운행불가").length}건`} />
      </div>
      <div className="grid gap-3">
        {items.map((item) => <MaintenanceCard key={item.id} item={item} />)}
      </div>
    </section>
  );
}

export function AccidentHistoryBoard({ plateNumber }: { plateNumber?: string }) {
  const items = plateNumber ? accidentHistories.filter((item) => item.plateNumber === plateNumber) : accidentHistories;
  const totalRepair = items.reduce((sum, item) => sum + item.repairCost, 0);
  const totalClaim = items.reduce((sum, item) => sum + item.claimAmount, 0);

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="사고건수" value={`${items.length}건`} />
        <Metric label="수리비" value={`${totalRepair.toLocaleString()}원`} />
        <Metric label="청구금액" value={`${totalClaim.toLocaleString()}원`} />
      </div>
      <div className="grid gap-3">
        {items.map((item) => <AccidentCard key={item.id} item={item} />)}
      </div>
    </section>
  );
}

export function AutoReturnProcessBoard({ plateNumber }: { plateNumber?: string }) {
  const items = plateNumber ? returnAutoProcesses.filter((item) => item.plateNumber === plateNumber) : returnAutoProcesses;

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-ink">자동 회차 처리 이력</h2>
          <p className="mt-1 text-sm text-gray-500">회차계기판 사진 OCR/mock OCR 기반 자동 회차 결과입니다.</p>
        </div>
        <span className="rounded-md bg-primary/10 px-3 py-1 text-xs font-black text-primary">{items.length}건</span>
      </div>
      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-lg bg-field p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-black text-primary">{item.plateNumber} · {item.status}</p>
                <p className="mt-2 text-sm font-semibold text-gray-700">
                  주행거리 {item.extractedMileage.toLocaleString()}km · 유량 {item.extractedFuelLevel}% · 신뢰도 {item.confidenceScore}%
                </p>
                <p className="mt-1 text-xs font-semibold text-gray-500">
                  배차 {item.matchedDispatchId ?? "확인필요"} · 회차 {item.createdReturnId ?? "미생성"} · {formatDate(item.createdAt)}
                </p>
              </div>
              <pre className="whitespace-pre-wrap rounded-lg bg-white p-3 text-xs font-semibold leading-5 text-gray-700">{buildReturnReport(item)}</pre>
            </div>
          </article>
        ))}
        {items.length === 0 && (
          <div className="rounded-lg bg-field p-4 text-center text-sm font-bold text-gray-500">자동 회차 처리 이력이 없습니다.</div>
        )}
      </div>
    </section>
  );
}

export function NotificationCenter() {
  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        {notifications.map((item) => (
          <article key={item.id} className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-primary">{item.type} · {item.status}</p>
                <h2 className="mt-1 text-lg font-black text-ink">{item.title}</h2>
                <p className="mt-2 text-sm text-gray-600">{item.message}</p>
                <p className="mt-2 text-xs font-semibold text-gray-500">예약 발송: {item.scheduledAt}</p>
              </div>
              <button type="button" className="rounded-lg border border-line px-3 py-2 text-xs font-bold">읽음</button>
            </div>
          </article>
        ))}
      </div>
      <aside className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-ink">알림 설정</h2>
        {["하루 전 알림", "1시간 전 알림", "정각 알림", "정비 알림", "청구 알림"].map((label) => (
          <label key={label} className="mt-4 flex items-center justify-between gap-3 text-sm font-bold text-gray-700">
            {label}
            <input type="checkbox" defaultChecked className="h-5 w-5" />
          </label>
        ))}
        <button type="button" className="mt-5 min-h-11 w-full rounded-lg bg-primary px-4 text-sm font-bold text-white">
          Notification API 권한 요청 mock
        </button>
      </aside>
    </section>
  );
}

export function RevenueBoard({ plateNumber }: { plateNumber?: string }) {
  const items = plateNumber ? vehicleRevenues.filter((item) => item.plateNumber === plateNumber) : vehicleRevenues;
  const cardExpense = getCardExpenseByPlate(plateNumber);
  const totalRevenue = items.reduce((sum, item) => sum + item.totalRevenue, 0);
  const baseCost = items.reduce((sum, item) => sum + item.totalCost, 0);
  const totalCost = baseCost + cardExpense;
  const totalProfit = totalRevenue - totalCost;

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Metric label="총매출" value={`${totalRevenue.toLocaleString()}원`} />
        <Metric label="기존 비용" value={`${baseCost.toLocaleString()}원`} />
        <Metric label="법인카드 비용" value={`${cardExpense.toLocaleString()}원`} />
        <Metric label="순이익" value={`${totalProfit.toLocaleString()}원`} />
      </div>
      <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-black text-ink">차량별 매출분석</h2>
          <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line px-3 text-sm font-bold">
            <FileDown className="h-4 w-4" aria-hidden="true" />
            CSV export
          </button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-line text-xs text-gray-500">
              <tr>
                <th className="py-3">차량번호</th>
                <th>기간</th>
                <th>총매출</th>
                <th>기존 비용</th>
                <th>카드 비용</th>
                <th>순이익</th>
                <th>수익률</th>
                <th>배차건수</th>
                <th>대여일수</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((item) => {
                const rowCardExpense = getCardExpenseByPlate(item.plateNumber);
                const rowCost = item.totalCost + rowCardExpense;
                const rowProfit = item.totalRevenue - rowCost;
                const rowProfitRate = item.totalRevenue ? Math.round((rowProfit / item.totalRevenue) * 1000) / 10 : 0;
                return (
                  <tr key={item.id}>
                    <td className="py-3 font-black text-primary">{item.plateNumber}</td>
                    <td>{item.period}</td>
                    <td>{item.totalRevenue.toLocaleString()}원</td>
                    <td>{item.totalCost.toLocaleString()}원</td>
                    <td>{rowCardExpense.toLocaleString()}원</td>
                    <td className="font-black text-ink">{rowProfit.toLocaleString()}원</td>
                    <td>{rowProfitRate}%</td>
                    <td>{item.dispatchCount}건</td>
                    <td>{item.rentalDays}일</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-ink">반영된 법인카드 거래</h2>
        <div className="mt-3 grid gap-2">
          {cardTransactions
            .filter((item) => !plateNumber || item.linkedPlateNumber === plateNumber)
            .map((item) => (
              <p key={item.id} className="rounded-lg bg-field p-3 text-sm font-semibold text-gray-700">
                {item.approvedAt.slice(0, 10)} · {item.linkedPlateNumber ?? "미연결"} · {item.category} · {item.totalAmount.toLocaleString()}원 · {item.merchantName}
              </p>
            ))}
        </div>
      </div>
    </section>
  );
}

function MaintenanceCard({ item }: { item: MaintenanceHistory }) {
  return (
    <article className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <p className="flex items-center gap-2 text-sm font-bold text-primary"><Wrench className="h-4 w-4" />{item.maintenanceType} · {item.status}</p>
      <h2 className="mt-2 text-lg font-black text-ink">{item.plateNumber} · {item.title}</h2>
      <p className="mt-2 text-sm leading-6 text-gray-600">{item.description}</p>
      <p className="mt-2 text-xs font-semibold text-gray-500">{item.repairShopName} · {item.foundDate} · {item.cost.toLocaleString()}원</p>
      <button type="button" className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-bold text-white">
        <CheckCircle2 className="h-4 w-4" />정비 완료 처리
      </button>
    </article>
  );
}

function AccidentCard({ item }: { item: AccidentHistory }) {
  return (
    <article className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <p className="flex items-center gap-2 text-sm font-bold text-amber"><AlertTriangle className="h-4 w-4" />{item.accidentType} · {item.status}</p>
      <h2 className="mt-2 text-lg font-black text-ink">{item.plateNumber} · {item.accidentPart}</h2>
      <p className="mt-2 text-sm leading-6 text-gray-600">{item.description}</p>
      <p className="mt-2 text-xs font-semibold text-gray-500">보험접수 {item.insuranceNumber} · 수리비 {item.repairCost.toLocaleString()}원 · 청구 {item.claimAmount.toLocaleString()}원</p>
      <button type="button" className="mt-3 inline-flex min-h-10 items-center rounded-lg border border-line px-3 text-sm font-bold">
        정비이력 생성
      </button>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <p className="text-xs font-bold text-gray-500">{label}</p>
      <p className="mt-2 text-xl font-black text-ink">{value}</p>
    </article>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ko-KR");
}
