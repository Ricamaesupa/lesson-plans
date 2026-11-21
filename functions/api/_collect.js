// Shared collector for the Student portfolio & achievement report
// flowchart (2026-11-21, mermaid-diagram__3.png):
// Student Records -> Collect Session Reports -> Collect Assessment Scores
// -> Collect Completed Projects -> Collect Skills & Competencies ->
// Compare Initial and Final Performance.
// Everything collected here is data the teacher already recorded; nothing
// is invented, and any section with no data yet comes back empty.
import { allRows, firstRow } from "./_lib.js";
import { getAssignmentProgress } from "./_progress.js";

// Collects everything the achievement report and the digital portfolio
// need for one student + one curriculum. Returns null when the student
// is not assigned to that curriculum.
export async function collectStudentRecords(db, studentId, curriculumId) {
  const student = await firstRow(db, "SELECT * FROM students WHERE id = ?", studentId);
  if (!student) return null;
  const curriculum = await firstRow(db, "SELECT * FROM curricula WHERE id = ?", curriculumId);
  if (!curriculum) return null;
  const progress = await getAssignmentProgress(db, studentId, curriculumId);
  if (!progress) return null;

  // Session reports (with their session outcome for the assessment scores).
  const sessionReports = await allRows(
    db,
    "SELECT r.*, s.session_number, s.conducted_at, o.objectives_achieved, o.objectives_evaluation, lp.title AS lesson_plan_title FROM end_session_reports r JOIN teaching_sessions s ON s.id = r.session_id LEFT JOIN session_observations o ON o.session_id = s.id LEFT JOIN lesson_plans lp ON lp.id = r.lesson_plan_id WHERE r.student_id = ? AND s.curriculum_id = ? ORDER BY s.session_number ASC, r.created_at ASC",
    studentId,
    curriculumId
  );

  // Assessment scores: every recorded outcome + the skill assessments.
  const outcomeRows = await allRows(
    db,
    "SELECT s.session_number, o.objectives_achieved, o.objectives_evaluation FROM session_observations o JOIN teaching_sessions s ON s.id = o.session_id WHERE s.student_id = ? AND s.curriculum_id = ? AND o.objectives_achieved IS NOT NULL ORDER BY s.session_number ASC",
    studentId,
    curriculumId
  );
  const skillAssessments = await allRows(
    db,
    "SELECT * FROM skill_assessments WHERE student_id = ? AND (curriculum_id = ? OR curriculum_id IS NULL) ORDER BY assessed_at ASC",
    studentId,
    curriculumId
  );

  // Completed projects: lesson plans marked completed, plus every
  // conducted session (each one is a completed piece of work).
  const completedPlans = await allRows(
    db,
    "SELECT * FROM lesson_plans WHERE student_id = ? AND curriculum_id = ? AND status = 'completed' ORDER BY updated_at ASC",
    studentId,
    curriculumId
  );
  const conductedSessions = await allRows(
    db,
    "SELECT s.*, lp.title AS lesson_plan_title FROM teaching_sessions s LEFT JOIN lesson_plans lp ON lp.id = s.lesson_plan_id WHERE s.student_id = ? AND s.curriculum_id = ? AND s.status = 'conducted' ORDER BY s.session_number ASC",
    studentId,
    curriculumId
  );

  // Skills & competencies: the skill assessments, in order.
  // Initial vs final: the earliest assessment vs the latest one.
  const initialAssessment = skillAssessments.length ? skillAssessments[0] : null;
  const finalAssessment = skillAssessments.length
    ? skillAssessments[skillAssessments.length - 1]
    : null;

  // Final assessment record + latest generated achievement report.
  const finalAssessmentRecord = await firstRow(
    db,
    "SELECT * FROM final_assessments WHERE student_id = ? AND curriculum_id = ?",
    studentId,
    curriculumId
  );
  const latestReport = await firstRow(
    db,
    "SELECT * FROM achievement_reports WHERE student_id = ? AND curriculum_id = ? ORDER BY created_at DESC",
    studentId,
    curriculumId
  );

  // Digital portfolio entries.
  const portfolioEntries = await allRows(
    db,
    "SELECT * FROM portfolio_entries WHERE student_id = ? AND (curriculum_id = ? OR curriculum_id IS NULL) ORDER BY created_at ASC",
    studentId,
    curriculumId
  );

  return {
    student,
    curriculum,
    progress,
    session_reports: sessionReports,
    assessment_scores: {
      outcomes: outcomeRows,
      counts: progress.outcomes,
    },
    completed_projects: {
      lesson_plans: completedPlans,
      conducted_sessions: conductedSessions,
    },
    skills: skillAssessments,
    initial_vs_final: {
      initial: initialAssessment,
      final: finalAssessment,
    },
    final_assessment: finalAssessmentRecord || null,
    latest_achievement_report: latestReport || null,
    portfolio_entries: portfolioEntries,
  };
}

