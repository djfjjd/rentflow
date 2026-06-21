"use client";

import { useEffect, useState } from "react";

type PushDebugState = {
  permission: string;
  serviceWorker: string;
  serviceWorkerPath: string;
  serviceWorkerScope: string;
  serviceWorkerController: string;
  serviceWorkerActiveScript: string;
  serviceWorkerPushEvent: string;
  serviceWorkerClickEvent: string;
  subscription: string;
  subscriptionEndpoint: string;
  dbEndpoint: string;
  displayModeStandalone: string;
  navigatorStandalone: string;
  vapidPublicKey: string;
  vapidPrivateKey: string;
  dbSubscriptionCount: string;
  lastSubscribedAt: string;
  lastHttpStatus: string;
  lastStatusCode: string;
  lastPayload: string;
  lastSwPushReceived: string;
  lastPushResult: string;
  lastError: string;
};

const initialState: PushDebugState = {
  permission: "확인 중",
  serviceWorker: "확인 중",
  serviceWorkerPath: "확인 중",
  serviceWorkerScope: "확인 중",
  serviceWorkerController: "확인 중",
  serviceWorkerActiveScript: "확인 중",
  serviceWorkerPushEvent: "확인 중",
  serviceWorkerClickEvent: "확인 중",
  subscription: "확인 중",
  subscriptionEndpoint: "확인 중",
  dbEndpoint: "확인 중",
  displayModeStandalone: "확인 중",
  navigatorStandalone: "확인 중",
  vapidPublicKey: "확인 중",
  vapidPrivateKey: "확인 중",
  dbSubscriptionCount: "확인 중",
  lastSubscribedAt: "-",
  lastHttpStatus: "-",
  lastStatusCode: "-",
  lastPayload: "-",
  lastSwPushReceived: "-",
  lastPushResult: "-",
  lastError: "-",
};

