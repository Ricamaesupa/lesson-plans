// GET /api/curricula/:id -> {curriculum, modules:[{id,title,session_count,position, lessons:[...]}]}; 404 if missing.
// PUT /api/curricula/:id -> 200; 404 if missing.
// DELETE /api/curricula/:id -> 204 (modules + lessons cascade).
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

function getId(context) {
  return context.params ? context.params.id : null;
}

export async function onRequestGet(context) {
  const { env } = context;
  const id = getId(context);
  if (!id) return err(400, "curriculum id is required");
  try {
    const curriculum = await firstRow(env.DB, "SELECT * FROM curricula WHERE id = ?", id);
    if (!curriculum) return err(404, "curriculum not found");
    const modules = await allRows(
      env.DB,
      "SELECT * FROM modules WHERE curriculum_id = ? ORDER BY position ASC",
      id
    );
    for (const mod of modules) {
      mod.lessons = await allRows(
        env.DB,
        "SELECT * FROM lessons WHERE module_id = ? ORDER BY position ASC",
        mod.id
      );
    }
    return json({ curriculum, modules });
  } catch {
    return err(500, "server error");
  }
}

export async function onRequestPut(context) {
  const { request, env } = context;
  const id = getId(context);
  if (!id) return err(400, "curriculum id is required");
  const body = await parseJsonBody(request);
  if (!body || typeof body !== "object") {
    return err(400, "invalid JSON body");
  }
  for (const key of ["title", "subject", "description", "public_page", "status", "age_group", "skill_level", "learning_objectives"]) {
    if (body[key] !== undefined && body[key] !== null && typeof body[key] !== "string") {
      return err(400, key + " must be a string");
    }
  }
  if (body.title !== undefined && body.title !== null && !reqString(body.title)) {
    return err(400, "title must not be empty");
  }
  if (isBadOptInt(body.total_sessions)) {
    return err(400, "total_sessions must be a non-negative integer");
  }
  if (isBadOptInt(body.cycle_length)) {
    return err(400, "cycle_length must be a non-negative integer");
  }
  if (body.status !== undefined && body.status !== null) {
    const s = body.status.trim();
    if (s !== "draft" && s !== "published") return err(400, "status must be 'draft' or 'published'");
  }
  try {
    const existing = await firstRow(env.DB, "SELECT * FROM curricula WHERE id = ?", id);
    if (!existing) return err(404, "curriculum not found");
    const updated = {
      title: body.title !== undefined ? reqString(body.title) || existing.title : existing.title,
      subject: body.subject !== undefined ? optString(body.subject) : existing.subject,
      description: body.description !== undefined ? optString(body.description) : existing.description,
      total_sessions: body.total_sessions !== undefined ? optInt(body.total_sessions) : existing.total_sessions,
      public_page: body.public_page !== undefined ? optString(body.public_page) : existing.public_page,
      status: body.status !== undefined && body.status !== null ? body.status.trim() : existing.status,
      age_group: body.age_group !== undefined ? optString(body.age_group) : existing.age_group,
      skill_level: body.skill_level !== undefined ? optString(body.skill_level) : existing.skill_level,
      learning_objectives: body.learning_objectives !== undefined ? optString(body.learning_objectives) : existing.learning_objectives,
      cycle_length: body.cycle_length !== undefined ? optInt(body.cycle_length) : existing.cycle_length,
    };
    const now = nowIso();
    await env.DB.prepare(
      "UPDATE curricula SET title = ?, subject = ?, description = ?, total_sessions = ?, public_page = ?, status = ?, age_group = ?, skill_level = ?, learning_objectives = ?, cycle_length = ?, updated_at = ? WHERE id = ?"
    )
      .bind(
        updated.title,
        updated.subject,
        updated.description,
        updated.total_sessions,
        updated.public_page,
        updated.status,
        updated.age_group,
        updated.skill_level,
        updated.learning_objectives,
        updated.cycle_length,
        now,
        id
      )
      .run();
    const curriculum = await firstRow(env.DB, "SELECT * FROM curricula WHERE id = ?", id);
    return json(curriculum, 200);
  } catch {
    return err(500, "server error");
  }
}

export async function onRequestDelete(context) {
  const { env } = context;
  const id = getId(context);
  if (!id) return err(400, "curriculum id is required");
  try {
    const existing = await firstRow(env.DB, "SELECT id FROM curricula WHERE id = ?", id);
    if (!existing) return err(404, "curriculum not found");
    // Enforce cascade in code as well (D1 has FK enforcement off by default).
    const modules = await allRows(env.DB, "SELECT id FROM modules WHERE curriculum_id = ?", id);
    for (const mod of modules) {
      await env.DB.prepare("DELETE FROM lessons WHERE module_id = ?").bind(mod.id).run();
    }
    await env.DB.prepare("DELETE FROM modules WHERE curriculum_id = ?").bind(id).run();
    await env.DB.prepare("DELETE FROM student_curricula WHERE curriculum_id = ?").bind(id).run();
    await env.DB.prepare("UPDATE skill_assessments SET curriculum_id = NULL WHERE curriculum_id = ?").bind(id).run();
    // Phase 2/3 records for this curriculum (plans, sessions, observations,
    // reports, practice items, final assessments, achievement reports,
    // portfolio entries) are removed too.
    await env.DB.prepare("DELETE FROM practice_items WHERE session_id IN (SELECT id FROM teaching_sessions WHERE curriculum_id = ?)").bind(id).run();
    await env.DB.prepare("DELETE FROM session_observations WHERE session_id IN (SELECT id FROM teaching_sessions WHERE curriculum_id = ?)").bind(id).run();
    await env.DB.prepare("DELETE FROM end_session_reports WHERE session_id IN (SELECT id FROM teaching_sessions WHERE curriculum_id = ?)").bind(id).run();
    await env.DB.prepare("DELETE FROM teaching_sessions WHERE curriculum_id = ?").bind(id).run();
    await env.DB.prepare("DELETE FROM lesson_plans WHERE curriculum_id = ?").bind(id).run();
    await env.DB.prepare("DELETE FROM achievement_reports WHERE curriculum_id = ?").bind(id).run();
    await env.DB.prepare("DELETE FROM final_assessments WHERE curriculum_id = ?").bind(id).run();
    await env.DB.prepare("UPDATE portfolio_entries SET curriculum_id = NULL WHERE curriculum_id = ?").bind(id).run();
    await env.DB.prepare("DELETE FROM curricula WHERE id = ?").bind(id).run();
    return new Response(null, { status: 204 });
  } catch {
    return err(500, "server error");
  }
}
