// Final assessments for one student (flowchart: 25 Sessions Completed?
// Yes -> Final Assessment).
// GET /api/students/:id/final-assessments -> list (optional
// ?curriculum_id=... filter).
// POST /api/students/:id/final-assessments {curriculum_id (required),
// summary?, learning_outcomes_evaluation?, overall_evaluation?} -> 201.
// The cycle must be complete first (409 "cycle not complete yet" when
// conducted sessions are below the curriculum's cycle length), and there
// is one final assessment per student + curriculum (409 if one exists).
// summary, learning_outcomes_evaluation and overall_evaluation are all
// teacher-entered text (portfolio flowchart: Evaluate Learning Outcomes,
// Teacher's Overall Evaluation).
import {
  json,
  err,
  parseJsonBody,
  reqString,
  optString,
  nowIso,
  allRows,
  firstRow,
} from "../../_lib.js";
import { getAssignmentProgress } from "../../_progress.js";

const TEXT_FIELDS = ["summary", "learning_outcomes_evaluation", "overall_evaluation"];

function getId(context) {
  return context.params ? context.params.id : null;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const id = getId(context);
  if (!id) return err(400, "student id is required");
  try {
    const student = await firstRow(env.DB, "SELECT id FROM students WHERE id = ?", id);
    if (!student) return err(404, "student not found");
    const url = new URL(request.url);
    const curriculumId = url.searchParams.get("curriculum_id");
    const rows = curriculumId
      ? await allRows(
          env.DB,
          "SELECT * FROM final_assessments WHERE student_id = ? AND curriculum_id = ? ORDER BY created_at DESC",
          id,
          curriculumId
        )
      : await allRows(
          env.DB,
          "SELECT * FROM final_assessments WHERE student_id = ? ORDER BY created_at DESC",
          id
        );
    return json(rows);
  } catch {
    return err(500, "server error");
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const studentId = getId(context);
  if (!studentId) return err(400, "student id is required");
  const body = await parseJsonBody(request);
  if (!body || typeof body !== "object") {
    return err(400, "invalid JSON body");
  }
  const curriculumId = reqString(body.curriculum_id);
  if (!curriculumId) return err(400, "curriculum_id is required");
  for (const key of TEXT_FIELDS) {
    if (body[key] !== undefined && body[key] !== null && typeof body[key] !== "string") {
      return err(400, key + " must be a string");
    }
  }
  try {
    const student = await firstRow(env.DB, "SELECT id FROM students WHERE id = ?", studentId);
    if (!student) return err(404, "student not found");
    const curriculum = await firstRow(env.DB, "SELECT id FROM curricula WHERE id = ?", curriculumId);
    if (!curriculum) return err(404, "curriculum not found");
    const progress = await getAssignmentProgress(env.DB, studentId, curriculumId);
    if (!progress) return err(409, "student is not assigned to this curriculum");
    if (!progress.cycle_completed) {
      return err(
        409,
        "cycle not complete yet: " + progress.completed_sessions + " of " + progress.cycle_length + " sessions completed"
      );
    }
    const existing = await firstRow(
      env.DB,
      "SELECT id FROM final_assessments WHERE student_id = ? AND curriculum_id = ?",
      studentId,
      curriculumId
    );
    if (existing) return err(409, "this student already has a final assessment for this curriculum — update it instead");
    const id = crypto.randomUUID();
    const now = nowIso();
    await env.DB.prepare(
      "INSERT INTO final_assessments (id, student_id, curriculum_id, summary, learning_outcomes_evaluation, overall_evaluation, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(
        id,
        studentId,
        curriculumId,
        optString(body.summary),
        optString(body.learning_outcomes_evaluation),
        optString(body.overall_evaluation),
        now,
        now
      )
      .run();
    const assessment = await firstRow(env.DB, "SELECT * FROM final_assessments WHERE id = ?", id);
    return json(assessment, 201);
  } catch {
    return err(500, "server error");
  }
}
