// One final assessment (flowchart: Final Assessment).
// GET /api/final-assessments/:id -> the record; 404 if missing.
// PUT /api/final-assessments/:id {summary?, learning_outcomes_evaluation?,
// overall_evaluation?} -> 200; 404 if missing. All three fields are
// teacher-entered text.
import {
  json,
  err,
  parseJsonBody,
  optString,
  nowIso,
  firstRow,
} from "../_lib.js";

const TEXT_FIELDS = ["summary", "learning_outcomes_evaluation", "overall_evaluation"];

function getId(context) {
  return context.params ? context.params.id : null;
}

export async function onRequestGet(context) {
  const { env } = context;
  const id = getId(context);
  if (!id) return err(400, "final assessment id is required");
  try {
    const assessment = await firstRow(env.DB, "SELECT * FROM final_assessments WHERE id = ?", id);
    if (!assessment) return err(404, "final assessment not found");
    return json(assessment);
  } catch {
    return err(500, "server error");
  }
}

export async function onRequestPut(context) {
  const { request, env } = context;
  const id = getId(context);
  if (!id) return err(400, "final assessment id is required");
  const body = await parseJsonBody(request);
  if (!body || typeof body !== "object") {
    return err(400, "invalid JSON body");
  }
  for (const key of TEXT_FIELDS) {
    if (body[key] !== undefined && body[key] !== null && typeof body[key] !== "string") {
      return err(400, key + " must be a string");
    }
  }
  try {
    const existing = await firstRow(env.DB, "SELECT * FROM final_assessments WHERE id = ?", id);
    if (!existing) return err(404, "final assessment not found");
    const updated = {
      summary: body.summary !== undefined ? optString(body.summary) : existing.summary,
      learning_outcomes_evaluation: body.learning_outcomes_evaluation !== undefined ? optString(body.learning_outcomes_evaluation) : existing.learning_outcomes_evaluation,
      overall_evaluation: body.overall_evaluation !== undefined ? optString(body.overall_evaluation) : existing.overall_evaluation,
    };
    const now = nowIso();
    await env.DB.prepare(
      "UPDATE final_assessments SET summary = ?, learning_outcomes_evaluation = ?, overall_evaluation = ?, updated_at = ? WHERE id = ?"
    )
      .bind(updated.summary, updated.learning_outcomes_evaluation, updated.overall_evaluation, now, id)
      .run();
    const assessment = await firstRow(env.DB, "SELECT * FROM final_assessments WHERE id = ?", id);
    return json(assessment, 200);
  } catch {
    return err(500, "server error");
  }
}
