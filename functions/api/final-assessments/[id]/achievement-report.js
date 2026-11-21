// Generate the achievement report for a final assessment (portfolio
// flowchart: Collect Session Reports, Assessment Scores, Completed
// Projects, Skills & Competencies -> Compare Initial and Final
// Performance -> Generate Achievement Report).
// POST /api/final-assessments/:id/achievement-report -> 201 with the
// stored report {id, final_assessment_id, student_id, curriculum_id,
// content, created_at}. The content is composed from the student's
// recorded data (see _collect.js); nothing is invented, and sections
// with no data yet say so.
// No duplicate records: generating again for the same final assessment
// refreshes the one report row for it (same id) instead of inserting
// another row — a report is a document of the records, not a new record.
// GET /api/final-assessments/:id/achievement-report -> the latest
// generated report for this final assessment, or null.
import { json, err, nowIso, firstRow } from "../../_lib.js";
import { collectStudentRecords, composeAchievementReport } from "../../_collect.js";

function getId(context) {
  return context.params ? context.params.id : null;
}

export async function onRequestGet(context) {
  const { env } = context;
  const id = getId(context);
  if (!id) return err(400, "final assessment id is required");
  try {
    const assessment = await firstRow(env.DB, "SELECT id FROM final_assessments WHERE id = ?", id);
    if (!assessment) return err(404, "final assessment not found");
    const report = await firstRow(
      env.DB,
      "SELECT * FROM achievement_reports WHERE final_assessment_id = ? ORDER BY created_at DESC",
      id
    );
    return json(report || null);
  } catch {
    return err(500, "server error");
  }
}

export async function onRequestPost(context) {
  const { env } = context;
  const id = getId(context);
  if (!id) return err(400, "final assessment id is required");
  try {
    const assessment = await firstRow(env.DB, "SELECT * FROM final_assessments WHERE id = ?", id);
    if (!assessment) return err(404, "final assessment not found");
    const collected = await collectStudentRecords(env.DB, assessment.student_id, assessment.curriculum_id);
    if (!collected) return err(404, "student records not found");
    const content = composeAchievementReport(collected);
    const now = nowIso();
    // One report per final assessment: regenerate refreshes the existing
    // row instead of adding a duplicate.
    const existing = await firstRow(
      env.DB,
      "SELECT * FROM achievement_reports WHERE final_assessment_id = ? ORDER BY created_at DESC",
      id
    );
    let report;
    if (existing) {
      await env.DB.prepare(
        "UPDATE achievement_reports SET content = ?, created_at = ? WHERE id = ?"
      )
        .bind(content, now, existing.id)
        .run();
      report = await firstRow(env.DB, "SELECT * FROM achievement_reports WHERE id = ?", existing.id);
    } else {
      const reportId = crypto.randomUUID();
      await env.DB.prepare(
        "INSERT INTO achievement_reports (id, final_assessment_id, student_id, curriculum_id, content, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      )
        .bind(reportId, id, assessment.student_id, assessment.curriculum_id, content, now)
        .run();
      report = await firstRow(env.DB, "SELECT * FROM achievement_reports WHERE id = ?", reportId);
    }
    return json(report, 201);
  } catch {
    return err(500, "server error");
  }
}
