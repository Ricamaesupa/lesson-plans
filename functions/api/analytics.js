// GET /api/analytics -> learning statistics (Analytics sidebar area).
// Read-only: every number is computed from the tables the teacher already
// recorded (sessions, observations, reports, lesson plans, portfolio,
// final assessments). No new data entry, no invented figures — empty
// sections come back as zeroes / empty arrays.
import { json, err, allRows, firstRow } from "./_lib.js";

async function count(db, sql, ...params) {
  const row = await firstRow(db, sql, ...params);
  return row ? row.n : 0;
}

function outcomesFrom(rows) {
  const out = { yes: 0, partially: 0, no: 0 };
  for (const row of rows) {
    if (row.outcome in out) out[row.outcome] = row.n;
  }
  return out;
}

export async function onRequestGet(context) {
  const { env } = context;
  try {
    const totals = {
      students: await count(env.DB, "SELECT COUNT(*) AS n FROM students"),
      curricula: await count(env.DB, "SELECT COUNT(*) AS n FROM curricula"),
      assignments: await count(env.DB, "SELECT COUNT(*) AS n FROM student_curricula"),
      lesson_plans: await count(env.DB, "SELECT COUNT(*) AS n FROM lesson_plans"),
      lesson_plans_completed: await count(
        env.DB,
        "SELECT COUNT(*) AS n FROM lesson_plans WHERE status = 'completed'"
      ),
      sessions_planned: await count(
        env.DB,
        "SELECT COUNT(*) AS n FROM teaching_sessions WHERE status = 'planned'"
      ),
      sessions_conducted: await count(
        env.DB,
        "SELECT COUNT(*) AS n FROM teaching_sessions WHERE status = 'conducted'"
      ),
      reports: await count(env.DB, "SELECT COUNT(*) AS n FROM end_session_reports"),
      portfolio_entries: await count(env.DB, "SELECT COUNT(*) AS n FROM portfolio_entries"),
      final_assessments: await count(env.DB, "SELECT COUNT(*) AS n FROM final_assessments"),
      achievement_reports: await count(env.DB, "SELECT COUNT(*) AS n FROM achievement_reports"),
    };

    const outcomes = outcomesFrom(
      await allRows(
        env.DB,
        "SELECT objectives_achieved AS outcome, COUNT(*) AS n FROM session_observations WHERE objectives_achieved IS NOT NULL GROUP BY objectives_achieved"
      )
    );

    // Per student: only students with at least one curriculum assignment.
    const perStudent = [];
    const students = await allRows(
      env.DB,
      "SELECT s.id, s.first_name, s.nickname, COUNT(sc.id) AS assignments FROM students s JOIN student_curricula sc ON sc.student_id = s.id GROUP BY s.id ORDER BY s.first_name ASC"
    );
    for (const st of students) {
      const conducted = await count(
        env.DB,
        "SELECT COUNT(*) AS n FROM teaching_sessions WHERE student_id = ? AND status = 'conducted'",
        st.id
      );
      const planned = await count(
        env.DB,
        "SELECT COUNT(*) AS n FROM teaching_sessions WHERE student_id = ? AND status = 'planned'",
        st.id
      );
      const reports = await count(
        env.DB,
        "SELECT COUNT(*) AS n FROM end_session_reports WHERE student_id = ?",
        st.id
      );
      const oc = outcomesFrom(
        await allRows(
          env.DB,
          "SELECT o.objectives_achieved AS outcome, COUNT(*) AS n FROM session_observations o JOIN teaching_sessions s ON s.id = o.session_id WHERE s.student_id = ? AND o.objectives_achieved IS NOT NULL GROUP BY o.objectives_achieved",
          st.id
        )
      );
      perStudent.push({
        student_id: st.id,
        first_name: st.first_name,
        nickname: st.nickname,
        assignments: st.assignments,
        sessions_conducted: conducted,
        sessions_planned: planned,
        reports,
        outcomes: oc,
      });
    }

    // Per curriculum: every curriculum, with zeroes where nothing is recorded yet.
    const perCurriculum = [];
    const curricula = await allRows(env.DB, "SELECT id, title, cycle_length FROM curricula ORDER BY title ASC");
    for (const c of curricula) {
      const assigned = await count(
        env.DB,
        "SELECT COUNT(*) AS n FROM student_curricula WHERE curriculum_id = ?",
        c.id
      );
      const conducted = await count(
        env.DB,
        "SELECT COUNT(*) AS n FROM teaching_sessions WHERE curriculum_id = ? AND status = 'conducted'",
        c.id
      );
      const planned = await count(
        env.DB,
        "SELECT COUNT(*) AS n FROM teaching_sessions WHERE curriculum_id = ? AND status = 'planned'",
        c.id
      );
      const oc = outcomesFrom(
        await allRows(
          env.DB,
          "SELECT o.objectives_achieved AS outcome, COUNT(*) AS n FROM session_observations o JOIN teaching_sessions s ON s.id = o.session_id WHERE s.curriculum_id = ? AND o.objectives_achieved IS NOT NULL GROUP BY o.objectives_achieved",
          c.id
        )
      );
      perCurriculum.push({
        curriculum_id: c.id,
        title: c.title,
        cycle_length: c.cycle_length,
        students_assigned: assigned,
        sessions_conducted: conducted,
        sessions_planned: planned,
        outcomes: oc,
      });
    }

    return json({ totals, outcomes, per_student: perStudent, per_curriculum: perCurriculum });
  } catch {
    return err(500, "server error");
  }
}
