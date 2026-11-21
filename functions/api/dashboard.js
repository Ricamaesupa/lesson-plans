// GET /api/dashboard -> {"students":N,"curricula":N,"assignments":N,
// "assessments":N,"lesson_plans":N,"sessions_conducted":N,"reports":N,
// "portfolio_entries":N}
import { json, err } from "./_lib.js";

async function count(db, sql) {
  const row = await db.prepare(sql).first();
  return row ? row.n : 0;
}

export async function onRequestGet(context) {
  const { env } = context;
  try {
    const students = await count(env.DB, "SELECT COUNT(*) AS n FROM students");
    const curricula = await count(env.DB, "SELECT COUNT(*) AS n FROM curricula");
    const assignments = await count(env.DB, "SELECT COUNT(*) AS n FROM student_curricula");
    const assessments = await count(env.DB, "SELECT COUNT(*) AS n FROM skill_assessments");
    const lessonPlans = await count(env.DB, "SELECT COUNT(*) AS n FROM lesson_plans");
    const sessionsConducted = await count(
      env.DB,
      "SELECT COUNT(*) AS n FROM teaching_sessions WHERE status = 'conducted'"
    );
    const reports = await count(env.DB, "SELECT COUNT(*) AS n FROM end_session_reports");
    const portfolioEntries = await count(env.DB, "SELECT COUNT(*) AS n FROM portfolio_entries");
    return json({
      students,
      curricula,
      assignments,
      assessments,
      lesson_plans: lessonPlans,
      sessions_conducted: sessionsConducted,
      reports,
      portfolio_entries: portfolioEntries,
    });
  } catch {
    return err(500, "server error");
  }
}
