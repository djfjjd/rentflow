"use client";

import { Home } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthShell />}>
      <AuthForm />
    </Suspense>
  );
}

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const [accountType, setAccountType] = useState<"developer" | "admin" | "manager" | "staff">("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/trusted", { method: "POST" })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{ user?: { role?: string }; redirectTo?: string }>;
      })
      .then((data) => {
        if (!data || cancelled) return;
        const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "";
        const fallback = data.redirectTo || "/app/dashboard";
        const target = safeNext && (data.user?.role === "super_admin" || !safeNext.startsWith("/admin")) ? safeNext : fallback;
        router.replace(target);
        router.refresh();
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [next, router]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountType, password }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; user?: { role?: string }; redirectTo?: string; requiresDeviceRegistration?: boolean };
      if (response.status === 202 && data.requiresDeviceRegistration) {
        router.replace("/auth/register-device");
        return;
      }
      if (!response.ok) {
        throw new Error(data.error || "로그인에 실패했습니다.");
      }
      const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "";
      const fallback = data.redirectTo || "/app/dashboard";
      const target = safeNext && (data.user?.role === "super_admin" || !safeNext.startsWith("/admin")) ? safeNext : fallback;
      router.replace(target);
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : String(loginError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
        <form className="grid gap-3" onSubmit={login}>
          <label className="label">
            역할 선택
            <select className="field" value={accountType} onChange={(event) => setAccountType(event.target.value as "developer" | "admin" | "manager" | "staff")}>
              <option value="developer">개발자</option>
              <option value="admin">관리자</option>
              <option value="manager">실장님</option>
              <option value="staff">직원</option>
            </select>
          </label>
          <label className="label">
            비밀번호
            <input className="field" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
          </label>
          {error ? <p className="rounded-lg bg-[#fff7f4] px-3 py-2 text-sm font-black text-[#a13f24]">{error}</p> : null}
          <button className="primary-btn w-full" type="submit" disabled={busy}>
            {busy ? "확인 중" : "로그인"}
          </button>
          <button className="small-btn w-full" type="button" disabled>
            사무실 직원 등록(준비중)
          </button>
        </form>
    </AuthShell>
  );
}

function AuthShell({ children }: { children?: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f7f4] px-4 py-8 text-[#16211d]">
      <section className="w-full max-w-[420px] rounded-lg border border-[#d8ded8] bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#116149] text-white">
            <Home size={22} />
          </span>
          <div>
            <h1 className="text-xl font-black">RentFlow</h1>
            <p className="text-sm font-bold text-[#68746d]">인증이 필요한 서비스입니다.</p>
          </div>
        </div>
        {children}
      </section>
    </main>
  );
}
