// GET /api/students/:id/assessments -> array, newest first.
// POST /api/students/:id/assessments {level (required), notes?, curriculum_id?} -> 201; 404 if student missing.
import {
  json,
  err,
  parseJsonBody,
  reqString,
  optString,
  nowIso,
  allRows,
  firstRow,
} from "../../_lib.js";

export async function onRequestGet(context) {
  const { env } = context;
  const studentId = context.params ? context.params.id : null;
  if (!studentId) return err(400, "student id is required");
  try {
    const student = await firstRow(env.DB, "SELECT id FROM students WHERE id = ?", studentId);
    if (!student) return err(404, "student not found");
    const rows = await allRows(
      env.DB,
      "SELECT * FROM skill_assessments WHERE student_id = ? ORDER BY assessed_at DESC",
      studentId
    );
    return json(rows);
  } catch {
    return err(500, "server error");
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const studentId = context.params ? context.params.id : null;
  if (!studentId) return err(400, "student id is required");
  const body = await parseJsonBody(request);
  if (!body || typeof body !== "object") {
    return err(400, "invalid JSON body");
  }
  const level = reqString(body.level);
  if (!level) return err(400, "level is required");
  for (const key of ["notes", "curriculum_id"]) {
    if (body[key] !== undefined && body[key] !== null && typeof body[key] !== "string") {
      return err(400, key + " must be a string");
    }
  }
  const curriculumId = optString(body.curriculum_id);
  try {
    const student = await firstRow(env.DB, "SELECT id FROM students WHERE id = ?", studentId);
    if (!student) return err(404, "student not found");
    if (curriculumId) {
      const curriculum = await firstRow(
        env.DB,
        "SELECT id FROM curricula WHERE id = ?",
        curriculumId
      );
      if (!curriculum) return err(404, "curriculum not found");
    }
    const id = crypto.randomUUID();
    const now = nowIso();
    await env.DB.prepare(
      "INSERT INTO skill_assessments (id, student_id, curriculum_id, level, notes, assessed_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
      .bind(id, studentId, curriculumId, level, optString(body.notes), now)
      .run();
    const assessment = await firstRow(
      env.DB,
      "SELECT * FROM skill_assessments WHERE id = ?",
      id
    );
    return json(assessment, 201);
  } catch {
    return err(500, "server error");
  }
}
