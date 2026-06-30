"use client";

import { useEffect, useState } from "react";
import type { LoginLog } from "@/lib/staff-device-types";

export function LoginHistoryPanel() {
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadLogs() {
      const response = await fetch("/api/admin/login-logs", { cache: "no-store" });
      if (!response.ok) throw new Error("로그인 기록을 불러오지 못했습니다.");
      setLogs((await response.json()) as LoginLog[]);
    }
    loadLogs().catch((error) => setMessage(error instanceof Error ? error.message : String(error)));
  }, []);

  return (
    <section className="panel overflow-visible">
      <h2 className="mb-3 text-xl font-black">로그인 기록</h2>
      {message ? <p className="mb-3 rounded-lg bg-[#fff7f4] px-3 py-2 text-sm font-black text-[#a13f24]">{message}</p> : null}
      <div data-horizontal-scroll="true" className="overflow-x-auto">
        <table className="admin-table w-full min-w-[920px] table-fixed text-left text-sm">
          <thead className="sticky top-0 z-10 bg-white"><tr className="border-b"><th className="w-[170px] pr-6">로그인 시간</th><th className="w-[160px] pl-3">사용자</th><th className="w-[220px]">이메일</th><th className="w-[210px]">기기</th><th className="w-[150px]">IP</th><th className="w-[110px]">상태</th></tr></thead>
          <tbody>
            {logs.map((log) => (
              <tr className="h-14 border-b" key={log.id}>
                <td className="whitespace-nowrap pr-6 font-bold">{formatDateTime(log.createdAt)}</td>
                <td className="truncate pl-3 font-black" title={userLabel(log)}>{userLabel(log)}</td>
                <td className="truncate" title={log.email || "-"}>{log.email || "-"}</td>
                <td><DeviceCell log={log} /></td>
                <td className="truncate" title={log.ip || "-"}>{log.ip || "-"}</td>
                <td><StatusBadge status={log.status} message={log.message} /></td>
              </tr>
            ))}
            {!logs.length ? <tr><td className="py-6 text-center font-bold text-[#68746d]" colSpan={6}>로그인 기록이 없습니다.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatDateTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.replace("T", " ").slice(0, 16);
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date).replace(/\.\s?/g, ".").replace(/\.$/, "").replace(/\s+/, " ");
}

function userLabel(log: LoginLog) {
  const position = log.position || positionFromRole(log.role);
  const name = log.userName || emailPrefix(log.email) || "미등록 사용자";
  return `${name}${position ? `(${position})` : ""}`;
}

function DeviceCell({ log }: { log: LoginLog }) {
  return (
    <span className="group relative inline-block max-w-full align-middle">
      <span className="block max-w-[190px] truncate font-bold text-[#16211d]" title={deviceTooltip(log)}>{deviceName(log)}</span>
      <span className="pointer-events-none absolute left-0 top-7 z-50 hidden w-72 rounded-lg border border-[#d8ded8] bg-white p-3 text-xs font-bold leading-5 text-[#34423b] shadow-xl group-hover:block">
        <span className="block">기종: {log.deviceModel || deviceName(log)}</span>
        <span className="block">OS: {log.os || "-"}</span>
        <span className="block">브라우저: {log.browser || "-"}</span>
        <span className="block">Device ID: {shortDeviceId(log.deviceId)}</span>
        {log.userAgent ? <span className="mt-1 block truncate">UA: {truncate(log.userAgent, 80)}</span> : null}
      </span>
    </span>
  );
}

function deviceName(log: LoginLog) {
  return log.deviceAlias || "알 수 없는 기기";
}

function deviceTooltip(log: LoginLog) {
  return [
    `기종: ${log.deviceModel || deviceName(log)}`,
    `OS: ${log.os || "-"}`,
    `브라우저: ${log.browser || "-"}`,
    `Device ID: ${shortDeviceId(log.deviceId)}`,
    log.userAgent ? `UA: ${truncate(log.userAgent, 80)}` : "",
  ].filter(Boolean).join("\n");
}

function shortDeviceId(value: string) {
  return value ? `${value.slice(0, 12)}${value.length > 12 ? "..." : ""}` : "-";
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function StatusBadge({ status, message }: { status: string; message?: string }) {
  const label = statusLabel(status, message);
  const success = label === "성공";
  const blocked = label === "차단" || label === "실패";
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${success ? "bg-[#e3f3eb] text-[#116149]" : blocked ? "bg-[#fff1ef] text-[#a13f24]" : "bg-[#f1f2ef] text-[#68746d]"}`}>{label}</span>;
}

function statusLabel(status: string, message = "") {
  const source = `${status} ${message}`.toLowerCase();
  if (source.includes("blocked") || source.includes("차단")) return "차단";
  if (source.includes("pending") || source.includes("승인대기")) return "승인대기";
  if (source.includes("remote") || source.includes("logout") || source.includes("원격")) return "원격로그아웃";
  if (status === "success") return "성공";
  if (status === "failure") return "실패";
  return status || "-";
}

function positionFromRole(role: string) {
  if (role === "super_admin") return "관리자";
  if (role === "manager") return "실장님";
  if (role === "staff") return "직원";
  return "";
}

function emailPrefix(email: string) {
  return email ? email.split("@")[0] : "";
}
