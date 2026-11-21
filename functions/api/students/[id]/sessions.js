// Teaching sessions for one student (flowchart: Plan Next Session,
// Conduct Teaching Session).
// GET /api/students/:id/sessions -> sessions newest first (optional
// ?curriculum_id=... and ?status=planned|conducted filters).
// POST /api/students/:id/sessions {curriculum_id (required),
// lesson_plan_id?, session_number?, scheduled_at?} -> 201, status
// 'planned'. The student must be assigned to the curriculum. When the
// lesson plan is given it must belong to this student + curriculum.
// session_number defaults to the next number in the cycle.
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
} from "../../_lib.js";

function getId(context) {
  return context.params ? context.params.id : null;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const id = getId(context);
  if (!id) return err(400, "student id is required");
  try {
    const student = await firstRow(env.DB, "SELECT id FROM students WHERE id = ?", id);
    if (!student) return err(404, "student not found");
    const url = new URL(request.url);
    const curriculumId = url.searchParams.get("curriculum_id");
    const status = url.searchParams.get("status");
    let sql =
      "SELECT s.*, lp.title AS lesson_plan_title FROM teaching_sessions s LEFT JOIN lesson_plans lp ON lp.id = s.lesson_plan_id WHERE s.student_id = ?";
    const params = [id];
    if (curriculumId) {
      sql += " AND s.curriculum_id = ?";
      params.push(curriculumId);
    }
    if (status === "planned" || status === "conducted") {
      sql += " AND s.status = ?";
      params.push(status);
    }
    sql += " ORDER BY s.created_at DESC";
    const rows = await allRows(env.DB, sql, ...params);
    return json(rows);
  } catch {
    return err(500, "server error");
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const studentId = getId(context);
  if (!studentId) return err(400, "student id is required");
  const body = await parseJsonBody(request);
  if (!body || typeof body !== "object") {
    return err(400, "invalid JSON body");
  }
  const curriculumId = reqString(body.curriculum_id);
  if (!curriculumId) return err(400, "curriculum_id is required");
  if (body.lesson_plan_id !== undefined && body.lesson_plan_id !== null && typeof body.lesson_plan_id !== "string") {
    return err(400, "lesson_plan_id must be a string");
  }
  if (body.scheduled_at !== undefined && body.scheduled_at !== null && typeof body.scheduled_at !== "string") {
    return err(400, "scheduled_at must be a string");
  }
  if (isBadOptInt(body.session_number)) {
    return err(400, "session_number must be a non-negative integer");
  }
  try {
    const student = await firstRow(env.DB, "SELECT id FROM students WHERE id = ?", studentId);
    if (!student) return err(404, "student not found");
    const curriculum = await firstRow(env.DB, "SELECT id FROM curricula WHERE id = ?", curriculumId);
    if (!curriculum) return err(404, "curriculum not found");
    const assignment = await firstRow(
      env.DB,
      "SELECT id FROM student_curricula WHERE student_id = ? AND curriculum_id = ?",
      studentId,
      curriculumId
    );
    if (!assignment) return err(409, "student is not assigned to this curriculum");
    let lessonPlanId = optString(body.lesson_plan_id);
    if (lessonPlanId) {
      const plan = await firstRow(env.DB, "SELECT * FROM lesson_plans WHERE id = ?", lessonPlanId);
      if (!plan) return err(404, "lesson plan not found");
      if (plan.student_id !== studentId || plan.curriculum_id !== curriculumId) {
        return err(400, "lesson plan does not belong to this student and curriculum");
      }
    }
    let sessionNumber = optInt(body.session_number);
    if (sessionNumber === null) {
      const countRow = await firstRow(
        env.DB,
        "SELECT COUNT(*) AS n FROM teaching_sessions WHERE student_id = ? AND curriculum_id = ?",
        studentId,
        curriculumId
      );
      sessionNumber = (countRow ? countRow.n : 0) + 1;
    }
    const id = crypto.randomUUID();
    const now = nowIso();
    await env.DB.prepare(
      "INSERT INTO teaching_sessions (id, student_id, curriculum_id, lesson_plan_id, session_number, scheduled_at, status, conducted_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'planned', NULL, ?, ?)"
    )
      .bind(id, studentId, curriculumId, lessonPlanId, sessionNumber, optString(body.scheduled_at), now, now)
      .run();
    const session = await firstRow(env.DB, "SELECT * FROM teaching_sessions WHERE id = ?", id);
    return json(session, 201);
  } catch {
    return err(500, "server error");
  }
}
