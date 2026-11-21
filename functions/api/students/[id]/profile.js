// GET /api/students/:id/profile -> the "Select Student -> View Student
// Profile -> Check Previous Session Report -> Review Learning Progress"
// step of the Individual Student Lesson & Session flowchart
// (mermaid-diagram__2.png). Returns the student, their assignments with
// per-curriculum progress, their assessments, and their previous
// end-session reports (newest first). 404 if the student is missing.
import { json, err, allRows, firstRow } from "../../_lib.js";
import { getStudentProgress } from "../../_progress.js";

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
    const progress = await getStudentProgress(env.DB, id);
    const assessments = await allRows(
      env.DB,
      "SELECT * FROM skill_assessments WHERE student_id = ? ORDER BY assessed_at DESC",
      id
    );
    const previousReports = await allRows(
      env.DB,
      "SELECT r.*, s.curriculum_id, c.title AS curriculum_title, lp.title AS lesson_plan_title FROM end_session_reports r JOIN teaching_sessions s ON s.id = r.session_id LEFT JOIN curricula c ON c.id = s.curriculum_id LEFT JOIN lesson_plans lp ON lp.id = r.lesson_plan_id WHERE r.student_id = ? ORDER BY r.created_at DESC LIMIT 10",
      id
    );
    return json({ student, progress, assessments, previous_reports: previousReports });
  } catch {
    return err(500, "server error");
  }
}
