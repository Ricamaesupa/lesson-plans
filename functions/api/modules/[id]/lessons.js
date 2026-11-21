// POST /api/modules/:id/lessons {title (required), objective?, activities_resources?, assessment_criteria?, expected_outputs?} -> 201 (position = max+1).
import { json, err, parseJsonBody, reqString, optString, nowIso, firstRow } from "../../_lib.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  const moduleId = context.params ? context.params.id : null;
  if (!moduleId) return err(400, "module id is required");
  const body = await parseJsonBody(request);
  if (!body || typeof body !== "object") {
    return err(400, "invalid JSON body");
  }
  const title = reqString(body.title);
  if (!title) return err(400, "title is required");
  for (const key of ["objective", "activities_resources", "assessment_criteria", "expected_outputs"]) {
    if (body[key] !== undefined && body[key] !== null && typeof body[key] !== "string") {
      return err(400, key + " must be a string");
    }
  }
  try {
    const module = await firstRow(env.DB, "SELECT id FROM modules WHERE id = ?", moduleId);
    if (!module) return err(404, "module not found");
    const maxRow = await firstRow(
      env.DB,
      "SELECT MAX(position) AS max_pos FROM lessons WHERE module_id = ?",
      moduleId
    );
    const position = (maxRow && maxRow.max_pos !== null ? maxRow.max_pos : 0) + 1;
    const id = crypto.randomUUID();
    const now = nowIso();
    await env.DB.prepare(
      "INSERT INTO lessons (id, module_id, title, objective, activities_resources, assessment_criteria, expected_outputs, position, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(id, moduleId, title, optString(body.objective), optString(body.activities_resources), optString(body.assessment_criteria), optString(body.expected_outputs), position, now)
      .run();
    const lesson = await firstRow(env.DB, "SELECT * FROM lessons WHERE id = ?", id);
    return json(lesson, 201);
  } catch {
    return err(500, "server error");
  }
}
