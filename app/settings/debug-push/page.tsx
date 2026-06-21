"use client";

import { useEffect, useState } from "react";

type PushDebugState = {
  permission: string;
  serviceWorker: string;
  subscription: string;
  vapid: string;
  lastSubscribedAt: string;
  lastPushResult: string;
};

const initialState: PushDebugState = {
  permission: "확인 중",
  serviceWorker: "확인 중",
  subscription: "확인 중",
  vapid: "확인 중",
  lastSubscribedAt: "-",
  lastPushResult: "-",
};

export default function DebugPushPage() {
  const [state, setState] = useState<PushDebugState>(initialState);
  const [status, setStatus] = useState("");

  useEffect(() => {
    void refreshState();
  }, []);

  async function refreshState() {
    const next: PushDebugState = {
      permission: "Notification" in window ? Notification.permission : "미지원",
      serviceWorker: "serviceWorker" in navigator ? "지원" : "미지원",
      subscription: "확인 중",
      vapid: "확인 중",
      lastSubscribedAt: window.localStorage.getItem("rentflow:lastPushSubscribedAt") || "-",
      lastPushResult: window.localStorage.getItem("rentflow:lastPushResult") || "-",
    };

    try {
      const response = await fetch("/api/push/subscribe", { cache: "no-store" });
      const data = await response.json() as { publicKey?: string };
      next.vapid = data.publicKey ? "설정됨" : "VAPID_PUBLIC_KEY 없음";
    } catch {
      next.vapid = "확인 실패";
    }

    try {
      const registration = await navigator.serviceWorker?.ready;
      next.serviceWorker = registration ? "등록됨" : next.serviceWorker;
      const subscription = await registration?.pushManager?.getSubscription();
      next.subscription = subscription ? "구독됨" : "구독 없음";
    } catch {
      next.serviceWorker = "등록 실패";
      next.subscription = "확인 실패";
    }

    setState(next);
  }

  async function requestPermission() {
    if (!("Notification" in window)) {
      setStatus("이 브라우저는 알림을 지원하지 않습니다.");
      return;
    }
    const permission = await Notification.requestPermission();
    setStatus(permission === "granted" ? "알림 권한 허용됨" : "알림 권한이 허용되지 않았습니다.");
    await refreshState();
  }

  async function resubscribe() {
    setStatus("푸시 재구독 중");
    try {
      const permission = "Notification" in window ? Notification.permission : "denied";
      if (permission !== "granted") {
        setStatus("먼저 알림 권한을 허용하세요.");
        return;
      }
      const publicKey = await fetchVapidPublicKey();
      if (!publicKey) {
        setStatus("VAPID_PUBLIC_KEY가 없습니다.");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription, userLabel: "debug" }),
      });
      const text = await response.text();
      if (!response.ok) throw new Error(text || "subscribe failed");
      const now = new Date().toLocaleString("ko-KR");
      window.localStorage.setItem("rentflow:lastPushSubscribedAt", now);
      setStatus("푸시 재구독 완료");
      await refreshState();
    } catch (error) {
      setStatus(`푸시 재구독 실패: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async function sendTestPush() {
    setStatus("테스트 알림 발송 중");
    try {
      const response = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "RentFlow 테스트 알림",
          body: "푸시알림이 정상 동작합니다.",
          url: "/settings/debug-push",
          tag: "debug-push",
        }),
      });
      const text = await response.text();
      const result = `${response.status} ${text.slice(0, 180)}`;
      window.localStorage.setItem("rentflow:lastPushResult", result);
      setStatus(response.ok ? "테스트 알림 발송 완료" : `테스트 알림 실패: ${result}`);
      await refreshState();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      window.localStorage.setItem("rentflow:lastPushResult", message);
      setStatus(`테스트 알림 실패: ${message}`);
      await refreshState();
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f7f4] p-4">
      <section className="mx-auto grid max-w-2xl gap-4">
        <div className="panel">
          <h1 className="text-xl font-black text-[#16211d]">푸시알림 진단</h1>
          <p className="mt-2 text-sm font-bold text-[#6b7280]">
            아이폰에서는 홈화면에 추가한 앱(PWA)에서 알림을 허용해야 푸시알림이 정상 동작합니다.
          </p>
        </div>

        <div className="panel grid gap-2 text-sm font-bold text-[#25342e]">
          <DebugRow label="알림 권한 상태" value={state.permission} />
          <DebugRow label="서비스워커 등록 여부" value={state.serviceWorker} />
          <DebugRow label="푸시 구독 여부" value={state.subscription} />
          <DebugRow label="VAPID_PUBLIC_KEY" value={state.vapid} />
          <DebugRow label="마지막 구독 시간" value={state.lastSubscribedAt} />
          <DebugRow label="마지막 푸시 결과" value={state.lastPushResult} />
        </div>

        <div className="panel grid gap-2 sm:grid-cols-3">
          <button className="small-btn" type="button" onClick={requestPermission}>알림 권한 요청</button>
          <button className="small-btn" type="button" onClick={resubscribe}>푸시 재구독</button>
          <button className="small-btn" type="button" onClick={sendTestPush}>테스트 알림 보내기</button>
        </div>

        {status ? <p className="rounded-lg border border-[#d8ded8] bg-white p-3 text-sm font-black text-[#116149]">{status}</p> : null}
      </section>
    </main>
  );
}

function DebugRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-lg bg-[#f8faf7] p-3 sm:grid-cols-[11rem_minmax(0,1fr)]">
      <span className="text-[#6b7280]">{label}</span>
      <span className="break-words text-[#16211d]">{value}</span>
    </div>
  );
}

async function fetchVapidPublicKey() {
  const response = await fetch("/api/push/subscribe", { cache: "no-store" });
  if (!response.ok) return "";
  const data = await response.json() as { publicKey?: string };
  return data.publicKey || "";
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replaceAll("-", "+").replaceAll("_", "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}
