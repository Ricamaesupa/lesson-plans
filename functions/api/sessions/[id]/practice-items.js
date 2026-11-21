// Follow-up items for one session (flowchart: Objectives Achieved?
// Partially -> Provide Additional Practice; No -> Create Remedial
// Activities).
// GET /api/sessions/:id/practice-items -> items oldest first.
// POST /api/sessions/:id/practice-items {kind (required:
// 'additional_practice' or 'remedial'), details (required)} -> 201.
import {
  json,
  err,
  parseJsonBody,
  reqString,
  nowIso,
  allRows,
  firstRow,
} from "../../_lib.js";

const KINDS = ["additional_practice", "remedial"];

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
    const rows = await allRows(
      env.DB,
      "SELECT * FROM practice_items WHERE session_id = ? ORDER BY created_at ASC",
      id
    );
    return json(rows);
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
  const kind = reqString(body.kind);
  if (!kind || !KINDS.includes(kind)) {
    return err(400, "kind must be 'additional_practice' or 'remedial'");
  }
  const details = reqString(body.details);
  if (!details) return err(400, "details is required");
  try {
    const session = await firstRow(env.DB, "SELECT * FROM teaching_sessions WHERE id = ?", sessionId);
    if (!session) return err(404, "session not found");
    const id = crypto.randomUUID();
    const now = nowIso();
    await env.DB.prepare(
      "INSERT INTO practice_items (id, session_id, student_id, kind, details, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'open', ?, ?)"
    )
      .bind(id, sessionId, session.student_id, kind, details, now, now)
      .run();
    const item = await firstRow(env.DB, "SELECT * FROM practice_items WHERE id = ?", id);
    return json(item, 201);
  } catch {
    return err(500, "server error");
  }
}
