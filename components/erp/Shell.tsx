import Link from "next/link";
import { Menu } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NotificationBell } from "./NotificationBell";

export type ShellNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const adminNavGroups: Array<{ title: string; labels: string[] }> = [
  { title: "현황", labels: ["전체 대시보드", "통합검색"] },
  {
    title: "차량 운영",
    labels: ["차량관리", "예약 캘린더", "배회차관리", "분실물관리", "사고, 정비기록"],
  },
  {
    title: "정산/매출",
    labels: [
      "계약서관리",
      "청구서관리",
      "법인카드 관리",
      "미수금 관리",
      "입금 관리",
      "세금계산서관리",
      "차량별 매출분석",
    ],
  },
  { title: "거래처/보험", labels: ["거래처관리", "보험사관리"] },
  { title: "시스템", labels: ["알림센터"] },
];

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
            <nav className="mt-5 max-h-[calc(100vh-88px)] space-y-2 overflow-y-auto pr-1">
              <GroupedNav navItems={navItems} />
            </nav>
          </div>
        </aside>
        <section className="min-w-0 px-4 py-5 sm:px-6 lg:px-8">
          <header className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="inline-flex items-center lg:hidden">
                <h1 className="text-xl font-black text-primary">렌트플로우</h1>
              </Link>
            </div>
            <div className="relative flex items-center gap-3">
              <NotificationBell />

              <Link
                href="/app/inbox"
                className="hidden min-h-10 items-center justify-center rounded-lg border border-line bg-white px-4 text-xs font-black text-ink shadow-sm transition-colors hover:bg-slate-50 sm:inline-flex"
              >
                모바일 앱으로
              </Link>
            </div>
          </header>

          <details className="mb-4 rounded-lg border border-line bg-white shadow-sm lg:hidden">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-black text-ink">
              <span className="inline-flex items-center gap-2">
                <Menu className="h-4 w-4 text-primary" aria-hidden="true" />
                {title}
              </span>
              <span className="text-xs font-bold text-primary">더보기</span>
            </summary>
            <nav className="flex max-h-80 flex-col gap-1 overflow-y-auto border-t border-line p-2">
              <GroupedNav navItems={navItems} compact />
            </nav>
          </details>
          {children}
        </section>
      </div>
    </main>
  );
}

function GroupedNav({ navItems, compact = false }: { navItems: ShellNavItem[]; compact?: boolean }) {
  const renderedLabels = new Set<string>();
  const groupedItems = adminNavGroups
    .map((group) => {
      const items = group.labels
        .map((label) => navItems.find((item) => item.label === label))
        .filter((item): item is ShellNavItem => Boolean(item));
      items.forEach((item) => renderedLabels.add(item.label));
      return { ...group, items };
    })
    .filter((group) => group.items.length > 0);
  const ungroupedItems = navItems.filter((item) => !renderedLabels.has(item.label));
  const groups = ungroupedItems.length > 0 ? [...groupedItems, { title: "기타", labels: [], items: ungroupedItems }] : groupedItems;

  return (
    <div className="grid grid-cols-1 gap-2">
      {groups.map((group, index) => (
        <div key={group.title} className={index > 0 ? "border-t border-line pt-2" : ""}>
          <p className={`px-3 font-black text-gray-400 ${compact ? "py-1 text-[10px]" : "pb-1 text-[11px]"}`}>{group.title}</p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={`${group.title}-${item.href}-${item.label}`}
                  href={item.href}
                  className={`flex min-w-0 items-center gap-3 rounded-lg px-3 text-sm font-bold text-gray-600 hover:bg-primary/10 hover:text-primary ${compact ? "min-h-9" : "min-h-10"} whitespace-nowrap`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
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
