// End-session reports (flowchart: Record End-Session Report; main
// diagram: record achievements, record challenges, teacher remarks,
// homework & next steps).
// GET /api/sessions/:id/report -> the session's report (at most one) or null.
// POST /api/sessions/:id/report {achievements?, challenges?,
// teacher_remarks?, homework_next_steps?} -> 201; 409 if the session
// already has one (update it instead). This is the teacher's record
// inside the LMS — NOT the public parent-facing End Session Report page.
import {
  json,
  err,
  parseJsonBody,
  optString,
  nowIso,
  firstRow,
} from "../../_lib.js";

const TEXT_FIELDS = ["achievements", "challenges", "teacher_remarks", "homework_next_steps"];

function getId(context) {
  return context.params ? context.params.id : null;
}

export async function onRequestGet(context) {
  const { env } = context;
  const id = getId(context);
  if (!id) return err(400, "session id is required");
  try {
    const session = await firstRow(env.DB, "SELECT id FROM teaching_sessions WHERE id = ?", id);
    if (!session) return err(404, "session not found");
    const report = await firstRow(
      env.DB,
      "SELECT * FROM end_session_reports WHERE session_id = ?",
      id
    );
    return json(report || null);
  } catch {
    return err(500, "server error");
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const sessionId = getId(context);
  if (!sessionId) return err(400, "session id is required");
  const body = await parseJsonBody(request);
  if (!body || typeof body !== "object") {
    return err(400, "invalid JSON body");
  }
  for (const key of TEXT_FIELDS) {
    if (body[key] !== undefined && body[key] !== null && typeof body[key] !== "string") {
      return err(400, key + " must be a string");
    }
  }
  try {
    const session = await firstRow(env.DB, "SELECT * FROM teaching_sessions WHERE id = ?", sessionId);
    if (!session) return err(404, "session not found");
    const existing = await firstRow(
      env.DB,
      "SELECT id FROM end_session_reports WHERE session_id = ?",
      sessionId
    );
    if (existing) return err(409, "this session already has an end-session report — update it instead");
    const id = crypto.randomUUID();
    const now = nowIso();
    await env.DB.prepare(
      "INSERT INTO end_session_reports (id, session_id, student_id, lesson_plan_id, achievements, challenges, teacher_remarks, homework_next_steps, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(
        id,
        sessionId,
        session.student_id,
        session.lesson_plan_id,
        optString(body.achievements),
        optString(body.challenges),
        optString(body.teacher_remarks),
        optString(body.homework_next_steps),
        now,
        now
      )
      .run();
    const report = await firstRow(env.DB, "SELECT * FROM end_session_reports WHERE id = ?", id);
    return json(report, 201);
  } catch {
    return err(500, "server error");
  }
}
