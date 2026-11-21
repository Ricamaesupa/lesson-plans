// Session observations (flowchart: Observe Student Performance ->
// Evaluate Learning Objectives -> Objectives Achieved?).
// GET /api/sessions/:id/observations -> the session's observation
// (at most one) or null.
// POST /api/sessions/:id/observations {observation?, performance_notes?,
// objectives_evaluation?, objectives_achieved?} -> 201; 409 if the
// session already has one (update it instead). objectives_achieved must
// be 'yes', 'partially' or 'no' when given.
import {
  json,
  err,
  parseJsonBody,
  optString,
  nowIso,
  firstRow,
} from "../../_lib.js";

const OUTCOMES = ["yes", "partially", "no"];
const TEXT_FIELDS = ["observation", "performance_notes", "objectives_evaluation"];

function getId(context) {
  return context.params ? context.params.id : null;
}

export async function onRequestGet(context) {
  const { env } = context;
  const id = getId(context);
  if (!id) return err(400, "session id is required");
  try {
    const session = await firstRow(env.DB, "SELECT id FROM teaching_sessions WHERE id = ?", id);
    if (!session) return err(404, "session not found");
    const observation = await firstRow(
      env.DB,
      "SELECT * FROM session_observations WHERE session_id = ?",
      id
    );
    return json(observation || null);
  } catch {
    return err(500, "server error");
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const sessionId = getId(context);
  if (!sessionId) return err(400, "session id is required");
  const body = await parseJsonBody(request);
  if (!body || typeof body !== "object") {
    return err(400, "invalid JSON body");
  }
  for (const key of TEXT_FIELDS) {
    if (body[key] !== undefined && body[key] !== null && typeof body[key] !== "string") {
      return err(400, key + " must be a string");
    }
  }
  let outcome = null;
  if (body.objectives_achieved !== undefined && body.objectives_achieved !== null) {
    if (typeof body.objectives_achieved !== "string") {
      return err(400, "objectives_achieved must be a string");
    }
    outcome = body.objectives_achieved.trim();
    if (!OUTCOMES.includes(outcome)) {
      return err(400, "objectives_achieved must be 'yes', 'partially' or 'no'");
    }
  }
  try {
    const session = await firstRow(env.DB, "SELECT id FROM teaching_sessions WHERE id = ?", sessionId);
    if (!session) return err(404, "session not found");
    const existing = await firstRow(
      env.DB,
      "SELECT id FROM session_observations WHERE session_id = ?",
      sessionId
    );
    if (existing) return err(409, "this session already has an observation — update it instead");
    const id = crypto.randomUUID();
    const now = nowIso();
    await env.DB.prepare(
      "INSERT INTO session_observations (id, session_id, observation, performance_notes, objectives_evaluation, objectives_achieved, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(
        id,
        sessionId,
        optString(body.observation),
        optString(body.performance_notes),
        optString(body.objectives_evaluation),
        outcome,
        now,
        now
      )
      .run();
    const observation = await firstRow(env.DB, "SELECT * FROM session_observations WHERE id = ?", id);
    return json(observation, 201);
  } catch {
    return err(500, "server error");
  }
}
