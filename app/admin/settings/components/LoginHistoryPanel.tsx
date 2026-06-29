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
        <table className="admin-table w-full min-w-[1080px] text-left text-sm">
          <thead><tr className="border-b"><th>로그인 시간</th><th>이메일</th><th>로그인 ID</th><th>Role</th><th>기기</th><th>IP</th><th>UserAgent</th><th>상태</th></tr></thead>
          <tbody>
            {logs.map((log) => (
              <tr className="border-b" key={log.id}>
                <td>{formatDateTime(log.createdAt)}</td>
                <td>{log.email || "-"}</td>
                <td>{log.loginId || "-"}</td>
                <td>{log.role || "-"}</td>
                <td>{log.deviceId || "-"}</td>
                <td>{log.ip || "-"}</td>
                <td className="max-w-[260px] truncate" title={log.userAgent}>{log.userAgent || "-"}</td>
                <td className={log.status === "success" ? "font-black text-[#116149]" : "font-black text-[#a13f24]"}>{log.status}</td>
              </tr>
            ))}
            {!logs.length ? <tr><td className="py-6 text-center font-bold text-[#68746d]" colSpan={8}>로그인 기록이 없습니다.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatDateTime(value: string) {
  return value ? value.replace("T", " ").slice(0, 16) : "-";
}
