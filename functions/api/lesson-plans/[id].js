// One lesson plan (flowchart: Customise Individual Lesson Plan).
// GET /api/lesson-plans/:id -> {plan, sessions:[...]}; 404 if missing.
// PUT /api/lesson-plans/:id {title?, custom_objectives?,
// custom_activities?, assessment_plan?, materials?, session_number?,
// status?} -> 200; status must be 'draft', 'ready', 'in_progress' or
// 'completed' ('completed' plans count as completed projects).
// DELETE /api/lesson-plans/:id -> 204 (sessions are kept but unlinked).
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
} from "../_lib.js";

const STATUSES = ["draft", "ready", "in_progress", "completed"];
const TEXT_FIELDS = ["custom_objectives", "custom_activities", "assessment_plan", "materials"];

function getId(context) {
  return context.params ? context.params.id : null;
}

export async function onRequestGet(context) {
  const { env } = context;
  const id = getId(context);
  if (!id) return err(400, "lesson plan id is required");
  try {
    const plan = await firstRow(env.DB, "SELECT * FROM lesson_plans WHERE id = ?", id);
    if (!plan) return err(404, "lesson plan not found");
    const sessions = await allRows(
      env.DB,
      "SELECT * FROM teaching_sessions WHERE lesson_plan_id = ? ORDER BY created_at ASC",
      id
    );
    return json({ plan, sessions });
  } catch {
    return err(500, "server error");
  }
}

export async function onRequestPut(context) {
  const { request, env } = context;
  const id = getId(context);
  if (!id) return err(400, "lesson plan id is required");
  const body = await parseJsonBody(request);
  if (!body || typeof body !== "object") {
    return err(400, "invalid JSON body");
  }
  for (const key of ["title", ...TEXT_FIELDS]) {
    if (body[key] !== undefined && body[key] !== null && typeof body[key] !== "string") {
      return err(400, key + " must be a string");
    }
  }
  if (body.title !== undefined && body.title !== null && !reqString(body.title)) {
    return err(400, "title must not be empty");
  }
  if (isBadOptInt(body.session_number)) {
    return err(400, "session_number must be a non-negative integer");
  }
  if (body.status !== undefined && body.status !== null) {
    const s = body.status.trim();
    if (!STATUSES.includes(s)) {
      return err(400, "status must be one of: " + STATUSES.join(", "));
    }
  }
  try {
    const existing = await firstRow(env.DB, "SELECT * FROM lesson_plans WHERE id = ?", id);
    if (!existing) return err(404, "lesson plan not found");
    const updated = {
      title: body.title !== undefined ? reqString(body.title) || existing.title : existing.title,
      custom_objectives: body.custom_objectives !== undefined ? optString(body.custom_objectives) : existing.custom_objectives,
      custom_activities: body.custom_activities !== undefined ? optString(body.custom_activities) : existing.custom_activities,
      assessment_plan: body.assessment_plan !== undefined ? optString(body.assessment_plan) : existing.assessment_plan,
      materials: body.materials !== undefined ? optString(body.materials) : existing.materials,
      session_number: body.session_number !== undefined ? optInt(body.session_number) : existing.session_number,
      status: body.status !== undefined && body.status !== null ? body.status.trim() : existing.status,
    };
    const now = nowIso();
    await env.DB.prepare(
      "UPDATE lesson_plans SET title = ?, custom_objectives = ?, custom_activities = ?, assessment_plan = ?, materials = ?, session_number = ?, status = ?, updated_at = ? WHERE id = ?"
    )
      .bind(
        updated.title,
        updated.custom_objectives,
        updated.custom_activities,
        updated.assessment_plan,
        updated.materials,
        updated.session_number,
        updated.status,
        now,
        id
      )
      .run();
    const plan = await firstRow(env.DB, "SELECT * FROM lesson_plans WHERE id = ?", id);
    return json(plan, 200);
  } catch {
    return err(500, "server error");
  }
}

export async function onRequestDelete(context) {
  const { env } = context;
  const id = getId(context);
  if (!id) return err(400, "lesson plan id is required");
  try {
    const existing = await firstRow(env.DB, "SELECT id FROM lesson_plans WHERE id = ?", id);
    if (!existing) return err(404, "lesson plan not found");
    // Sessions and reports stay (they are the student's records); they
    // are unlinked from the deleted plan.
    await env.DB.prepare("UPDATE teaching_sessions SET lesson_plan_id = NULL WHERE lesson_plan_id = ?").bind(id).run();
    await env.DB.prepare("UPDATE end_session_reports SET lesson_plan_id = NULL WHERE lesson_plan_id = ?").bind(id).run();
    await env.DB.prepare("DELETE FROM lesson_plans WHERE id = ?").bind(id).run();
    return new Response(null, { status: 204 });
  } catch {
    return err(500, "server error");
  }
}
