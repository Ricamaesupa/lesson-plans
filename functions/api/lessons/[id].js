// PUT /api/lessons/:id {title?, objective?, activities_resources?, assessment_criteria?, expected_outputs?} -> 200; 404 if missing.
// DELETE /api/lessons/:id -> 204.
import { json, err, parseJsonBody, reqString, optString, firstRow } from "../_lib.js";

function getId(context) {
  return context.params ? context.params.id : null;
}

export async function onRequestPut(context) {
  const { request, env } = context;
  const id = getId(context);
  if (!id) return err(400, "lesson id is required");
  const body = await parseJsonBody(request);
  if (!body || typeof body !== "object") {
    return err(400, "invalid JSON body");
  }
  for (const key of ["title", "objective", "activities_resources", "assessment_criteria", "expected_outputs"]) {
    if (body[key] !== undefined && body[key] !== null && typeof body[key] !== "string") {
      return err(400, key + " must be a string");
    }
  }
  if (body.title !== undefined && body.title !== null && !reqString(body.title)) {
    return err(400, "title must not be empty");
  }
  try {
    const existing = await firstRow(env.DB, "SELECT * FROM lessons WHERE id = ?", id);
    if (!existing) return err(404, "lesson not found");
    const title = body.title !== undefined ? reqString(body.title) || existing.title : existing.title;
    const objective = body.objective !== undefined ? optString(body.objective) : existing.objective;
    const activities_resources = body.activities_resources !== undefined ? optString(body.activities_resources) : existing.activities_resources;
    const assessment_criteria = body.assessment_criteria !== undefined ? optString(body.assessment_criteria) : existing.assessment_criteria;
    const expected_outputs = body.expected_outputs !== undefined ? optString(body.expected_outputs) : existing.expected_outputs;
    await env.DB.prepare("UPDATE lessons SET title = ?, objective = ?, activities_resources = ?, assessment_criteria = ?, expected_outputs = ? WHERE id = ?")
      .bind(title, objective, activities_resources, assessment_criteria, expected_outputs, id)
      .run();
    const lesson = await firstRow(env.DB, "SELECT * FROM lessons WHERE id = ?", id);
    return json(lesson, 200);
  } catch {
    return err(500, "server error");
  }
}

export async function onRequestDelete(context) {
  const { env } = context;
  const id = getId(context);
  if (!id) return err(400, "lesson id is required");
  try {
    const existing = await firstRow(env.DB, "SELECT id FROM lessons WHERE id = ?", id);
    if (!existing) return err(404, "lesson not found");
    await env.DB.prepare("DELETE FROM lessons WHERE id = ?").bind(id).run();
    return new Response(null, { status: 204 });
  } catch {
    return err(500, "server error");
  }
}
