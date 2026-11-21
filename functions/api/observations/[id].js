// One session observation (flowchart: Observe Student Performance ->
// Evaluate Learning Objectives -> Objectives Achieved?).
// PUT /api/observations/:id {observation?, performance_notes?,
// objectives_evaluation?, objectives_achieved?} -> 200; 404 if missing.
// objectives_achieved must be 'yes', 'partially' or 'no' when given.
import {
  json,
  err,
  parseJsonBody,
  optString,
  nowIso,
  firstRow,
} from "../_lib.js";

const OUTCOMES = ["yes", "partially", "no"];
const TEXT_FIELDS = ["observation", "performance_notes", "objectives_evaluation"];

function getId(context) {
  return context.params ? context.params.id : null;
}

export async function onRequestPut(context) {
  const { request, env } = context;
  const id = getId(context);
  if (!id) return err(400, "observation id is required");
  const body = await parseJsonBody(request);
  if (!body || typeof body !== "object") {
    return err(400, "invalid JSON body");
  }
  for (const key of TEXT_FIELDS) {
    if (body[key] !== undefined && body[key] !== null && typeof body[key] !== "string") {
      return err(400, key + " must be a string");
    }
  }
  let outcome = undefined;
  if (body.objectives_achieved !== undefined) {
    if (body.objectives_achieved === null) {
      outcome = null;
    } else {
      if (typeof body.objectives_achieved !== "string") {
        return err(400, "objectives_achieved must be a string");
      }
      outcome = body.objectives_achieved.trim();
      if (!OUTCOMES.includes(outcome)) {
        return err(400, "objectives_achieved must be 'yes', 'partially' or 'no'");
      }
    }
  }
  try {
    const existing = await firstRow(env.DB, "SELECT * FROM session_observations WHERE id = ?", id);
    if (!existing) return err(404, "observation not found");
    const updated = {
      observation: body.observation !== undefined ? optString(body.observation) : existing.observation,
      performance_notes: body.performance_notes !== undefined ? optString(body.performance_notes) : existing.performance_notes,
      objectives_evaluation: body.objectives_evaluation !== undefined ? optString(body.objectives_evaluation) : existing.objectives_evaluation,
      objectives_achieved: outcome !== undefined ? outcome : existing.objectives_achieved,
    };
    const now = nowIso();
    await env.DB.prepare(
      "UPDATE session_observations SET observation = ?, performance_notes = ?, objectives_evaluation = ?, objectives_achieved = ?, updated_at = ? WHERE id = ?"
    )
      .bind(
        updated.observation,
        updated.performance_notes,
        updated.objectives_evaluation,
        updated.objectives_achieved,
        now,
        id
      )
      .run();
    const observation = await firstRow(env.DB, "SELECT * FROM session_observations WHERE id = ?", id);
    return json(observation, 200);
  } catch {
    return err(500, "server error");
  }
}
