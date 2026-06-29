"use client";

import { Home } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useState, type FormEvent, type ReactNode } from "react";

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
  const next = searchParams.get("next") || "/app";
  const [accountType, setAccountType] = useState<"admin" | "manager" | "staff">("admin");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountType, loginId, password, email }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; user?: { role?: string }; redirectTo?: string };
      if (!response.ok) {
        throw new Error(data.error || "로그인에 실패했습니다.");
      }
      const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "";
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
            <select className="field" value={accountType} onChange={(event) => setAccountType(event.target.value as "admin" | "manager" | "staff")}>
              <option value="admin">관리자</option>
              <option value="manager">실장님</option>
              <option value="staff">직원</option>
            </select>
          </label>
          <label className="label">
            아이디
            <input className="field" type="text" value={loginId} onChange={(event) => setLoginId(event.target.value)} autoComplete="username" required />
          </label>
          <label className="label">
            비밀번호
            <input className="field" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
          </label>
          <label className="label">
            이메일
            <input className="field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
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
