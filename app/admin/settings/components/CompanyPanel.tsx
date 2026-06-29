export function CompanyPanel() {
  return (
    <section className="panel space-y-3">
      <h2 className="text-xl font-black">회사 정보</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="회사명" />
        <Field label="대표자" />
        <Field label="사업자번호" />
        <Field label="연락처" />
        <label className="label md:col-span-2">주소<textarea className="field min-h-24" /></label>
      </div>
      <button className="primary-btn" type="button" disabled>저장(준비중)</button>
    </section>
  );
}

function Field({ label }: { label: string }) {
  return <label className="label">{label}<input className="field" /></label>;
}
