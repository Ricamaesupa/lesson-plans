// POST /api/auth/login {password} -> 200 {"ok":true} + Set-Cookie
// 401 {"error":"incorrect password"}; 500 if env password/secret unset.
import {
  json,
  err,
  constantTimeEqual,
  parseJsonBody,
  signSession,
  sessionCookieHeader,
} from "../_lib.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.LMS_TEACHER_PASSWORD || !env.LMS_SESSION_SECRET) {
    return err(500, "teacher password not configured");
  }

  const body = await parseJsonBody(request);
  if (!body || typeof body !== "object" || typeof body.password !== "string") {
    return err(400, "password is required");
  }

  if (!constantTimeEqual(body.password, env.LMS_TEACHER_PASSWORD)) {
    return err(401, "incorrect password");
  }

  let token;
  try {
    token = await signSession(env.LMS_SESSION_SECRET);
  } catch {
    return err(500, "server error");
  }

  return json(
    { ok: true },
    200,
    { "Set-Cookie": sessionCookieHeader(token) }
  );
}
