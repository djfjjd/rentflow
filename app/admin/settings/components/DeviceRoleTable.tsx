import type { Role } from "@/lib/roles";

export type DeviceRoleRow = {
  deviceName: string;
  email: string;
  role: Role;
  status: string;
  lastSeen: string;
  action: string;
};

const exampleDeviceRoles: DeviceRoleRow[] = [
  { deviceName: "대표 관리자 기기", email: "ADMIN_EMAIL", role: "super_admin", status: "승인됨", lastSeen: "최근 접속", action: "수정" },
  { deviceName: "팀장님 기기", email: "TEAM_LEAD_EMAILS", role: "super_admin", status: "승인됨", lastSeen: "최근 접속", action: "수정" },
  { deviceName: "실장님 기기", email: "미등록", role: "manager", status: "승인 대기", lastSeen: "-", action: "수정" },
  { deviceName: "직원용 기기", email: "미등록", role: "staff", status: "승인 대기", lastSeen: "-", action: "수정" },
];

export function DeviceRoleTable({ rows = exampleDeviceRoles }: { rows?: DeviceRoleRow[] }) {
  return (
    <section className="panel overflow-hidden">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-black">기기별 역할 설정</h3>
        <button className="small-btn" type="button" disabled>기기 등록(준비중)</button>
      </div>
      <div data-horizontal-scroll="true" className="overflow-x-auto">
        <table className="admin-table w-full min-w-[960px] text-left text-sm">
          <thead>
            <tr className="border-b">
              <th>기기명</th><th>로그인 이메일</th><th>역할</th><th>상태</th><th>마지막 접속</th><th>관리</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-b" key={`${row.deviceName}-${row.role}`}>
                <td>{row.deviceName}</td>
                <td>{row.email}</td>
                <td>
                  <select className="field min-h-10 py-1 text-sm" defaultValue={row.role} disabled>
                    <option value="super_admin">super_admin</option>
                    <option value="manager">manager</option>
                    <option value="staff">staff</option>
                  </select>
                </td>
                <td>{row.status}</td>
                <td>{row.lastSeen}</td>
                <td><button className="small-btn" type="button" disabled>{row.action}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
