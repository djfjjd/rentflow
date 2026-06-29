export type ProtectedRoute = {
  path: string;
  mode?: "exact" | "prefix";
  requiredRole?: "super_admin";
  allowedEmailEnvKeys?: string[];
  nextPath?: string;
  authenticatedRedirectTo?: string;
};

export const protectedRoutes: ProtectedRoute[] = [
  { path: "/", nextPath: "/app", authenticatedRedirectTo: "/app" },
  { path: "/app", mode: "prefix" },
  { path: "/admin/settings", mode: "prefix", requiredRole: "super_admin" },
  { path: "/admin", mode: "prefix", requiredRole: "super_admin" },
  { path: "/dispatch" },
  { path: "/return" },
  { path: "/partners" },
  { path: "/repairs" },
  { path: "/lost-items" },
  { path: "/contracts" },
  { path: "/reservations" },
];

export function normalizePathname(pathname: string) {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}

export function getProtectedRoute(pathname: string) {
  const normalized = normalizePathname(pathname);
  return protectedRoutes.find((route) => {
    const routePath = normalizePathname(route.path);
    if ((route.mode || "exact") === "prefix") {
      return normalized === routePath || normalized.startsWith(`${routePath}/`);
    }
    return normalized === routePath;
  });
}
