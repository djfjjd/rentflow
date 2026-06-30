"use client";

import { Home } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

const initialForm = {
  name: "",
  position: "",
  deviceAlias: "",
  deviceModel: "",
  email: "",
  code: "",
};

export default function RegisterDevicePage() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [requested, setRequested] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    const userAgent = navigator.userAgent || "";
    setForm((current) => ({
      ...current,
      deviceAlias: current.deviceAlias || defaultDeviceAlias(userAgent),
      deviceModel: current.deviceModel || guessDeviceModel(userAgent),
    }));
    fetch("/api/auth/me")
      .then((response) => response.ok ? response.json() as Promise<{ user?: { isDeveloper?: boolean } }> : null)
      .then((data) => {
        if (data?.user?.isDeveloper) window.location.replace("/admin");
      })
      .catch(() => undefined);
  }, []);

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
        body: JSON.stringify(form),
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
        body: JSON.stringify({ email: form.email, code: form.code }),
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
            <Field label="이름" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
            <Field label="직책" value={form.position} onChange={(value) => setForm({ ...form, position: value })} />
            <Field label="기기 별칭" value={form.deviceAlias} onChange={(value) => setForm({ ...form, deviceAlias: value })} />
            <Field label="기종" value={form.deviceModel} onChange={(value) => setForm({ ...form, deviceModel: value })} />
            <Field label="이메일" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
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

function defaultDeviceAlias(userAgent: string) {
  if (/iPhone/i.test(userAgent)) return "iPhone";
  if (/iPad/i.test(userAgent)) return "iPad";
  if (/Android/i.test(userAgent)) return "Android 기기";
  if (/Macintosh|Mac OS/i.test(userAgent)) return "Mac";
  if (/Windows/i.test(userAgent)) return "Windows PC";
  return "업무용 기기";
}

function guessDeviceModel(userAgent: string) {
  if (/iPhone/i.test(userAgent)) return "iPhone";
  if (/iPad/i.test(userAgent)) return "iPad";
  const android = userAgent.match(/Android[^;)]*(?:;\s*([^;)]+))?/i);
  if (android?.[1]) return android[1].trim();
  if (/Macintosh|Mac OS/i.test(userAgent)) return "Mac";
  if (/Windows/i.test(userAgent)) return "Windows PC";
  return "알 수 없음";
}
