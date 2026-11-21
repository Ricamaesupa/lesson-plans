// GET /api/auth/me -> 200 {"authenticated":true} or 401 {"authenticated":false}.
import { json, isAuthenticated } from "../_lib.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  const authed = await isAuthenticated(request, env);
  if (!authed) return json({ authenticated: false }, 401);
  return json({ authenticated: true }, 200);
}
