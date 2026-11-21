// One end-session report (flowchart: Record End-Session Report).
// PUT /api/reports/:id {achievements?, challenges?, teacher_remarks?,
// homework_next_steps?} -> 200; 404 if missing.
import {
  json,
  err,
  parseJsonBody,
  optString,
  nowIso,
  firstRow,
} from "../_lib.js";

const TEXT_FIELDS = ["achievements", "challenges", "teacher_remarks", "homework_next_steps"];

function getId(context) {
  return context.params ? context.params.id : null;
}

export async function onRequestPut(context) {
  const { request, env } = context;
  const id = getId(context);
  if (!id) return err(400, "report id is required");
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
    const existing = await firstRow(env.DB, "SELECT * FROM end_session_reports WHERE id = ?", id);
    if (!existing) return err(404, "report not found");
    const updated = {
      achievements: body.achievements !== undefined ? optString(body.achievements) : existing.achievements,
      challenges: body.challenges !== undefined ? optString(body.challenges) : existing.challenges,
      teacher_remarks: body.teacher_remarks !== undefined ? optString(body.teacher_remarks) : existing.teacher_remarks,
      homework_next_steps: body.homework_next_steps !== undefined ? optString(body.homework_next_steps) : existing.homework_next_steps,
    };
    const now = nowIso();
    await env.DB.prepare(
      "UPDATE end_session_reports SET achievements = ?, challenges = ?, teacher_remarks = ?, homework_next_steps = ?, updated_at = ? WHERE id = ?"
    )
      .bind(
        updated.achievements,
        updated.challenges,
        updated.teacher_remarks,
        updated.homework_next_steps,
        now,
        id
      )
      .run();
    const report = await firstRow(env.DB, "SELECT * FROM end_session_reports WHERE id = ?", id);
    return json(report, 200);
  } catch {
    return err(500, "server error");
  }
}
