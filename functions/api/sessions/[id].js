// One teaching session (flowchart: Conduct Teaching Session).
// GET /api/sessions/:id -> {session, student, curriculum_title,
// lesson_plan, observation, report, practice_items}; 404 if missing.
// PUT /api/sessions/:id {status?, scheduled_at?, conducted_at?,
// lesson_plan_id?} -> 200; status must be 'planned' or 'conducted'.
// Marking a session 'conducted' stamps conducted_at when not given.
import {
  json,
  err,
  parseJsonBody,
  optString,
  nowIso,
  allRows,
  firstRow,
} from "../_lib.js";

function getId(context) {
  return context.params ? context.params.id : null;
}

export async function onRequestGet(context) {
  const { env } = context;
  const id = getId(context);
  if (!id) return err(400, "session id is required");
  try {
    const session = await firstRow(env.DB, "SELECT * FROM teaching_sessions WHERE id = ?", id);
    if (!session) return err(404, "session not found");
    const student = await firstRow(env.DB, "SELECT * FROM students WHERE id = ?", session.student_id);
    const curriculum = await firstRow(env.DB, "SELECT id, title FROM curricula WHERE id = ?", session.curriculum_id);
    const lessonPlan = session.lesson_plan_id
      ? await firstRow(env.DB, "SELECT * FROM lesson_plans WHERE id = ?", session.lesson_plan_id)
      : null;
    const observation = await firstRow(
      env.DB,
      "SELECT * FROM session_observations WHERE session_id = ?",
      id
    );
    const report = await firstRow(
      env.DB,
      "SELECT * FROM end_session_reports WHERE session_id = ?",
      id
    );
    const practiceItems = await allRows(
      env.DB,
      "SELECT * FROM practice_items WHERE session_id = ? ORDER BY created_at ASC",
      id
    );
    return json({
      session,
      student,
      curriculum_title: curriculum ? curriculum.title : null,
      lesson_plan: lessonPlan,
      observation,
      report,
      practice_items: practiceItems,
    });
  } catch {
    return err(500, "server error");
  }
}

export async function onRequestPut(context) {
  const { request, env } = context;
  const id = getId(context);
  if (!id) return err(400, "session id is required");
  const body = await parseJsonBody(request);
  if (!body || typeof body !== "object") {
    return err(400, "invalid JSON body");
  }
  for (const key of ["scheduled_at", "conducted_at", "lesson_plan_id"]) {
    if (body[key] !== undefined && body[key] !== null && typeof body[key] !== "string") {
      return err(400, key + " must be a string");
    }
  }
  if (body.status !== undefined && body.status !== null) {
    const s = body.status.trim();
    if (s !== "planned" && s !== "conducted") {
      return err(400, "status must be 'planned' or 'conducted'");
    }
  }
  try {
    const existing = await firstRow(env.DB, "SELECT * FROM teaching_sessions WHERE id = ?", id);
    if (!existing) return err(404, "session not found");
    let lessonPlanId = existing.lesson_plan_id;
    if (body.lesson_plan_id !== undefined) {
      lessonPlanId = optString(body.lesson_plan_id);
      if (lessonPlanId) {
        const plan = await firstRow(env.DB, "SELECT * FROM lesson_plans WHERE id = ?", lessonPlanId);
        if (!plan) return err(404, "lesson plan not found");
        if (plan.student_id !== existing.student_id || plan.curriculum_id !== existing.curriculum_id) {
          return err(400, "lesson plan does not belong to this student and curriculum");
        }
      }
    }
    const status = body.status !== undefined && body.status !== null ? body.status.trim() : existing.status;
    let conductedAt = body.conducted_at !== undefined ? optString(body.conducted_at) : existing.conducted_at;
    if (status === "conducted" && !conductedAt) conductedAt = nowIso();
    if (status === "planned") conductedAt = null;
    const now = nowIso();
    await env.DB.prepare(
      "UPDATE teaching_sessions SET lesson_plan_id = ?, scheduled_at = ?, status = ?, conducted_at = ?, updated_at = ? WHERE id = ?"
    )
      .bind(
        lessonPlanId,
        body.scheduled_at !== undefined ? optString(body.scheduled_at) : existing.scheduled_at,
        status,
        conductedAt,
        now,
        id
      )
      .run();
    const session = await firstRow(env.DB, "SELECT * FROM teaching_sessions WHERE id = ?", id);
    return json(session, 200);
  } catch {
    return err(500, "server error");
  }
}
