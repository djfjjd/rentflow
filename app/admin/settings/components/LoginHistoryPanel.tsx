export function LoginHistoryPanel() {
  return (
    <section className="panel overflow-hidden">
      <h2 className="mb-3 text-xl font-black">로그인 기록</h2>
      <div data-horizontal-scroll="true" className="overflow-x-auto">
        <table className="admin-table w-full min-w-[860px] text-left text-sm">
          <thead><tr className="border-b"><th>로그인 시간</th><th>이메일</th><th>기기</th><th>IP</th><th>상태</th></tr></thead>
          <tbody>
            <tr className="border-b">
              <td>준비중</td><td>직원 계정 연동 후 표시</td><td>-</td><td>-</td><td>구조 준비</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
