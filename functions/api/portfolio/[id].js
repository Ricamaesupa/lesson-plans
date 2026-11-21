// One digital portfolio entry (portfolio flowchart: Create Digital
// Portfolio -> Attach Project Screenshots & Evidence).
// PUT /api/portfolio/:id {title?, description?, curriculum_id?,
// evidence_link?, evidence_note?} -> 200; 404 if missing.
// DELETE /api/portfolio/:id -> 204.
import {
  json,
  err,
  parseJsonBody,
  reqString,
  optString,
  firstRow,
} from "../_lib.js";

const TEXT_FIELDS = ["description", "curriculum_id", "evidence_link", "evidence_note"];

function getId(context) {
  return context.params ? context.params.id : null;
}

export async function onRequestPut(context) {
  const { request, env } = context;
  const id = getId(context);
  if (!id) return err(400, "portfolio entry id is required");
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
  for (const key of TEXT_FIELDS) {
    if (body[key] !== undefined && body[key] !== null && typeof body[key] !== "string") {
      return err(400, key + " must be a string");
    }
  }
  try {
    const existing = await firstRow(env.DB, "SELECT * FROM portfolio_entries WHERE id = ?", id);
    if (!existing) return err(404, "portfolio entry not found");
    const curriculumId = body.curriculum_id !== undefined ? optString(body.curriculum_id) : existing.curriculum_id;
    if (curriculumId) {
      const curriculum = await firstRow(env.DB, "SELECT id FROM curricula WHERE id = ?", curriculumId);
      if (!curriculum) return err(404, "curriculum not found");
    }
    const updated = {
      title: body.title !== undefined ? reqString(body.title) || existing.title : existing.title,
      description: body.description !== undefined ? optString(body.description) : existing.description,
      evidence_link: body.evidence_link !== undefined ? optString(body.evidence_link) : existing.evidence_link,
      evidence_note: body.evidence_note !== undefined ? optString(body.evidence_note) : existing.evidence_note,
    };
    await env.DB.prepare(
      "UPDATE portfolio_entries SET title = ?, description = ?, curriculum_id = ?, evidence_link = ?, evidence_note = ? WHERE id = ?"
    )
      .bind(updated.title, updated.description, curriculumId, updated.evidence_link, updated.evidence_note, id)
      .run();
    const entry = await firstRow(env.DB, "SELECT * FROM portfolio_entries WHERE id = ?", id);
    return json(entry, 200);
  } catch {
    return err(500, "server error");
  }
}

export async function onRequestDelete(context) {
  const { env } = context;
  const id = getId(context);
  if (!id) return err(400, "portfolio entry id is required");
  try {
    const existing = await firstRow(env.DB, "SELECT id FROM portfolio_entries WHERE id = ?", id);
    if (!existing) return err(404, "portfolio entry not found");
    await env.DB.prepare("DELETE FROM portfolio_entries WHERE id = ?").bind(id).run();
    return new Response(null, { status: 204 });
  } catch {
    return err(500, "server error");
  }
}
