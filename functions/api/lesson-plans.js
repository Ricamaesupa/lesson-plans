// GET /api/lesson-plans -> all individual lesson plans across students
// (Lesson Planning sidebar area), newest first, with student name +
// curriculum title. Optional ?student_id=..., ?curriculum_id=...,
// ?status=draft|ready|in_progress|completed filters.
// The plans are the same records created in the per-student teaching
// flow — this endpoint only lists them, it creates nothing new.
import { json, err, allRows } from "./_lib.js";

const STATUSES = ["draft", "ready", "in_progress", "completed"];

export async function onRequestGet(context) {
  const { request, env } = context;
  try {
    const url = new URL(request.url);
    const studentId = url.searchParams.get("student_id");
    const curriculumId = url.searchParams.get("curriculum_id");
    const status = url.searchParams.get("status");
    let sql =
      "SELECT lp.*, s.first_name AS student_first_name, s.nickname AS student_nickname, c.title AS curriculum_title FROM lesson_plans lp JOIN students s ON s.id = lp.student_id LEFT JOIN curricula c ON c.id = lp.curriculum_id";
    const params = [];
    const where = [];
    if (studentId) {
      where.push("lp.student_id = ?");
      params.push(studentId);
    }
    if (curriculumId) {
      where.push("lp.curriculum_id = ?");
      params.push(curriculumId);
    }
    if (status && STATUSES.includes(status)) {
      where.push("lp.status = ?");
      params.push(status);
    }
    if (where.length) sql += " WHERE " + where.join(" AND ");
    sql += " ORDER BY lp.created_at DESC";
    const rows = await allRows(env.DB, sql, ...params);
    return json(rows);
  } catch {
    return err(500, "server error");
  }
}
