// Auth gate for the LMS (teacher only).
// Allows through: /lms/login.html, /api/auth/login, /api/auth/logout,
// and everything NOT under /lms/ or /api/ (the public site).
// Other /lms/* pages without a valid session: redirect to /lms/login.html.
// Other /api/* without a valid session: 401 JSON {"error":"unauthorized"}.

import { isAuthenticated } from "./api/_lib.js";

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  const isLms = path === "/lms" || path.startsWith("/lms/");
  const isApi = path === "/api" || path.startsWith("/api/");

  // Public site: not under /lms/ or /api/.
  if (!isLms && !isApi) return next();

  // Always allowed through.
  if (path === "/lms/login.html") return next();
  if (path === "/api/auth/login" || path === "/api/auth/logout") return next();

  // /lms/ (bare, without trailing slash) is the dashboard entry point.
  // Treat it as a protected LMS page.
  const authed = await isAuthenticated(request, env);

  if (isApi) {
    if (!authed) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    return next();
  }

  // isLms from here.
  if (!authed) {
    return Response.redirect(new URL("/lms/login.html", url).toString(), 302);
  }
  return next();
}
