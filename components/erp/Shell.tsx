import Link from "next/link";
import { Bell, Menu } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { notifications } from "@/lib/erp-data";

export type ShellNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export function AdminShell({
  title,
  description,
  navItems,
  children,
}: {
  title: string;
  description: string;
  navItems: ShellNavItem[];
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[260px_1fr]">
        <aside className="hidden border-r border-line bg-white lg:block">
          <div className="sticky top-0 p-5">
            <Link href="/" className="block">
              <h1 className="text-2xl font-black text-primary">렌트플로우</h1>
            </Link>
            <nav className="mt-6 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-gray-600 hover:bg-primary/10 hover:text-primary"
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>
        <section className="min-w-0 px-4 py-5 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <Link href="/" className="inline-flex items-center">
              <h1 className="text-xl font-black text-primary">렌트플로우</h1>
            </Link>
            <NotificationMenu />
          </div>
          <details className="mb-4 rounded-lg border border-line bg-white shadow-sm lg:hidden">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-black text-ink">
              <span className="inline-flex items-center gap-2">
                <Menu className="h-4 w-4 text-primary" aria-hidden="true" />
                관리자 메뉴
              </span>
              <span className="text-xs font-bold text-primary">더보기</span>
            </summary>
            <nav className="grid max-h-80 gap-1 overflow-y-auto border-t border-line p-3 sm:grid-cols-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-bold text-gray-600 hover:bg-primary/10 hover:text-primary"
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </details>
          <header className="mb-5 rounded-lg border border-line bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-black text-ink">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-gray-500">{description}</p>
              </div>
              <Link
                href="/app/inbox"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line px-4 text-sm font-bold text-ink"
              >
                모바일 앱으로
              </Link>
            </div>
          </header>
          {children}
        </section>
      </div>
    </main>
  );
}

function NotificationMenu() {
  return (
    <details className="relative">
      <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-line bg-white text-primary shadow-sm">
        <Bell className="h-5 w-5" aria-hidden="true" />
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-lg border border-line bg-white shadow-lg">
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-sm font-black text-ink">알림 목록</h2>
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {notifications.map((item) => (
            <article key={item.id} className="rounded-lg p-3 hover:bg-field">
              <p className="text-xs font-black text-primary">{item.type}</p>
              <p className="mt-1 text-sm font-black text-ink">{item.title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-500">{item.message}</p>
            </article>
          ))}
          {notifications.length === 0 && <div className="p-4 text-center text-sm font-bold text-gray-500">알림이 없습니다.</div>}
        </div>
      </div>
    </details>
  );
}

export function MobileAppShell({
  title,
  description,
  navItems,
  children,
}: {
  title: string;
  description: string;
  navItems: ShellNavItem[];
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto min-h-screen w-full max-w-xl px-4 pb-24 pt-5">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center">
            <h1 className="text-xl font-black text-primary">렌트플로우</h1>
          </Link>
          <span className="text-[10px] font-bold text-gray-400">PWA STAFF</span>
        </div>
        <header className="mb-5 rounded-lg border border-line bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-primary">mobile PWA · role: staff/driver</p>
          <h1 className="mt-1 text-2xl font-black text-ink">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-gray-500">{description}</p>
        </header>
        {children}
      </div>
      <nav className="fixed inset-x-0 bottom-0 border-t border-line bg-white/95 backdrop-blur">
        <div className="mx-auto grid max-w-xl grid-cols-5 px-2 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-center text-gray-500 hover:bg-primary/10 hover:text-primary"
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="text-[11px] font-bold">{item.label.replace("스마트 ", "")}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </main>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <p className="text-sm font-bold text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-ink">{value}</p>
      <p className="mt-2 text-xs font-semibold text-primary">{hint}</p>
    </article>
  );
}

export function EmptyReadyCard({ title, description }: { title: string; description: string }) {
  return (
    <section className="rounded-lg border border-dashed border-primary/30 bg-white p-8 text-center">
      <h2 className="text-xl font-black text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-500">{description}</p>
    </section>
  );
}