export default function DebugPushPage() {
  const [state, setState] = useState<PushDebugState>(initialState);
  const [status, setStatus] = useState("");

  useEffect(() => {
    void refreshState();
    function handleMessage(event: MessageEvent) {
      if (event.data?.type !== "push-received") return;
      const text = JSON.stringify(event.data).slice(0, 1000);
      window.localStorage.setItem("rentflow:lastSwPushReceived", text);
      setState((current) => ({ ...current, lastSwPushReceived: text }));
    }
    navigator.serviceWorker?.addEventListener("message", handleMessage);
    return () => navigator.serviceWorker?.removeEventListener("message", handleMessage);
  }, []);

  async function refreshState() {
    const next: PushDebugState = {
      permission: "Notification" in window ? Notification.permission : "미지원",
      serviceWorker: "serviceWorker" in navigator ? "지원" : "미지원",
      serviceWorkerPath: "/sw.js",
      serviceWorkerScope: "확인 중",
      serviceWorkerController: navigator.serviceWorker?.controller ? "있음" : "없음",
      serviceWorkerActiveScript: "확인 중",
      serviceWorkerPushEvent: "확인 중",
      serviceWorkerClickEvent: "확인 중",
      subscription: "확인 중",
      subscriptionEndpoint: "확인 중",
      dbEndpoint: "확인 중",
      displayModeStandalone: window.matchMedia("(display-mode: standalone)").matches ? "standalone" : "browser",
      navigatorStandalone: String(Boolean((navigator as Navigator & { standalone?: boolean }).standalone)),
      vapidPublicKey: "확인 중",
      vapidPrivateKey: "확인 중",
      dbSubscriptionCount: "확인 중",
      lastSubscribedAt: window.localStorage.getItem("rentflow:lastPushSubscribedAt") || "-",
      lastHttpStatus: window.localStorage.getItem("rentflow:lastPushHttpStatus") || "-",
      lastStatusCode: window.localStorage.getItem("rentflow:lastPushStatusCode") || "-",
      lastPayload: window.localStorage.getItem("rentflow:lastPushPayload") || "-",
      lastSwPushReceived: window.localStorage.getItem("rentflow:lastSwPushReceived") || "-",
      lastPushResult: window.localStorage.getItem("rentflow:lastPushResult") || "-",
      lastError: window.localStorage.getItem("rentflow:lastPushError") || "-",
    };

    try {
      const response = await fetch("/api/push/subscribe", { cache: "no-store" });
      const data = await response.json() as { publicKey?: string; subscriptionCount?: number; vapidPublicKeyExists?: boolean; vapidPrivateKeyExists?: boolean; endpoints?: string[] };
      next.vapidPublicKey = data.vapidPublicKeyExists || data.publicKey ? "존재" : "없음";
      next.vapidPrivateKey = data.vapidPrivateKeyExists ? "존재" : "없음";
      next.dbSubscriptionCount = `${data.subscriptionCount || 0}개`;
      next.dbEndpoint = data.endpoints?.[0] || "-";
    } catch {
      next.vapidPublicKey = "확인 실패";
      next.vapidPrivateKey = "확인 실패";
      next.dbSubscriptionCount = "확인 실패";
    }

    try {
      let registration = await navigator.serviceWorker.getRegistration("/");
      if (!registration) {
        registration = await navigator.serviceWorker.register("/sw.js");
      }
      await navigator.serviceWorker.ready;
      next.serviceWorker = registration ? "등록됨" : next.serviceWorker;
      next.serviceWorkerScope = registration?.scope || "-";
      next.serviceWorkerPath = registration?.active?.scriptURL || registration?.installing?.scriptURL || registration?.waiting?.scriptURL || "/sw.js";
      next.serviceWorkerActiveScript = registration?.active?.scriptURL || "-";
      const subscription = await registration?.pushManager?.getSubscription();
      next.subscription = subscription ? `구독됨: ${subscription.endpoint.slice(0, 80)}` : "구독 없음";
      next.subscriptionEndpoint = subscription ? subscription.endpoint.slice(0, 40) : "-";
      if (next.permission === "granted" && !subscription) {
        setState(next);
        await resubscribe({ silent: true });
        return;
      }
    } catch {
      next.serviceWorker = "등록 실패";
      next.subscription = "확인 실패";
    }

    try {
      const swResponse = await fetch("/sw.js", { cache: "no-store" });
      const swText = await swResponse.text();
      next.serviceWorkerPushEvent = swResponse.ok && swText.includes('"push"') ? "있음" : "없음";
      next.serviceWorkerClickEvent = swResponse.ok && swText.includes('"notificationclick"') ? "있음" : "없음";
    } catch {
      next.serviceWorkerPushEvent = "확인 실패";
      next.serviceWorkerClickEvent = "확인 실패";
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

  async function resubscribe(options?: { silent?: boolean; deleteExisting?: boolean }) {
    setStatus(options?.silent ? "구독 없음 감지, 자동 재구독 중" : "푸시 재구독 중");
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
      if (existing) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: existing.endpoint }),
        });
      }
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
      setStatus(`푸시 재구독 완료 endpoint: ${subscription.endpoint.slice(0, 30)}...`);
      window.localStorage.removeItem("rentflow:lastPushError");
      await refreshState();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      window.localStorage.setItem("rentflow:lastPushError", message);
      setStatus(`푸시 재구독 실패: ${message}`);
    }
  }

  async function sendTestPush() {
    setStatus("테스트 알림 발송 중");
    try {
      const payload = {
        title: "RentFlow 테스트 알림",
        body: "푸시알림이 정상적으로 도착했습니다.",
        url: "/app",
        tag: "rentflow-test",
      };
      window.localStorage.setItem("rentflow:lastPushPayload", JSON.stringify(payload));
      const response = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      const result = `${response.status} ${text.slice(0, 1000)}`;
      window.localStorage.setItem("rentflow:lastPushHttpStatus", String(response.status));
      window.localStorage.setItem("rentflow:lastPushResult", result);
      if (!response.ok) window.localStorage.setItem("rentflow:lastPushError", text.slice(0, 1000));
      const parsed = parseJson(text);
      if (parsed?.statusCode) window.localStorage.setItem("rentflow:lastPushStatusCode", String(parsed.statusCode));
      if (parsed?.expired) {
        setStatus(`테스트 알림 발송 완료, 만료 구독 ${parsed.expired}개 삭제됨. 필요 시 푸시 재구독을 누르세요.`);
      } else if (parsed?.failed) {
        window.localStorage.setItem("rentflow:lastPushError", JSON.stringify(parsed.errors || parsed).slice(0, 1000));
        setStatus(`테스트 알림 일부 실패: ${result}`);
      } else {
        setStatus(response.ok ? `테스트 알림 발송 완료\nstatusCode: ${parsed?.statusCode || "-"}\nendpoint: ${parsed?.endpoint || "-"}` : `테스트 알림 실패: ${result}`);
      }
      await refreshState();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      window.localStorage.setItem("rentflow:lastPushResult", message);
      window.localStorage.setItem("rentflow:lastPushHttpStatus", "fetch-error");
      window.localStorage.setItem("rentflow:lastPushError", message);
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
          <DebugRow label="서비스워커 파일 경로" value={state.serviceWorkerPath} />
          <DebugRow label="서비스워커 scope" value={state.serviceWorkerScope} />
          <DebugRow label="service worker controller 존재 여부" value={state.serviceWorkerController} />
          <DebugRow label="service worker active scriptURL" value={state.serviceWorkerActiveScript} />
          <DebugRow label="push 이벤트" value={state.serviceWorkerPushEvent} />
          <DebugRow label="notificationclick 이벤트" value={state.serviceWorkerClickEvent} />
          <DebugRow label="display-mode standalone 여부" value={state.displayModeStandalone} />
          <DebugRow label="navigator.standalone 여부" value={state.navigatorStandalone} />
          <DebugRow label="현재 Push Subscription 존재 여부" value={state.subscription} />
          <DebugRow label="현재 subscription endpoint 앞 40자" value={state.subscriptionEndpoint} />
          <DebugRow label="DB 저장된 Subscription 수" value={state.dbSubscriptionCount} />
          <DebugRow label="DB 저장 endpoint 앞 40자" value={state.dbEndpoint} />
          <DebugRow label="VAPID_PUBLIC_KEY 존재 여부" value={state.vapidPublicKey} />
          <DebugRow label="VAPID_PRIVATE_KEY 존재 여부" value={state.vapidPrivateKey} />
          <DebugRow label="마지막 구독 시간" value={state.lastSubscribedAt} />
          <DebugRow label="마지막 테스트 푸시 HTTP status" value={state.lastHttpStatus} />
          <DebugRow label="마지막 web-push send 결과 statusCode" value={state.lastStatusCode} />
          <DebugRow label="마지막 테스트 푸시 payload" value={state.lastPayload} />
          <DebugRow label="마지막 SW push 수신" value={state.lastSwPushReceived} />
          <DebugRow label="마지막 푸시 결과" value={state.lastPushResult} />
          <DebugRow label="마지막 테스트 푸시 오류 원문" value={state.lastError} />
        </div>

        <div className="panel grid gap-2 sm:grid-cols-4">
          <button className="small-btn" type="button" onClick={requestPermission}>알림 권한 요청</button>
          <button className="small-btn" type="button" onClick={() => resubscribe()}>푸시 재구독</button>
          <button className="small-btn" type="button" onClick={sendTestPush}>테스트 알림 보내기</button>
          <button className="small-btn" type="button" onClick={() => resubscribe({ deleteExisting: true })}>기존 구독 삭제 후 재등록</button>
        </div>

        {status ? <p className="rounded-lg border border-[#d8ded8] bg-white p-3 text-sm font-black text-[#116149]">{status}</p> : null}
      </section>
    </main>
  );
}

function parseJson(value: string) {
  try {
    return JSON.parse(value) as { expired?: number; failed?: number; errors?: unknown; statusCode?: number; endpoint?: string };
  } catch {
    return null;
  }
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
