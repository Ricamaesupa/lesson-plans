// GET /api/students/:id -> {student, assignments, assessments}; 404 if missing.
// PUT /api/students/:id -> 200 student; 404 if missing.
// DELETE /api/students/:id -> 204 (assignments + assessments deleted too).
import {
  json,
  err,
  parseJsonBody,
  reqString,
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
  if (!id) return err(400, "student id is required");
  try {
    const student = await firstRow(env.DB, "SELECT * FROM students WHERE id = ?", id);
    if (!student) return err(404, "student not found");
    const assignments = await allRows(
      env.DB,
      "SELECT sc.id, sc.curriculum_id, c.title AS curriculum_title, sc.status, sc.started_at FROM student_curricula sc LEFT JOIN curricula c ON c.id = sc.curriculum_id WHERE sc.student_id = ? ORDER BY sc.started_at ASC",
      id
    );
    const assessments = await allRows(
      env.DB,
      "SELECT * FROM skill_assessments WHERE student_id = ? ORDER BY assessed_at DESC",
      id
    );
    return json({ student, assignments, assessments });
  } catch {
    return err(500, "server error");
  }
}

export async function onRequestPut(context) {
  const { request, env } = context;
  const id = getId(context);
  if (!id) return err(400, "student id is required");
  const body = await parseJsonBody(request);
  if (!body || typeof body !== "object") {
    return err(400, "invalid JSON body");
  }
  // Validate types for any supplied fields.
  for (const key of ["first_name", "nickname", "full_name", "track", "notes", "status"]) {
    if (body[key] !== undefined && body[key] !== null && typeof body[key] !== "string") {
      return err(400, key + " must be a string");
    }
  }
  if (body.first_name !== undefined && body.first_name !== null && !reqString(body.first_name)) {
    return err(400, "first_name must not be empty");
  }
  if (body.status !== undefined && body.status !== null) {
    const s = body.status.trim();
    if (s !== "active" && s !== "inactive") return err(400, "status must be 'active' or 'inactive'");
  }
  try {
    const existing = await firstRow(env.DB, "SELECT * FROM students WHERE id = ?", id);
    if (!existing) return err(404, "student not found");
    const updated = {
      first_name: body.first_name !== undefined ? reqString(body.first_name) || existing.first_name : existing.first_name,
      nickname: body.nickname !== undefined ? optString(body.nickname) : existing.nickname,
      full_name: body.full_name !== undefined ? optString(body.full_name) : existing.full_name,
      track: body.track !== undefined ? optString(body.track) : existing.track,
      notes: body.notes !== undefined ? optString(body.notes) : existing.notes,
      status: body.status !== undefined && body.status !== null ? body.status.trim() : existing.status,
    };
    const now = nowIso();
    await env.DB.prepare(
      "UPDATE students SET first_name = ?, nickname = ?, full_name = ?, track = ?, notes = ?, status = ?, updated_at = ? WHERE id = ?"
    )
      .bind(
        updated.first_name,
        updated.nickname,
        updated.full_name,
        updated.track,
        updated.notes,
        updated.status,
        now,
        id
      )
      .run();
    const student = await firstRow(env.DB, "SELECT * FROM students WHERE id = ?", id);
    return json(student, 200);
  } catch {
    return err(500, "server error");
  }
}

export async function onRequestDelete(context) {
  const { env } = context;
  const id = getId(context);
  if (!id) return err(400, "student id is required");
  try {
    const existing = await firstRow(env.DB, "SELECT id FROM students WHERE id = ?", id);
    if (!existing) return err(404, "student not found");
    // Enforce cascade in code as well (D1 has FK enforcement off by default).
    await env.DB.prepare("DELETE FROM student_curricula WHERE student_id = ?").bind(id).run();
    await env.DB.prepare("DELETE FROM skill_assessments WHERE student_id = ?").bind(id).run();
    // Phase 2/3 records for this student.
    await env.DB.prepare("DELETE FROM practice_items WHERE student_id = ?").bind(id).run();
    await env.DB.prepare("DELETE FROM session_observations WHERE session_id IN (SELECT id FROM teaching_sessions WHERE student_id = ?)").bind(id).run();
    await env.DB.prepare("DELETE FROM end_session_reports WHERE student_id = ?").bind(id).run();
    await env.DB.prepare("DELETE FROM teaching_sessions WHERE student_id = ?").bind(id).run();
    await env.DB.prepare("DELETE FROM lesson_plans WHERE student_id = ?").bind(id).run();
    await env.DB.prepare("DELETE FROM achievement_reports WHERE student_id = ?").bind(id).run();
    await env.DB.prepare("DELETE FROM final_assessments WHERE student_id = ?").bind(id).run();
    await env.DB.prepare("DELETE FROM portfolio_entries WHERE student_id = ?").bind(id).run();
    await env.DB.prepare("DELETE FROM students WHERE id = ?").bind(id).run();
    return new Response(null, { status: 204 });
  } catch {
    return err(500, "server error");
  }
}
