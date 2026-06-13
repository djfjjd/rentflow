import type { Role } from "@/lib/erp-data";

const roleAccess: Record<Role, string[]> = {
  admin: ["/app", "/admin"],
  staff: ["/app", "/admin/vehicles", "/admin/dispatches", "/admin/lost-items", "/admin/reservations", "/admin/documents"],
  driver: ["/app"],
};

export function canAccess(role: Role, pathname: string) {
  return roleAccess[role].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
