"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { positions, type StaffUser } from "@/lib/staff-device-types";

const emptyStaffForm = {
  name: "",
  position: "직원",
  email: "",
};

export function StaffManagement() {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [form, setForm] = useState(emptyStaffForm);
  const [editing, setEditing] = useState<StaffUser | null>(null);
  const [message, setMessage] = useState("");

  async function loadStaff() {
    const response = await fetch("/api/admin/staff", { cache: "no-store" });
    if (!response.ok) throw new Error("직원 목록을 불러오지 못했습니다.");
    setStaff((await response.json()) as StaffUser[]);
  }

  useEffect(() => {
    loadStaff().catch((error) => setMessage(error instanceof Error ? error.message : String(error)));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const payload = editing ? { ...editing, ...form } : form;
    const response = await fetch(editing ? `/api/admin/staff?id=${encodeURIComponent(editing.id)}` : "/api/admin/staff", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setMessage(data.error || "직원 저장에 실패했습니다.");
      return;
    }
    setForm(emptyStaffForm);
    setEditing(null);
    await loadStaff();
    setMessage(editing ? "직원 정보가 수정되었습니다." : "신규 직원이 등록되었습니다.");
  }

  function startEdit(user: StaffUser) {
    setEditing(user);
    setForm({
      name: user.name,
      position: user.position,
      email: user.email,
    });
  }

  async function patchUser(user: StaffUser, payload: Record<string, unknown>, doneMessage: string) {
    if (payload.action === "retire" && !confirm(`${user.name} 직원을 퇴사 처리하시겠습니까? 연결된 개인 기기와 세션이 삭제됩니다.`)) return;
    const response = await fetch(`/api/admin/staff?id=${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setMessage(data.error || "직원 처리에 실패했습니다.");
      return;
    }
    await loadStaff();
    setMessage(doneMessage);
  }

  async function deleteUser(user: StaffUser) {
    if (!confirm(`${user.name} 직원을 삭제하시겠습니까? 연결된 개인 기기와 세션이 삭제됩니다.`)) return;
    const response = await fetch(`/api/admin/staff?id=${encodeURIComponent(user.id)}`, { method: "DELETE" });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setMessage(data.error || "직원 삭제에 실패했습니다.");
      return;
    }
    await loadStaff();
    setMessage("직원이 삭제 처리되었습니다.");
  }

  const activeCount = useMemo(() => staff.filter((user) => user.status === "재직").length, [staff]);

  return (
    <section className="space-y-4">
      <form className="panel space-y-3" onSubmit={submit}>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-black">{editing ? "직원 수정" : "신규 직원 등록"}</h2>
            <p className="text-sm font-bold text-[#68746d]">직책을 기준으로 내부 권한이 자동 적용됩니다. 재직 직원 {activeCount}명</p>
          </div>
          {editing ? <button className="small-btn" type="button" onClick={() => { setEditing(null); setForm(emptyStaffForm); }}>신규 등록으로 전환</button> : null}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="이름" value={form.name} onChange={(value) => setForm({ ...form, name: value })} required />
          <Field label="이메일" value={form.email} onChange={(value) => setForm({ ...form, email: value })} required type="email" />
          <label className="label">직책<select className="field" value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })}>{positions.map((position) => <option key={position}>{position}</option>)}</select></label>
        </div>
        <button className="primary-btn" type="submit">{editing ? "수정 저장" : "직원 등록"}</button>
      </form>

      {message ? <p className="rounded-lg bg-[#eef4ed] px-3 py-2 text-sm font-black text-[#116149]">{message}</p> : null}

      <section className="panel overflow-hidden">
        <h2 className="mb-3 text-xl font-black">직원 관리</h2>
        <div data-horizontal-scroll="true" className="overflow-x-auto">
          <table className="admin-table w-full min-w-[880px] text-left text-sm">
            <thead><tr className="border-b"><th>이름</th><th>이메일</th><th>직책</th><th>상태</th><th>등록일</th><th>관리</th></tr></thead>
            <tbody>
              {staff.map((user) => (
                <tr className="border-b" key={user.id}>
                  <td>{user.name}</td><td>{user.email}</td><td>{user.position}</td><td>{user.status}</td><td>{formatDate(user.createdAt)}</td>
                  <td className="flex min-w-[220px] flex-wrap gap-1 py-2">
                    <button className="small-btn" type="button" onClick={() => startEdit(user)}>수정</button>
                    <button className="danger-btn" type="button" onClick={() => patchUser(user, { action: "retire" }, "퇴사 처리되었고 연결된 개인 기기와 세션이 삭제되었습니다.")}>퇴사 처리</button>
                    <button className="danger-btn" type="button" onClick={() => deleteUser(user)}>삭제</button>
                  </td>
                </tr>
              ))}
              {!staff.length ? <tr><td className="py-6 text-center font-bold text-[#68746d]" colSpan={6}>등록된 직원이 없습니다.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function Field({ label, value, onChange, required, type = "text" }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string }) {
  return <label className="label">{label}<input className="field" type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} /></label>;
}

function formatDate(value: string) {
  return value ? value.slice(0, 10) : "-";
}
