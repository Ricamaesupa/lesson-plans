// PUT /api/modules/:id {title?, session_count?} -> 200; 404 if missing.
// DELETE /api/modules/:id -> 204 (lessons cascade).
import {
  json,
  err,
  parseJsonBody,
  reqString,
  optInt,
  isBadOptInt,
  firstRow,
} from "../_lib.js";

function getId(context) {
  return context.params ? context.params.id : null;
}

export async function onRequestPut(context) {
  const { request, env } = context;
  const id = getId(context);
  if (!id) return err(400, "module id is required");
  const body = await parseJsonBody(request);
  if (!body || typeof body !== "object") {
    return err(400, "invalid JSON body");
  }
  if (body.title !== undefined && body.title !== null && typeof body.title !== "string") {
    return err(400, "title must be a string");
  }
  if (body.title !== undefined && body.title !== null && !reqString(body.title)) {
    return err(400, "title must not be empty");
  }
  if (isBadOptInt(body.session_count)) {
    return err(400, "session_count must be a non-negative integer");
  }
  try {
    const existing = await firstRow(env.DB, "SELECT * FROM modules WHERE id = ?", id);
    if (!existing) return err(404, "module not found");
    const title = body.title !== undefined ? reqString(body.title) || existing.title : existing.title;
    const sessionCount = body.session_count !== undefined ? optInt(body.session_count) : existing.session_count;
    await env.DB.prepare("UPDATE modules SET title = ?, session_count = ? WHERE id = ?")
      .bind(title, sessionCount, id)
      .run();
    const module = await firstRow(env.DB, "SELECT * FROM modules WHERE id = ?", id);
    return json(module, 200);
  } catch {
    return err(500, "server error");
  }
}

export async function onRequestDelete(context) {
  const { env } = context;
  const id = getId(context);
  if (!id) return err(400, "module id is required");
  try {
    const existing = await firstRow(env.DB, "SELECT id FROM modules WHERE id = ?", id);
    if (!existing) return err(404, "module not found");
    // Enforce cascade in code as well (D1 has FK enforcement off by default).
    await env.DB.prepare("DELETE FROM lessons WHERE module_id = ?").bind(id).run();
    await env.DB.prepare("DELETE FROM modules WHERE id = ?").bind(id).run();
    return new Response(null, { status: 204 });
  } catch {
    return err(500, "server error");
  }
}
