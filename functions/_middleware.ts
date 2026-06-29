import { authCookieName, readCookie, verifyAuthToken } from "../lib/auth/jwt";
import { isRouteAllowedForSession } from "../lib/auth/access";
import { getProtectedRoute } from "../lib/auth/protected-routes";

type Env = {
  ADMIN_EMAIL?: string;
  TEAM_LEAD_EMAILS?: string;
  JWT_SECRET?: string;
};

export const onRequest: PagesFunction<Env> = async ({ request, env, next }) => {
  const url = new URL(request.url);
  const route = getProtectedRoute(url.pathname);
  if (!route) return next();

  const token = readCookie(request.headers.get("Cookie"), authCookieName);
  const session = await verifyAuthToken(token, env.JWT_SECRET || "");
  if (!session) {
    const authUrl = new URL("/auth", url.origin);
    authUrl.searchParams.set("next", route.nextPath || `${url.pathname}${url.search}`);
    return Response.redirect(authUrl.toString(), 302);
  }

  if (route.authenticatedRedirectTo) {
    return Response.redirect(new URL(route.authenticatedRedirectTo, url.origin).toString(), 302);
  }

  if (!isRouteAllowedForSession(route, session, env)) {
    return new Response("권한이 없습니다.", {
      status: 403,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return next();
};
