import { roleDefinitions } from "@/lib/roles";
import { allPermissionKeys, permissionLabels, rolePermissionMap } from "@/lib/permissions";

export function RolePermissionCards() {
  return (
    <section className="grid gap-3 lg:grid-cols-3">
      {roleDefinitions.map((role) => (
        <article className="panel min-h-48" key={role.role}>
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-black">{role.role}</h3>
              <p className="text-sm font-black text-[#116149]">{role.label}</p>
            </div>
            <span className="rounded-lg bg-[#eef4ed] px-2 py-1 text-xs font-black text-[#116149]">{role.description}</span>
          </div>
          <ul className="grid gap-2 text-sm font-bold text-[#25342e]">
            {allPermissionKeys.map((permission) => (
              <li className="flex items-center gap-2 rounded-lg border border-[#d8ded8] bg-[#f6f7f4] px-3 py-2" key={permission}>
                <input type="checkbox" checked={rolePermissionMap[role.role][permission]} readOnly />
                <span>{permission}</span>
                <span className="text-xs text-[#68746d]">{permissionLabels[permission]}</span>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}
