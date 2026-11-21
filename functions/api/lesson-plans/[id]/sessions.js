// Sessions of one lesson plan (flowchart: Customise Individual Lesson
// Plan -> Plan Next Session).
// GET /api/lesson-plans/:id/sessions -> sessions for the plan, oldest first.
// POST /api/lesson-plans/:id/sessions {scheduled_at?, session_number?}
// -> 201, status 'planned'. The plan's student + curriculum are used;
// session_number defaults to the next number in the cycle.
import {
  json,
  err,
  parseJsonBody,
  optString,
  optInt,
  isBadOptInt,
  nowIso,
  allRows,
  firstRow,
} from "../../_lib.js";

function getId(context) {
  return context.params ? context.params.id : null;
}

export async function onRequestGet(context) {
  const { env } = context;
  const id = getId(context);
  if (!id) return err(400, "lesson plan id is required");
  try {
    const plan = await firstRow(env.DB, "SELECT id FROM lesson_plans WHERE id = ?", id);
    if (!plan) return err(404, "lesson plan not found");
    const rows = await allRows(
      env.DB,
      "SELECT * FROM teaching_sessions WHERE lesson_plan_id = ? ORDER BY created_at ASC",
      id
    );
    return json(rows);
  } catch {
    return err(500, "server error");
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const planId = getId(context);
  if (!planId) return err(400, "lesson plan id is required");
  const body = await parseJsonBody(request);
  if (!body || typeof body !== "object") {
    return err(400, "invalid JSON body");
  }
  if (body.scheduled_at !== undefined && body.scheduled_at !== null && typeof body.scheduled_at !== "string") {
    return err(400, "scheduled_at must be a string");
  }
  if (isBadOptInt(body.session_number)) {
    return err(400, "session_number must be a non-negative integer");
  }
  try {
    const plan = await firstRow(env.DB, "SELECT * FROM lesson_plans WHERE id = ?", planId);
    if (!plan) return err(404, "lesson plan not found");
    let sessionNumber = optInt(body.session_number);
    if (sessionNumber === null) {
      const countRow = await firstRow(
        env.DB,
        "SELECT COUNT(*) AS n FROM teaching_sessions WHERE student_id = ? AND curriculum_id = ?",
        plan.student_id,
        plan.curriculum_id
      );
      sessionNumber = (countRow ? countRow.n : 0) + 1;
    }
    const id = crypto.randomUUID();
    const now = nowIso();
    await env.DB.prepare(
      "INSERT INTO teaching_sessions (id, student_id, curriculum_id, lesson_plan_id, session_number, scheduled_at, status, conducted_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'planned', NULL, ?, ?)"
    )
      .bind(id, plan.student_id, plan.curriculum_id, planId, sessionNumber, optString(body.scheduled_at), now, now)
      .run();
    const session = await firstRow(env.DB, "SELECT * FROM teaching_sessions WHERE id = ?", id);
    return json(session, 201);
  } catch {
    return err(500, "server error");
  }
}
