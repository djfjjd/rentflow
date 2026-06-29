export function SystemPanel() {
  return (
    <section className="panel space-y-3">
      <h2 className="text-xl font-black">시스템 설정</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex min-h-12 items-center justify-between rounded-lg border border-[#d8ded8] bg-[#f6f7f4] px-3">
          <span className="text-sm font-black">개발자 로그인 표시</span>
          <input className="h-5 w-5" type="checkbox" defaultChecked disabled />
        </label>
        <Field label="세션 만료 시간" value="7일" />
        <Field label="기기 승인 정책" value="관리자 수동 승인" />
        <Field label="로그 보관 기간" value="90일" />
      </div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return <label className="label">{label}<input className="field" defaultValue={value} disabled /></label>;
}
