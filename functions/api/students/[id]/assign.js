// POST /api/students/:id/assign {curriculum_id (required)} -> 201 assignment.
// 409 {"error":"already assigned"} if already assigned; 404 if student/curriculum missing.
// 409 {"error":"curriculum is not published yet"} if the curriculum is still a draft
// (flowchart: only published curricula go to Assign to Students).
import { json, err, parseJsonBody, reqString, nowIso, firstRow } from "../../_lib.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  const studentId = context.params ? context.params.id : null;
  if (!studentId) return err(400, "student id is required");
  const body = await parseJsonBody(request);
  if (!body || typeof body !== "object") {
    return err(400, "invalid JSON body");
  }
  const curriculumId = reqString(body.curriculum_id);
  if (!curriculumId) return err(400, "curriculum_id is required");
  try {
    const student = await firstRow(env.DB, "SELECT id FROM students WHERE id = ?", studentId);
    if (!student) return err(404, "student not found");
    const curriculum = await firstRow(
      env.DB,
      "SELECT id, status FROM curricula WHERE id = ?",
      curriculumId
    );
    if (!curriculum) return err(404, "curriculum not found");
    if (curriculum.status !== "published") {
      return err(409, "curriculum is not published yet");
    }
    const existing = await firstRow(
      env.DB,
      "SELECT * FROM student_curricula WHERE student_id = ? AND curriculum_id = ?",
      studentId,
      curriculumId
    );
    if (existing) return err(409, "already assigned");
    const id = crypto.randomUUID();
    const now = nowIso();
    await env.DB.prepare(
      "INSERT INTO student_curricula (id, student_id, curriculum_id, status, started_at) VALUES (?, ?, ?, 'active', ?)"
    )
      .bind(id, studentId, curriculumId, now)
      .run();
    const assignment = await firstRow(
      env.DB,
      "SELECT * FROM student_curricula WHERE id = ?",
      id
    );
    return json(assignment, 201);
  } catch {
    return err(500, "server error");
  }
}