// Composes the readable achievement-report text from collected records.
// Plain text with headings; the teacher's own evaluations are included
// verbatim when present, and sections with no data say so.
export function composeAchievementReport(collected) {
  const { student, curriculum, progress } = collected;
  const name = student.nickname || student.first_name;
  const lines = [];
  lines.push("Achievement Report — " + name);
  lines.push("Curriculum: " + curriculum.title);
  lines.push("");
  lines.push("Sessions: " + progress.completed_sessions + " of " + progress.cycle_length + " completed" + (progress.cycle_completed ? " — cycle complete." : "."));
  lines.push("Objectives achieved: yes " + progress.outcomes.yes + ", partially " + progress.outcomes.partially + ", no " + progress.outcomes.no + ".");
  lines.push("");
  lines.push("Session reports (" + collected.session_reports.length + "):");
  if (!collected.session_reports.length) {
    lines.push("No end-session reports recorded yet.");
  } else {
    for (const r of collected.session_reports) {
      const label = "Session " + (r.session_number || "?") + (r.lesson_plan_title ? " — " + r.lesson_plan_title : "");
      lines.push("- " + label + (r.objectives_achieved ? " (objectives: " + r.objectives_achieved + ")" : ""));
      if (r.achievements) lines.push("  Achievements: " + r.achievements);
    }
  }
  lines.push("");
  lines.push("Assessment scores:");
  if (!collected.assessment_scores.outcomes.length) {
    lines.push("No session evaluations recorded yet.");
  } else {
    for (const o of collected.assessment_scores.outcomes) {
      lines.push("- Session " + (o.session_number || "?") + ": " + o.objectives_achieved + (o.objectives_evaluation ? " — " + o.objectives_evaluation : ""));
    }
  }
  lines.push("");
  lines.push("Completed projects:");
  const projects = collected.completed_projects.lesson_plans;
  if (!projects.length && !collected.completed_projects.conducted_sessions.length) {
    lines.push("No completed projects recorded yet.");
  } else {
    for (const p of projects) lines.push("- " + p.title);
    if (!projects.length) {
      lines.push(collected.completed_projects.conducted_sessions.length + " conducted session(s), no lesson plan marked completed yet.");
    }
  }
  lines.push("");
  lines.push("Skills & competencies:");
  if (!collected.skills.length) {
    lines.push("No skill assessments recorded yet.");
  } else {
    for (const s of collected.skills) {
      lines.push("- " + s.level + (s.notes ? " — " + s.notes : ""));
    }
  }
  lines.push("");
  lines.push("Initial vs final performance:");
  const { initial, final } = collected.initial_vs_final;
  lines.push("Initial: " + (initial ? initial.level + (initial.notes ? " — " + initial.notes : "") : "not recorded yet."));
  lines.push("Final: " + (final ? final.level + (final.notes ? " — " + final.notes : "") : "not recorded yet."));
  lines.push("");
  if (collected.final_assessment) {
    if (collected.final_assessment.learning_outcomes_evaluation) {
      lines.push("Evaluation of learning outcomes:");
      lines.push(collected.final_assessment.learning_outcomes_evaluation);
      lines.push("");
    }
    if (collected.final_assessment.overall_evaluation) {
      lines.push("Teacher's overall evaluation:");
      lines.push(collected.final_assessment.overall_evaluation);
      lines.push("");
    }
    if (collected.final_assessment.summary) {
      lines.push("Final assessment summary:");
      lines.push(collected.final_assessment.summary);
      lines.push("");
    }
  }
  lines.push("Portfolio entries: " + collected.portfolio_entries.length + ".");
  return lines.join("\n");
}
