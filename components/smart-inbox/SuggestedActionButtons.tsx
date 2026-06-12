import { AlertTriangle, CalendarPlus, ClipboardCheck, Link2, PauseCircle, ReceiptText, WalletCards, Wrench } from "lucide-react";

const actions = [
  { label: "정비이력으로 기록", icon: Wrench, primary: true },
  { label: "사고이력으로 기록", icon: AlertTriangle, primary: true },
  { label: "배차로 연결", icon: CalendarPlus, primary: false },
  { label: "회차로 연결", icon: ClipboardCheck, primary: false },
  { label: "기존 기록에 연결", icon: Link2, primary: false },
  { label: "입금 등록", icon: WalletCards, primary: false },
  { label: "미수금에 연결", icon: ReceiptText, primary: false },
  { label: "청구서에 연결", icon: ReceiptText, primary: false },
  { label: "나중에 분류", icon: PauseCircle, primary: false },
];

type SuggestedActionButtonsProps = {
  visible: boolean;
};

export function SuggestedActionButtons({ visible }: SuggestedActionButtonsProps) {
  if (!visible) {
    return null;
  }

  return (
    <section>
      <h2 className="mb-3 px-1 text-base font-bold text-ink">추천 작업</h2>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              type="button"
              className={
                action.primary
                  ? "flex min-h-16 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white shadow-soft transition active:scale-[0.99]"
                  : "flex min-h-16 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 py-3 text-sm font-bold text-ink transition hover:border-primary/40 active:scale-[0.99]"
              }
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>{action.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
