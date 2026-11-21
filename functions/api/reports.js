// GET /api/reports -> all end-session reports (teacher's End-Session
// Reports area), newest first, with student name and curriculum title.
// Optional ?student_id=... filter. This lists the teacher's records
// inside the LMS — NOT the public parent-facing End Session Report page.
import { json, err, allRows } from "./_lib.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  try {
    const url = new URL(request.url);
    const studentId = url.searchParams.get("student_id");
    let sql =
      "SELECT r.*, s.first_name AS student_first_name, s.nickname AS student_nickname, c.title AS curriculum_title, lp.title AS lesson_plan_title FROM end_session_reports r JOIN students s ON s.id = r.student_id JOIN teaching_sessions ts ON ts.id = r.session_id LEFT JOIN curricula c ON c.id = ts.curriculum_id LEFT JOIN lesson_plans lp ON lp.id = r.lesson_plan_id";
    const params = [];
    if (studentId) {
      sql += " WHERE r.student_id = ?";
      params.push(studentId);
    }
    sql += " ORDER BY r.created_at DESC";
    const rows = await allRows(env.DB, sql, ...params);
    return json(rows);
  } catch {
    return err(500, "server error");
  }
}
