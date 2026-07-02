"use client";

import { Home } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { officePcLabels, officePcTypes, type DeviceOwnerType } from "@/lib/office-pc-policy";

const initialForm = {
  deviceOwnerType: "personal" as DeviceOwnerType,
  name: "",
  officePcType: "owner_pc",
  location: "",
  email: "",
  code: "",
};

type DetectedDeviceInfo = {
  deviceName: string;
  deviceModel: string;
  deviceType: string;
  os: string;
  browser: string;
};

export default function RegisterDevicePage() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [requested, setRequested] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [detected, setDetected] = useState<DetectedDeviceInfo>({
    deviceName: "감지 중",
    deviceModel: "감지 중",
    deviceType: "",
    os: "",
    browser: "",
  });

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.ok ? response.json() as Promise<{ user?: { isDeveloper?: boolean } }> : null)
      .then((data) => {
        if (data?.user?.isDeveloper) window.location.replace("/admin");
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/detect-device-info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        deviceOwnerType: form.deviceOwnerType,
        officePcType: form.officePcType,
      }),
    })
      .then((response) => response.ok ? response.json() as Promise<DetectedDeviceInfo> : null)
      .then((data) => {
        if (!cancelled && data) setDetected(data);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [form.deviceOwnerType, form.name, form.officePcType]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setTimeout(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  async function requestCode() {
    if (resendSeconds > 0) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/send-verification-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceOwnerType: form.deviceOwnerType,
          name: form.name,
          officePcType: form.officePcType,
          location: form.location,
          email: form.email,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) throw new Error(data.error || "이메일 발송에 실패했습니다.");
      setRequested(true);
      setResendSeconds(30);
      setMessage(data.message || "인증코드를 이메일로 발송했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requested) {
      await requestCode();
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          code: form.code,
          name: form.name,
          deviceOwnerType: form.deviceOwnerType,
          officePcType: form.officePcType,
          location: form.location,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; redirectTo?: string };
      if (!response.ok) throw new Error(data.error || "기기 등록에 실패했습니다.");
      setDone(true);
      router.replace(data.redirectTo || "/auth/pending");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f7f4] px-4 py-8 text-[#16211d]">
      <section className="w-full max-w-[460px] rounded-lg border border-[#d8ded8] bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#116149] text-white"><Home size={22} /></span>
          <div>
            <h1 className="text-xl font-black">RentFlow</h1>
            <p className="text-sm font-bold text-[#68746d]">새 기기 등록</p>
          </div>
        </div>
        {done ? (
          <div className="grid gap-3">
            <p className="rounded-lg bg-[#eef4ed] px-3 py-3 text-sm font-black text-[#116149]">관리자의 승인을 기다려주세요.</p>
            <a className="small-btn w-full" href="/auth">로그인 화면으로</a>
          </div>
        ) : (
          <form className="grid gap-3" onSubmit={submit}>
            <label className="label">
              기기 유형
              <select className="field" value={form.deviceOwnerType} onChange={(event) => setForm({ ...form, deviceOwnerType: event.target.value as DeviceOwnerType })}>
                <option value="personal">개인 휴대폰/태블릿</option>
                <option value="office_pc">사무실 PC</option>
              </select>
            </label>
            {form.deviceOwnerType === "office_pc" ? (
              <>
                <label className="label">
                  PC 구분
                  <select className="field" value={form.officePcType} onChange={(event) => setForm({ ...form, officePcType: event.target.value })}>
                    {officePcTypes.map((type) => <option value={type} key={type}>{officePcLabels[type]}</option>)}
                  </select>
                </label>
                <Field label="위치" value={form.location} onChange={(value) => setForm({ ...form, location: value })} />
                <Field label="승인 요청 이메일" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
                <ReadOnlyField label="기기별칭" value={detected.deviceName} />
                <ReadOnlyField label="기종" value={detected.deviceModel} />
              </>
            ) : (
              <>
                <Field label="이름" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
                <Field label="이메일" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
                <ReadOnlyField label="기기별칭" value={detected.deviceName} />
                <ReadOnlyField label="기종" value={detected.deviceModel} />
              </>
            )}
            {requested ? <Field label="인증코드" inputMode="numeric" maxLength={6} value={form.code} onChange={(value) => setForm({ ...form, code: value.replace(/\D/g, "").slice(0, 6) })} /> : null}
            {message ? <p className="rounded-lg bg-[#f6f7f4] px-3 py-2 text-sm font-black text-[#68746d]">{message}</p> : null}
            <button className="primary-btn w-full" type="submit" disabled={busy}>{requested ? "기기 등록" : "인증코드 받기"}</button>
            {requested ? <button className="small-btn w-full" type="button" onClick={requestCode} disabled={busy || resendSeconds > 0}>{resendSeconds > 0 ? `인증코드 재전송 (${resendSeconds}초)` : "인증코드 재전송"}</button> : null}
          </form>
        )}
      </section>
    </main>
  );
}

function Field({ label, value, onChange, type = "text", inputMode, maxLength }: { label: string; value: string; onChange: (value: string) => void; type?: string; inputMode?: "numeric"; maxLength?: number }) {
  return <label className="label">{label}<input className="field" type={type} value={value} inputMode={inputMode} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} required /></label>;
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="label">
      {label}
      <input className="field cursor-copy bg-[#f1f2ef] text-[#4b5751]" value={value || "-"} readOnly tabIndex={-1} />
    </label>
  );
}
