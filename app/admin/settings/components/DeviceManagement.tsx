"use client";

import { useEffect, useState } from "react";
import type { StaffDevice } from "@/lib/staff-device-types";
import { officePcLabels, officePcRoles, officePcTypes } from "@/lib/office-pc-policy";

export function DeviceManagement() {
  const [devices, setDevices] = useState<StaffDevice[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<StaffDevice | null>(null);
  const [activeTab, setActiveTab] = useState<"personal" | "office_pc">("personal");
  const [message, setMessage] = useState("");

  async function load() {
    const deviceResponse = await fetch("/api/admin/devices", { cache: "no-store" });
    if (!deviceResponse.ok) throw new Error("기기 관리 데이터를 불러오지 못했습니다.");
    setDevices((await deviceResponse.json()) as StaffDevice[]);
  }

  useEffect(() => {
    load().catch((error) => setMessage(error instanceof Error ? error.message : String(error)));
  }, []);

  async function patchDevice(device: StaffDevice, payload: Record<string, unknown>, doneMessage: string) {
    if (payload.action === "block" && !confirm(`${device.deviceAlias || device.deviceId} 기기를 차단하시겠습니까? 해당 기기의 세션이 종료됩니다.`)) return;
    if (payload.action === "approve" && !confirm(`${device.deviceAlias || device.deviceId} 기기를 승인하시겠습니까?`)) return;
    if (payload.action === "remoteLogout" && !confirm(`${device.deviceAlias || device.deviceId} 기기를 원격 로그아웃하시겠습니까? 다음 접속부터 비밀번호 로그인이 필요합니다.`)) return;
    if (payload.action === "setAutoLogin" && payload.autoLogin === false && !confirm(`${device.deviceAlias || device.deviceId} 기기의 자동 로그인을 끄시겠습니까?`)) return;
    const response = await fetch(`/api/admin/devices?id=${encodeURIComponent(device.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setMessage(data.error || "기기 처리에 실패했습니다.");
      return;
    }
    await load();
    setMessage(doneMessage);
  }

  async function deleteDevice(device: StaffDevice) {
    const response = await fetch(`/api/admin/devices?id=${encodeURIComponent(device.id)}`, { method: "DELETE" });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setMessage(data.error || "기기 삭제에 실패했습니다.");
      return;
    }
    await load();
    setDeleteTarget(null);
    setMessage("기기가 삭제 처리되었습니다.");
  }

  const personalDevices = devices.filter(isPersonalDevice);

  return (
    <section className="space-y-4">
      {message ? <p className="rounded-lg bg-[#eef4ed] px-3 py-2 text-sm font-black text-[#116149]">{message}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button className={activeTab === "personal" ? "primary-btn" : "small-btn"} type="button" onClick={() => setActiveTab("personal")}>개인 기기</button>
        <button className={activeTab === "office_pc" ? "primary-btn" : "small-btn"} type="button" onClick={() => setActiveTab("office_pc")}>사무실 PC</button>
      </div>
      {activeTab === "office_pc" ? (
        <OfficePcCards devices={devices} onPatch={patchDevice} onRequestDelete={setDeleteTarget} />
      ) : (
      <section className="panel overflow-hidden">
        <h2 className="mb-3 text-xl font-black">개인 기기 관리</h2>
        <div data-horizontal-scroll="true" className="overflow-x-auto">
          <table className="admin-table w-full min-w-[1180px] text-left text-sm">
            <thead><tr className="border-b"><th>직원명</th><th>이메일</th><th>직책</th><th>기기 별칭</th><th>기종</th><th>상태</th><th>최근 접속</th><th>작업</th></tr></thead>
            <tbody>
              {personalDevices.map((device) => (
                <tr className="border-b" key={device.id}>
                  <td className="font-black text-[#116149]">{device.userName || "직원 미연결"}</td>
                  <td>{device.email || "-"}</td><td>{device.position || "-"}</td><td>{device.deviceAlias || "-"}</td><td>{device.deviceModel || "-"}</td><td>{formatDeviceStatus(device.status)}</td><td>{formatDateTime(device.lastSeenAt)}</td>
                  <td className="flex min-w-[220px] flex-wrap gap-1 py-2">
                    {isPendingDevice(device.status) ? <button className="small-btn" type="button" onClick={() => patchDevice(device, { action: "approve", userId: device.userId }, "기기가 승인되었습니다.")}>승인</button> : null}
                    <button className="danger-btn" type="button" onClick={() => setDeleteTarget(device)}>원격로그아웃 및 삭제</button>
                  </td>
                </tr>
              ))}
              {!personalDevices.length ? <tr><td className="py-6 text-center font-bold text-[#68746d]" colSpan={8}>등록된 개인 기기가 없습니다.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
      )}
      {deleteTarget ? <DeviceDeleteConfirmModal device={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={() => deleteDevice(deleteTarget)} /> : null}
    </section>
  );
}

function OfficePcCards({ devices, onPatch, onRequestDelete }: { devices: StaffDevice[]; onPatch: (device: StaffDevice, payload: Record<string, unknown>, doneMessage: string) => void; onRequestDelete: (device: StaffDevice) => void }) {
  return (
    <section className="grid gap-3 md:grid-cols-2">
      {officePcTypes.map((type) => {
        const device = devices.find((item) => item.deviceOwnerType === "office_pc" && item.officePcType === type);
        return (
          <article className="panel min-h-56" key={type}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black">{officePcLabels[type]}</h3>
                <p className="mt-1 text-sm font-bold text-[#68746d]">권한: {officePcRoles[type]}</p>
              </div>
              <span className="rounded-full bg-[#eef4ed] px-3 py-1 text-xs font-black text-[#116149]">{device ? formatDeviceStatus(device.status) : "미등록"}</span>
            </div>
            {device ? (
              <div className="mt-4 grid gap-2 text-sm font-bold text-[#34423b]">
                <p>기기 별칭: {device.deviceAlias || "-"}</p>
                <p>기종: {device.deviceModel || "-"}</p>
                <p>위치: {device.location || "-"}</p>
                <p>승인 요청 이메일: {device.email || "-"}</p>
                <p>최근 접속: {formatDateTime(device.lastSeenAt)}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {isPendingDevice(device.status) ? <button className="small-btn" type="button" onClick={() => onPatch(device, { action: "approve" }, "사무실 PC가 승인되었습니다.")}>승인</button> : null}
                  <button className="danger-btn" type="button" onClick={() => onRequestDelete(device)}>원격로그아웃 및 삭제</button>
                </div>
              </div>
            ) : (
              <p className="mt-4 rounded-lg bg-[#f6f7f4] p-3 text-sm font-bold text-[#68746d]">아직 등록된 PC가 없습니다. 해당 PC에서 최초 기기 등록을 진행하면 승인대기로 표시됩니다.</p>
            )}
          </article>
        );
      })}
    </section>
  );
}

function DeviceDeleteConfirmModal({ device, onCancel, onConfirm }: { device: StaffDevice; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center bg-black/40 p-4">
      <section className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
        <div className="grid gap-3">
          <h3 className="text-xl font-black">원격로그아웃 및 삭제</h3>
          <p className="text-sm font-bold text-[#34423b]">{device.deviceAlias || device.deviceId}</p>
          <p className="text-sm font-black text-[#16211d]">이 기기를 원격 로그아웃하고 삭제 처리하시겠습니까?</p>
          <p className="rounded-lg bg-[#fff1ef] px-3 py-2 text-sm font-bold text-[#9f2d21]">삭제 처리 후 해당 기기는 다시 로그인하려면 새 기기 등록을 진행해야 합니다.</p>
          <div className="mt-2 flex justify-end gap-2">
            <button className="small-btn" type="button" onClick={onCancel}>취소</button>
            <button className="danger-btn" type="button" onClick={onConfirm}>원격로그아웃 및 삭제</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function formatDateTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}.${part("month")}.${part("day")} ${part("hour")}:${part("minute")}`;
}

function isPersonalDevice(device: StaffDevice) {
  return device.deviceScope === "personal_mobile" || device.deviceOwnerType !== "office_pc";
}

function isPendingDevice(status: string) {
  return ["승인대기", "pending_approval", "email_verified_pending", "이메일인증대기"].includes(status);
}

function formatDeviceStatus(status: string) {
  if (isPendingDevice(status)) return "승인대기";
  if (status === "approved" || status === "승인") return "승인";
  if (status === "blocked" || status === "차단") return "차단";
  if (status === "deleted") return "삭제됨";
  return status || "-";
}
