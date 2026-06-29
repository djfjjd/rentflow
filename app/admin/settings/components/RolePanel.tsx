import { RolePermissionCards } from "./RolePermissionCards";

export function RolePanel() {
  return (
    <section className="space-y-3">
      <article className="panel">
        <h2 className="text-xl font-black">권한(Role) 관리</h2>
        <p className="mt-2 text-sm font-bold text-[#68746d]">
          직책(Position)은 조직 내 직위이고, 권한(Role)은 시스템 접근 권한입니다. 두 값은 독립적으로 관리되어야 합니다.
        </p>
      </article>
      <RolePermissionCards />
    </section>
  );
}
