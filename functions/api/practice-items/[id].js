// One follow-up item (flowchart: Provide Additional Practice /
// Create Remedial Activities).
// PUT /api/practice-items/:id {details?, status?} -> 200; status must be
// 'open' or 'done'. DELETE /api/practice-items/:id -> 204.
import {
  json,
  err,
  parseJsonBody,
  reqString,
  optString,
  nowIso,
  firstRow,
} from "../_lib.js";

function getId(context) {
  return context.params ? context.params.id : null;
}

export async function onRequestPut(context) {
  const { request, env } = context;
  const id = getId(context);
  if (!id) return err(400, "practice item id is required");
  const body = await parseJsonBody(request);
  if (!body || typeof body !== "object") {
    return err(400, "invalid JSON body");
  }
  if (body.details !== undefined && body.details !== null && typeof body.details !== "string") {
    return err(400, "details must be a string");
  }
  if (body.details !== undefined && body.details !== null && !reqString(body.details)) {
    return err(400, "details must not be empty");
  }
  if (body.status !== undefined && body.status !== null) {
    const s = body.status.trim();
    if (s !== "open" && s !== "done") return err(400, "status must be 'open' or 'done'");
  }
  try {
    const existing = await firstRow(env.DB, "SELECT * FROM practice_items WHERE id = ?", id);
    if (!existing) return err(404, "practice item not found");
    const updated = {
      details: body.details !== undefined ? reqString(body.details) || existing.details : existing.details,
      status: body.status !== undefined && body.status !== null ? body.status.trim() : existing.status,
    };
    const now = nowIso();
    await env.DB.prepare(
      "UPDATE practice_items SET details = ?, status = ?, updated_at = ? WHERE id = ?"
    )
      .bind(updated.details, updated.status, now, id)
      .run();
    const item = await firstRow(env.DB, "SELECT * FROM practice_items WHERE id = ?", id);
    return json(item, 200);
  } catch {
    return err(500, "server error");
  }
}

export async function onRequestDelete(context) {
  const { env } = context;
  const id = getId(context);
  if (!id) return err(400, "practice item id is required");
  try {
    const existing = await firstRow(env.DB, "SELECT id FROM practice_items WHERE id = ?", id);
    if (!existing) return err(404, "practice item not found");
    await env.DB.prepare("DELETE FROM practice_items WHERE id = ?").bind(id).run();
    return new Response(null, { status: 204 });
  } catch {
    return err(500, "server error");
  }
}
