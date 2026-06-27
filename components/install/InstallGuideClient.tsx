"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, ExternalLink, Monitor, Plus, QrCode, Share, Smartphone } from "lucide-react";

type DeviceKind = "iphone" | "android" | "desktop";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function InstallGuideClient({ appUrl }: { appUrl: string }) {
  const [device, setDevice] = useState<DeviceKind>("desktop");
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installStatus, setInstallStatus] = useState("");
  const qrUrl = useMemo(() => buildQrUrl(appUrl), [appUrl]);

  useEffect(() => {
    setDevice(detectDevice());

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setInstallStatus("");
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  async function installPwa() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    setInstallStatus(choice.outcome === "accepted" ? "앱 설치가 시작되었습니다." : "설치가 취소되었습니다.");
  }

  return (
    <section className="space-y-4">
      <header className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <p className="text-sm font-bold text-primary">RentFlow PWA</p>
        <h1 className="mt-1 text-3xl font-black text-ink">렌트플로우 설치</h1>
        <p className="mt-3 whitespace-pre-line text-sm font-bold leading-6 text-gray-500">
          QR코드를 스캔하거나{"\n"}아래 버튼을 눌러 설치할 수 있습니다.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-primary">
            <Smartphone className="h-5 w-5" aria-hidden="true" />
            <h2 className="text-xl font-black text-ink">설치 안내</h2>
          </div>
          <div className="mt-4">
            {device === "iphone" ? <IphoneGuide /> : null}
            {device === "android" ? <AndroidGuide installPrompt={installPrompt} installStatus={installStatus} onInstall={installPwa} /> : null}
            {device === "desktop" ? <DesktopGuide /> : null}
          </div>
        </section>

        <section className="rounded-lg border border-line bg-white p-5 text-center shadow-sm">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-black text-primary">
            <QrCode className="h-4 w-4" aria-hidden="true" />
            설치 QR
          </div>
          <div className="mt-4 flex justify-center">
            <img
              src={qrUrl}
              alt="RentFlow 설치 QR코드"
              className="h-64 w-64 rounded-lg border border-line bg-white p-3 sm:h-72 sm:w-72"
            />
          </div>
          <p className="mt-3 break-all text-xs font-bold text-gray-500">{appUrl}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Link className="primary-btn" href={appUrl}>
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              사이트 바로가기
            </Link>
            <a className="small-btn" href={qrUrl} download="rentflow-install-qr.png">
              <Download className="h-4 w-4" aria-hidden="true" />
              PNG 다운로드
            </a>
          </div>
        </section>
      </div>
    </section>
  );
}

function IphoneGuide() {
  return (
    <ol className="grid gap-3 text-sm font-bold text-gray-600">
      <GuideStep icon={<ExternalLink className="h-5 w-5" />} title="Safari에서 열기" text="아이폰에서는 Safari로 RentFlow를 열어주세요." />
      <GuideStep icon={<Share className="h-5 w-5" />} title="하단 공유 버튼 클릭" text="브라우저 하단의 공유 버튼을 누릅니다." />
      <GuideStep icon={<Plus className="h-5 w-5" />} title="홈 화면에 추가" text="공유 메뉴에서 홈 화면에 추가를 선택합니다." />
      <GuideStep icon={<CheckCircle2 className="h-5 w-5" />} title="추가 완료" text="홈 화면의 RentFlow 아이콘으로 실행합니다." />
    </ol>
  );
}

function AndroidGuide({
  installPrompt,
  installStatus,
  onInstall,
}: {
  installPrompt: BeforeInstallPromptEvent | null;
  installStatus: string;
  onInstall: () => void;
}) {
  return (
    <div className="space-y-4">
      {installPrompt ? (
        <button className="primary-btn w-full" type="button" onClick={onInstall}>
          <Download className="h-5 w-5" aria-hidden="true" />
          앱 설치
        </button>
      ) : (
        <ol className="grid gap-3 text-sm font-bold text-gray-600">
          <GuideStep icon={<ExternalLink className="h-5 w-5" />} title="Chrome에서 열기" text="Android Chrome으로 RentFlow에 접속합니다." />
          <GuideStep icon={<Plus className="h-5 w-5" />} title="Chrome 메뉴" text="오른쪽 위 메뉴를 누른 뒤 홈 화면에 추가를 선택합니다." />
          <GuideStep icon={<CheckCircle2 className="h-5 w-5" />} title="추가 완료" text="홈 화면의 RentFlow 아이콘으로 실행합니다." />
        </ol>
      )}
      {installStatus ? <p className="text-sm font-black text-primary">{installStatus}</p> : null}
    </div>
  );
}

function DesktopGuide() {
  return (
    <div className="grid gap-3 text-center">
      <Monitor className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
      <p className="text-lg font-black text-ink">휴대폰으로 QR코드를 스캔하여 설치하세요.</p>
      <p className="text-sm font-bold leading-6 text-gray-500">PC에서는 QR코드를 크게 표시합니다. 사무실에서 인쇄해 벽에 붙여두면 직원들이 바로 설치할 수 있습니다.</p>
    </div>
  );
}

function GuideStep({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <li className="flex gap-3 rounded-lg bg-field p-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</span>
      <span className="min-w-0 text-left">
        <strong className="block text-base font-black text-ink">{title}</strong>
        <span className="mt-1 block leading-5">{text}</span>
      </span>
    </li>
  );
}

function detectDevice(): DeviceKind {
  const userAgent = navigator.userAgent || "";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "iphone";
  if (/android/i.test(userAgent)) return "android";
  return "desktop";
}

function buildQrUrl(appUrl: string) {
  const data = encodeURIComponent(appUrl);
  return `https://api.qrserver.com/v1/create-qr-code/?size=720x720&format=png&margin=16&data=${data}`;
}
