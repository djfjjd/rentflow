"use client";

import { useEffect, useState } from "react";
import type { StaffDevice, StaffUser } from "@/lib/staff-device-types";
import { deviceTypeLabel } from "@/lib/device-detection";

export function DeviceManagement() {
  const [devices, setDevices] = useState<StaffDevice[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<StaffDevice | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    const [deviceResponse, staffResponse] = await Promise.all([
      fetch("/api/admin/devices", { cache: "no-store" }),
      fetch("/api/admin/staff", { cache: "no-store" }),
    ]);
    if (!deviceResponse.ok || !staffResponse.ok) throw new Error("기기 관리 데이터를 불러오지 못했습니다.");
    setDevices((await deviceResponse.json()) as StaffDevice[]);
    setStaff((await staffResponse.json()) as StaffUser[]);
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
    setSelectedDevice(null);
    setMessage(doneMessage);
  }

  async function deleteDevice(device: StaffDevice) {
    if (!confirm(`${device.deviceAlias || device.deviceId} 기기를 삭제하시겠습니까?`)) return;
    const response = await fetch(`/api/admin/devices?id=${encodeURIComponent(device.id)}`, { method: "DELETE" });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setMessage(data.error || "기기 삭제에 실패했습니다.");
      return;
    }
    await load();
    setSelectedDevice(null);
    setMessage("기기가 삭제되었습니다.");
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <article className="panel min-h-32">
          <h3 className="text-lg font-black">기기 승인</h3>
          <p className="mt-2 text-sm font-bold text-[#68746d]">승인대기 기기는 기존 직원 목록에서 연결할 직원을 선택한 뒤 승인합니다.</p>
        </article>
        <article className="panel min-h-32">
          <h3 className="text-lg font-black">퇴사 연동 차단</h3>
          <p className="mt-2 text-sm font-bold text-[#68746d]">직원 퇴사 처리 시 연결된 모든 기기와 로그인 세션이 자동 차단됩니다.</p>
        </article>
      </div>
      {message ? <p className="rounded-lg bg-[#eef4ed] px-3 py-2 text-sm font-black text-[#116149]">{message}</p> : null}
      <section className="panel overflow-hidden">
        <h2 className="mb-3 text-xl font-black">기기 관리</h2>
        <div data-horizontal-scroll="true" className="overflow-x-auto">
          <table className="admin-table w-full min-w-[1660px] text-left text-sm">
            <thead><tr className="border-b"><th>이름</th><th>직책(Position)</th><th>권한(Role)</th><th>기기 별칭</th><th>기종</th><th>기기 유형</th><th>이메일</th><th>상태</th><th>자동 로그인</th><th>최근 접속</th><th>승인자</th><th>승인일시</th><th>관리</th></tr></thead>
            <tbody>
              {devices.map((device) => (
                <tr className="border-b" key={device.id}>
                  <td><button className="font-black text-[#116149]" type="button" onClick={() => setSelectedDevice(device)}>{device.userName || "직원 미연결"}</button></td>
                  <td>{device.position || "-"}</td><td>{device.role || "-"}</td><td>{device.deviceAlias || "-"}</td><td>{device.deviceModel || "-"}</td><td>{deviceTypeLabel(device.deviceType)}</td><td>{device.email || "-"}</td><td>{device.status}</td>
                  <td>
                    {device.deviceType === "desktop" ? (
                      <span className="rounded-full bg-[#f1f2ef] px-3 py-1 text-xs font-black text-[#68746d]">자동 로그인 불가</span>
                    ) : (
                      <button
                        className={`rounded-full px-3 py-1 text-xs font-black ${device.autoLogin ? "bg-[#e3f3eb] text-[#116149]" : "bg-[#f1f2ef] text-[#68746d]"}`}
                        type="button"
                        onClick={() => patchDevice(device, { action: "setAutoLogin", autoLogin: !device.autoLogin }, device.autoLogin ? "자동 로그인이 꺼졌습니다." : "자동 로그인이 켜졌습니다.")}
                      >
                        {device.autoLogin ? "ON" : "OFF"}
                      </button>
                    )}
                  </td>
                  <td>{formatDateTime(device.lastSeenAt)}</td><td>{device.approvedBy || "-"}</td><td>{formatDateTime(device.approvedAt)}</td>
                  <td className="flex min-w-[420px] flex-wrap gap-1 py-2">
                    <AssignSelect staff={staff} value={device.userId || ""} onChange={(userId) => patchDevice(device, { userId }, "기기 직원 연결이 변경되었습니다.")} />
                    <button className="small-btn" type="button" onClick={() => patchDevice(device, { action: "approve", userId: device.userId }, "기기가 승인되었습니다.")}>승인</button>
                    <button className="small-btn" type="button" onClick={() => patchDevice(device, { action: "remoteLogout" }, "원격 로그아웃 처리되었습니다.")}>원격 로그아웃</button>
                    <button className="danger-btn" type="button" onClick={() => patchDevice(device, { action: "block" }, "기기가 차단되었고 세션이 종료되었습니다.")}>차단</button>
                    <button className="danger-btn" type="button" onClick={() => deleteDevice(device)}>삭제</button>
                    <button className="small-btn" type="button" onClick={() => setSelectedDevice(device)}>상세</button>
                  </td>
                </tr>
              ))}
              {!devices.length ? <tr><td className="py-6 text-center font-bold text-[#68746d]" colSpan={13}>등록된 기기가 없습니다. 첫 직원 로그인 후 승인대기 기기가 표시됩니다.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
      {selectedDevice ? <DeviceDetailModal device={selectedDevice} onClose={() => setSelectedDevice(null)} /> : null}
    </section>
  );
}

function AssignSelect({ staff, value, onChange }: { staff: StaffUser[]; value: string; onChange: (value: string) => void }) {
  return (
    <select className="field min-h-10 w-36 py-1 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">직원 변경</option>
      {staff.filter((user) => user.status !== "퇴사").map((user) => <option value={user.id} key={user.id}>{user.name}</option>)}
    </select>
  );
}

function DeviceDetailModal({ device, onClose }: { device: StaffDevice; onClose: () => void }) {
  const rows = [
    ["직원명", device.userName || "직원 미연결"],
    ["직책(Position)", device.position || "-"],
    ["권한(Role)", device.role || "-"],
    ["이메일", device.email || "-"],
    ["기기 별칭", device.deviceAlias || "-"],
    ["기종(Device Model)", device.deviceModel || "-"],
    ["기기 유형", deviceTypeLabel(device.deviceType)],
    ["운영체제(OS)", device.os || "-"],
    ["브라우저", device.browser || "-"],
    ["Device ID", device.deviceId],
    ["최초 등록일", formatDateTime(device.createdAt)],
    ["최근 로그인", formatDateTime(device.lastSeenAt)],
    ["상태", device.status],
    ["자동 로그인", device.autoLogin ? "ON" : "OFF"],
    ["승인자", device.approvedBy || "-"],
    ["승인일시", formatDateTime(device.approvedAt)],
  ];
  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center bg-black/40 p-4">
      <section className="w-full max-w-2xl rounded-lg bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-xl font-black">기기 상세</h3>
          <button className="small-btn" type="button" onClick={onClose}>닫기</button>
        </div>
        <dl className="grid gap-2 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div className="rounded-lg border border-[#d8ded8] bg-[#f6f7f4] p-3" key={label}>
              <dt className="text-xs font-black text-[#68746d]">{label}</dt>
              <dd className="mt-1 break-all text-sm font-black text-[#16211d]">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

function formatDateTime(value: string) {
  return value ? value.replace("T", " ").slice(0, 16) : "-";
}
