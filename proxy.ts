import { NextResponse, type NextRequest } from "next/server";
import { authCookieName, verifyAuthToken } from "./lib/auth/jwt";
import { getProtectedRoute } from "./lib/auth/protected-routes";

export async function proxy(request: NextRequest) {
  const route = getProtectedRoute(request.nextUrl.pathname);
  if (!route) return NextResponse.next();

  const session = await verifyAuthToken(request.cookies.get(authCookieName)?.value, process.env.JWT_SECRET || "");
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

  if (route.requiredRole && session.role !== route.requiredRole) {
    return new NextResponse("권한이 없습니다.", { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/app/:path*", "/admin/:path*", "/dispatch", "/return", "/partners", "/repairs", "/lost-items", "/contracts", "/reservations"],
};
