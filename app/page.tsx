import Link from "next/link";
import { MonitorCog, Database } from "lucide-react";
import { UniversalAiIntake } from "@/components/UniversalAiIntake";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <section className="mx-auto max-w-4xl text-center">
        <h1 className="mt-2 text-3xl font-black text-ink sm:text-5xl">렌터카 사고대차 관리 플랫폼 RentFlow</h1>
        <UniversalAiIntake />
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
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
  icon: typeof MonitorCog;
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
