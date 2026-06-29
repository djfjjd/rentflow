const notificationItems = ["전일 예약 알림", "당일 배차 알림", "미수금 알림", "정비 예정 알림"];

export function NotificationPanel() {
  return (
    <section className="panel space-y-3">
      <h2 className="text-xl font-black">알림 설정</h2>
      <div className="grid gap-2">
        {notificationItems.map((item) => (
          <label className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-[#d8ded8] bg-[#f6f7f4] px-3" key={item}>
            <span className="text-sm font-black text-[#25342e]">{item}</span>
            <input className="h-5 w-5" type="checkbox" disabled />
          </label>
        ))}
      </div>
    </section>
  );
}
