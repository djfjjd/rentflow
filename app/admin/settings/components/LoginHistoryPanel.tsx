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
    <section className="panel overflow-hidden">
      <h2 className="mb-3 text-xl font-black">로그인 기록</h2>
      {message ? <p className="mb-3 rounded-lg bg-[#fff7f4] px-3 py-2 text-sm font-black text-[#a13f24]">{message}</p> : null}
      <div data-horizontal-scroll="true" className="overflow-x-auto">
        <table className="admin-table w-full min-w-[920px] table-fixed text-left text-sm">
          <thead className="sticky top-0 z-10 bg-white"><tr className="border-b"><th className="w-[150px]">로그인 시간</th><th className="w-[170px]">사용자</th><th className="w-[220px]">이메일</th><th className="w-[240px]">기기</th><th className="w-[150px]">IP</th><th className="w-[110px]">상태</th></tr></thead>
          <tbody>
            {logs.map((log) => (
              <tr className="h-14 border-b" key={log.id}>
                <td className="whitespace-nowrap font-bold">{formatDateTime(log.createdAt)}</td>
                <td className="truncate font-black" title={userLabel(log)}>{userLabel(log)}</td>
                <td className="truncate" title={log.email || "-"}>{log.email || "-"}</td>
                <td className="truncate" title={deviceLabel(log)}>{deviceLabel(log)}</td>
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
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function userLabel(log: LoginLog) {
  const position = log.position || positionFromRole(log.role);
  const name = log.userName || emailPrefix(log.email) || "미등록 사용자";
  return `${name}${position ? `(${position})` : ""}`;
}

function deviceLabel(log: LoginLog) {
  const alias = log.deviceAlias || "알 수 없는 기기";
  const detail = [log.os, log.browser].filter(Boolean).join(" ");
  return detail ? `${alias}(${detail})` : alias;
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
