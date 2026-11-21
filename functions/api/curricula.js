// GET /api/curricula -> array with module_count and lesson_count per curriculum.
// POST /api/curricula {title (required), subject?, description?, total_sessions?, public_page?, age_group?, skill_level?, learning_objectives?, cycle_length?} -> 201.
// New curricula start as 'draft' (flowchart: Save -> Ready to Use? -> Publish).
// cycle_length is the "Sessions Completed?" cycle length (default 25).
import {
  json,
  err,
  parseJsonBody,
  reqString,
  optString,
  optInt,
  isBadOptInt,
  nowIso,
  allRows,
  firstRow,
} from "./_lib.js";

export async function onRequestGet(context) {
  const { env } = context;
  try {
    const rows = await allRows(
      env.DB,
      "SELECT c.*, (SELECT COUNT(*) FROM modules m WHERE m.curriculum_id = c.id) AS module_count, (SELECT COUNT(*) FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.curriculum_id = c.id) AS lesson_count FROM curricula c ORDER BY c.title ASC"
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
  const title = reqString(body.title);
  if (!title) return err(400, "title is required");
  for (const key of ["subject", "description", "public_page", "age_group", "skill_level", "learning_objectives"]) {
    if (body[key] !== undefined && body[key] !== null && typeof body[key] !== "string") {
      return err(400, key + " must be a string");
    }
  }
  if (isBadOptInt(body.total_sessions)) {
    return err(400, "total_sessions must be a non-negative integer");
  }
  if (isBadOptInt(body.cycle_length)) {
    return err(400, "cycle_length must be a non-negative integer");
  }
  const id = crypto.randomUUID();
  const now = nowIso();
  try {
    await env.DB.prepare(
      "INSERT INTO curricula (id, title, subject, description, total_sessions, public_page, status, age_group, skill_level, learning_objectives, cycle_length, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?)"
    )
      .bind(
        id,
        title,
        optString(body.subject),
        optString(body.description),
        optInt(body.total_sessions),
        optString(body.public_page),
        optString(body.age_group),
        optString(body.skill_level),
        optString(body.learning_objectives),
        optInt(body.cycle_length) === null ? 25 : optInt(body.cycle_length),
        now,
        now
      )
      .run();
    const curriculum = await firstRow(env.DB, "SELECT * FROM curricula WHERE id = ?", id);
    return json(curriculum, 201);
  } catch {
    return err(500, "server error");
  }
}
