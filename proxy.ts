import { NextResponse, type NextRequest } from "next/server";
import { authCookieName, verifyAuthToken } from "./lib/auth/jwt";
import { isRouteAllowedForSession } from "./lib/auth/access";
import { getProtectedRoute } from "./lib/auth/protected-routes";
import { hasSettings2faAccess, isDeveloperSettingsBypass, isSettingsEmailAllowed } from "./lib/settings-2fa";

export async function proxy(request: NextRequest) {
  const session = await verifyAuthToken(request.cookies.get(authCookieName)?.value, process.env.JWT_SECRET || "");
  const isDeviceAuthPath = ["/auth/register-device", "/auth/pending", "/auth/verify-email"].some((path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`));
  if (isDeviceAuthPath && session?.isDeveloper) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  const route = getProtectedRoute(request.nextUrl.pathname);
  if (!route) return NextResponse.next();

  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    url.search = "";
    url.searchParams.set("next", route.nextPath || `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  if (route.authenticatedRedirectTo) {
    return NextResponse.redirect(new URL(route.authenticatedRedirectTo, request.url));
  }

  if (!isRouteAllowedForSession(route, session, process.env)) {
    return new NextResponse("권한이 없습니다.", { status: 403 });
  }

  const isSettingsPath = request.nextUrl.pathname === "/admin/settings" || request.nextUrl.pathname.startsWith("/admin/settings/");
  const isVerifyPath = request.nextUrl.pathname === "/admin/settings/verify" || request.nextUrl.pathname.startsWith("/admin/settings/verify/");
  if (isSettingsPath) {
    if (!isSettingsEmailAllowed(session, process.env)) {
      return new NextResponse("권한이 없습니다.", { status: 403 });
    }
    const settingsVerified = await hasSettings2faAccess(request.headers.get("Cookie"), session, process.env);
    if (isVerifyPath && isDeveloperSettingsBypass(session, process.env)) {
      return NextResponse.redirect(new URL("/admin/settings", request.url));
    }
    if (!settingsVerified && !isVerifyPath) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/settings/verify";
      url.search = "";
      url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/app/:path*", "/admin/:path*", "/auth/register-device/:path*", "/auth/pending/:path*", "/auth/verify-email/:path*", "/dispatch", "/return", "/partners", "/repairs", "/lost-items", "/contracts", "/reservations"],
};
