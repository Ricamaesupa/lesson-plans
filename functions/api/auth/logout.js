// POST /api/auth/logout -> clears cookie, 200 {"ok":true}.
import { json, clearSessionCookieHeader } from "../_lib.js";

export async function onRequestPost() {
  return json(
    { ok: true },
    200,
    { "Set-Cookie": clearSessionCookieHeader() }
  );
}
