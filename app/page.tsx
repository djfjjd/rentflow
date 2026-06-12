import Link from "next/link";
import { Smartphone, MonitorCog, Database } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <section className="mx-auto max-w-4xl">
        <p className="text-sm font-bold text-primary">Next.js App Router · Supabase ready</p>
        <h1 className="mt-2 text-3xl font-black text-ink sm:text-5xl">렌터카 사고대차 ERP</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600">
          하나의 Next.js 프로젝트 안에서 모바일 PWA 앱과 관리자 웹사이트가 라우팅으로 분리되고,
          하나의 Supabase 데이터베이스/스토리지를 공유하도록 설계한 MVP입니다.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <GatewayCard href="/app/inbox" icon={Smartphone} title="모바일 PWA 앱" body="현장 직원용 스마트 접수함, 보고, 내 업무" />
          <GatewayCard href="/admin/dashboard" icon={MonitorCog} title="관리자 웹사이트" body="차량, 배차, 회차, 예약, 정비, 서류 관리" />
          <GatewayCard href="/admin/settings" icon={Database} title="Supabase 구조" body="권한, 테이블, 스토리지 연결 준비" />
        </div>
      </section>
    </main>
  );
}

function GatewayCard({
  href,
  icon: Icon,
  title,
  body,
}: {
  href: string;
  icon: typeof Smartphone;
  title: string;
  body: string;
}) {
  return (
    <Link href={href} className="rounded-lg border border-line bg-white p-5 shadow-sm transition hover:border-primary/40">
      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-lg font-black text-ink">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-gray-500">{body}</p>
    </Link>
  );
}
