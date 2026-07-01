"use client";

import { Home } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";

export default function SettingsVerifyPage() {
  return (
    <Suspense fallback={<VerifyShell />}>
      <VerifyForm />
    </Suspense>
  );
}

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/admin/settings";
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [devCode, setDevCode] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [busy, setBusy] = useState(false);

  async function requestCode() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/settings-2fa/request", { method: "POST" });
      const data = (await response.json().catch(() => ({}))) as { error?: string; devCode?: string; sentTo?: string; emailReady?: boolean };
      if (!response.ok) throw new Error(data.error || "인증코드 발송에 실패했습니다.");
      setDevCode(data.devCode || "");
      setSentTo(data.sentTo || "");
      setMessage(data.emailReady ? "인증코드를 이메일로 전송했습니다." : "인증코드를 확인한 뒤 입력해주세요.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    requestCode();
  }, []);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/settings-2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "인증에 실패했습니다.");
      router.replace(next.startsWith("/admin/settings") ? next : "/admin/settings");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <VerifyShell>
      <form className="grid gap-3" onSubmit={verify}>
        {sentTo ? <p className="rounded-lg bg-[#eef4ed] px-3 py-2 text-sm font-black text-[#116149]">전송 이메일: {maskEmail(sentTo)}</p> : null}
        <label className="label">
          6자리 인증코드
          <input className="field text-center text-xl tracking-[0.4em]" inputMode="numeric" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} required />
        </label>
        {devCode ? <p className="rounded-lg bg-[#eef4ed] px-3 py-2 text-sm font-black text-[#116149]">개발용 인증코드: {devCode}</p> : null}
        {message ? <p className="rounded-lg bg-[#f6f7f4] px-3 py-2 text-sm font-black text-[#68746d]">{message}</p> : null}
        <button className="primary-btn w-full" type="submit" disabled={busy || code.length !== 6}>{busy ? "확인 중" : "인증"}</button>
        <button className="small-btn w-full" type="button" onClick={requestCode} disabled={busy}>코드 재전송</button>
        <button className="small-btn w-full" type="button" onClick={() => router.replace("/admin")}>취소</button>
      </form>
    </VerifyShell>
  );
}

function VerifyShell({ children }: { children?: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f7f4] px-4 py-8 text-[#16211d]">
      <section className="w-full max-w-[460px] rounded-lg border border-[#d8ded8] bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#116149] text-white"><Home size={22} /></span>
          <div>
            <h1 className="text-xl font-black">RentFlow</h1>
            <p className="text-sm font-bold text-[#68746d]">관리자 설정센터 2단계 인증</p>
          </div>
        </div>
        <p className="mb-4 text-sm font-bold text-[#68746d]">로그인한 이메일로 전송된 6자리 인증코드를 입력해주세요.</p>
        {children}
      </section>
    </main>
  );
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.slice(0, Math.min(3, local.length));
  return `${visible}***@${domain}`;
}
