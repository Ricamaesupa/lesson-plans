// GET /api/roadmap -> the 25-Session Roadmap: one entry per student +
// assigned curriculum, with cycle progress (from _progress.js, using the
// curriculum's own cycle_length) and the next planned sessions.
// Read-only: it is built from lesson plans + sessions + cycle math, and
// creates no records.
import { json, err, allRows } from "./_lib.js";
import { getAssignmentProgress } from "./_progress.js";

export async function onRequestGet(context) {
  const { env } = context;
  try {
    const assignments = await allRows(
      env.DB,
      "SELECT sc.student_id, sc.curriculum_id, s.first_name AS student_first_name, s.nickname AS student_nickname, c.title AS curriculum_title FROM student_curricula sc JOIN students s ON s.id = sc.student_id JOIN curricula c ON c.id = sc.curriculum_id ORDER BY s.first_name ASC, c.title ASC"
    );
    const out = [];
    for (const a of assignments) {
      const p = await getAssignmentProgress(env.DB, a.student_id, a.curriculum_id);
      if (!p) continue;
      const planned = await allRows(
        env.DB,
        "SELECT ts.*, lp.title AS lesson_plan_title FROM teaching_sessions ts LEFT JOIN lesson_plans lp ON lp.id = ts.lesson_plan_id WHERE ts.student_id = ? AND ts.curriculum_id = ? AND ts.status = 'planned' ORDER BY ts.session_number ASC",
        a.student_id,
        a.curriculum_id
      );
      out.push({
        ...p,
        student_first_name: a.student_first_name,
        student_nickname: a.student_nickname,
        next_planned_sessions: planned,
      });
    }
    return json(out);
  } catch {
    return err(500, "server error");
  }
}
