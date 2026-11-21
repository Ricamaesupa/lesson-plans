// GET /api/students -> array of students, ordered by first_name.
// POST /api/students {first_name (required), nickname?, full_name?, track?, notes?} -> 201 student.
import {
  json,
  err,
  parseJsonBody,
  reqString,
  optString,
  nowIso,
  allRows,
  firstRow,
} from "./_lib.js";

export async function onRequestGet(context) {
  const { env } = context;
  try {
    const rows = await allRows(
      env.DB,
      "SELECT * FROM students ORDER BY first_name ASC"
    );
    return json(rows);
  } catch {
    return err(500, "server error");
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const body = await parseJsonBody(request);
  if (!body || typeof body !== "object") {
    return err(400, "invalid JSON body");
  }
  const firstName = reqString(body.first_name);
  if (!firstName) return err(400, "first_name is required");
  // Reject non-string values for optional fields.
  for (const key of ["nickname", "full_name", "track", "notes"]) {
    if (body[key] !== undefined && body[key] !== null && typeof body[key] !== "string") {
      return err(400, key + " must be a string");
    }
  }
  const id = crypto.randomUUID();
  const now = nowIso();
  try {
    await env.DB.prepare(
      "INSERT INTO students (id, first_name, nickname, full_name, track, notes, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)"
    )
      .bind(
        id,
        firstName,
        optString(body.nickname),
        optString(body.full_name),
        optString(body.track),
        optString(body.notes),
        now,
        now
      )
      .run();
    const student = await firstRow(env.DB, "SELECT * FROM students WHERE id = ?", id);
    return json(student, 201);
  } catch {
    return err(500, "server error");
  }
}
