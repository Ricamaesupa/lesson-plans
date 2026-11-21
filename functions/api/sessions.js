// GET /api/sessions -> all teaching sessions across students
// (Session Management sidebar area), newest first, with student name,
// curriculum title and lesson plan title. Optional ?student_id=...,
// ?curriculum_id=..., ?status=planned|conducted filters.
// The sessions are the same records created in the per-student teaching
// flow — this endpoint only lists them, it creates nothing new.
import { json, err, allRows } from "./_lib.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  try {
    const url = new URL(request.url);
    const studentId = url.searchParams.get("student_id");
    const curriculumId = url.searchParams.get("curriculum_id");
    const status = url.searchParams.get("status");
    let sql =
      "SELECT s.*, st.first_name AS student_first_name, st.nickname AS student_nickname, c.title AS curriculum_title, lp.title AS lesson_plan_title FROM teaching_sessions s JOIN students st ON st.id = s.student_id LEFT JOIN curricula c ON c.id = s.curriculum_id LEFT JOIN lesson_plans lp ON lp.id = s.lesson_plan_id";
    const params = [];
    const where = [];
    if (studentId) {
      where.push("s.student_id = ?");
      params.push(studentId);
    }
    if (curriculumId) {
      where.push("s.curriculum_id = ?");
      params.push(curriculumId);
    }
    if (status === "planned" || status === "conducted") {
      where.push("s.status = ?");
      params.push(status);
    }
    if (where.length) sql += " WHERE " + where.join(" AND ");
    sql += " ORDER BY s.created_at DESC";
    const rows = await allRows(env.DB, sql, ...params);
    return json(rows);
  } catch {
    return err(500, "server error");
  }
}
