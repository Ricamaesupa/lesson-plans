// Shared progress helpers for Phases 2 + 3.
// "Sessions Completed?" is answered per student per assigned curriculum:
// completed sessions are teaching_sessions with status 'conducted'.
// cycle_length comes from curricula (default 25; seeded curricula use
// their total_sessions). cycle_completed is true when conducted sessions
// reach the cycle length.
import { allRows, firstRow } from "./_lib.js";

export const DEFAULT_CYCLE_LENGTH = 25;

export function cycleLengthOf(curriculum) {
  if (!curriculum) return DEFAULT_CYCLE_LENGTH;
  const n = curriculum.cycle_length;
  return Number.isInteger(n) && n > 0 ? n : DEFAULT_CYCLE_LENGTH;
}

// Progress for one student + one curriculum. Returns null when the
// student is not assigned to that curriculum.
export async function getAssignmentProgress(db, studentId, curriculumId) {
  const assignment = await firstRow(
    db,
    "SELECT sc.*, c.title AS curriculum_title, c.cycle_length, c.total_sessions FROM student_curricula sc LEFT JOIN curricula c ON c.id = sc.curriculum_id WHERE sc.student_id = ? AND sc.curriculum_id = ?",
    studentId,
    curriculumId
  );
  if (!assignment) return null;
  const cycleLength = cycleLengthOf(assignment);
  const counts = await firstRow(
    db,
    "SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'conducted' THEN 1 ELSE 0 END) AS conducted, SUM(CASE WHEN status = 'planned' THEN 1 ELSE 0 END) AS planned FROM teaching_sessions WHERE student_id = ? AND curriculum_id = ?",
    studentId,
    curriculumId
  );
  const conducted = counts && counts.conducted ? counts.conducted : 0;
  const planned = counts && counts.planned ? counts.planned : 0;
  const outcomeRows = await allRows(
    db,
    "SELECT o.objectives_achieved AS outcome, COUNT(*) AS n FROM session_observations o JOIN teaching_sessions s ON s.id = o.session_id WHERE s.student_id = ? AND s.curriculum_id = ? AND o.objectives_achieved IS NOT NULL GROUP BY o.objectives_achieved",
    studentId,
    curriculumId
  );
  const outcomes = { yes: 0, partially: 0, no: 0 };
  for (const row of outcomeRows) {
    if (row.outcome in outcomes) outcomes[row.outcome] = row.n;
  }
  return {
    assignment_id: assignment.id,
    student_id: studentId,
    curriculum_id: curriculumId,
    curriculum_title: assignment.curriculum_title,
    status: assignment.status,
    started_at: assignment.started_at,
    cycle_length: cycleLength,
    total_sessions: assignment.total_sessions,
    completed_sessions: conducted,
    planned_sessions: planned,
    sessions_total: counts ? counts.total : 0,
    cycle_completed: conducted >= cycleLength,
    sessions_remaining: Math.max(0, cycleLength - conducted),
    next_session_number: conducted + planned + 1,
    outcomes,
  };
}

// Progress for every curriculum assigned to a student.
export async function getStudentProgress(db, studentId) {
  const assignments = await allRows(
    db,
    "SELECT curriculum_id FROM student_curricula WHERE student_id = ? ORDER BY started_at ASC",
    studentId
  );
  const out = [];
  for (const a of assignments) {
    const p = await getAssignmentProgress(db, studentId, a.curriculum_id);
    if (p) out.push(p);
  }
  return out;
}
