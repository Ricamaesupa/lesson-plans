// POST /api/curricula/:id/modules {title (required), session_count?} -> 201 (position = max+1).
import {
  json,
  err,
  parseJsonBody,
  reqString,
  optInt,
  isBadOptInt,
  nowIso,
  firstRow,
} from "../../_lib.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  const curriculumId = context.params ? context.params.id : null;
  if (!curriculumId) return err(400, "curriculum id is required");
  const body = await parseJsonBody(request);
  if (!body || typeof body !== "object") {
    return err(400, "invalid JSON body");
  }
  const title = reqString(body.title);
  if (!title) return err(400, "title is required");
  if (isBadOptInt(body.session_count)) {
    return err(400, "session_count must be a non-negative integer");
  }
  try {
    const curriculum = await firstRow(
      env.DB,
      "SELECT id FROM curricula WHERE id = ?",
      curriculumId
    );
    if (!curriculum) return err(404, "curriculum not found");
    const maxRow = await firstRow(
      env.DB,
      "SELECT MAX(position) AS max_pos FROM modules WHERE curriculum_id = ?",
      curriculumId
    );
    const position = (maxRow && maxRow.max_pos !== null ? maxRow.max_pos : 0) + 1;
    const id = crypto.randomUUID();
    const now = nowIso();
    await env.DB.prepare(
      "INSERT INTO modules (id, curriculum_id, title, session_count, position, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
      .bind(id, curriculumId, title, optInt(body.session_count), position, now)
      .run();
    const module = await firstRow(env.DB, "SELECT * FROM modules WHERE id = ?", id);
    return json(module, 201);
  } catch {
    return err(500, "server error");
  }
}
