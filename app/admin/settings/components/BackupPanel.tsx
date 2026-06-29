export function BackupPanel() {
  return (
    <section className="grid gap-3 md:grid-cols-3">
      <StatusCard label="Google Drive 백업 상태" value="준비중" />
      <StatusCard label="R2 저장소 상태" value="연동 대기" />
      <StatusCard label="마지막 백업 시간" value="-" />
      <div className="panel md:col-span-3">
        <button className="primary-btn" type="button" disabled>수동 백업(준비중)</button>
      </div>
    </section>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return <article className="panel min-h-28"><h3 className="text-sm font-black text-[#68746d]">{label}</h3><p className="mt-2 text-xl font-black">{value}</p></article>;
}
