// Digital portfolio entries for one student (portfolio flowchart:
// Create Digital Portfolio -> Attach Project Screenshots & Evidence).
// GET /api/students/:id/portfolio -> entries oldest first (optional
// ?curriculum_id=... filter).
// POST /api/students/:id/portfolio {title (required), description?,
// curriculum_id?, source?, source_id?, evidence_link?, evidence_note?}
// -> 201. evidence_link / evidence_note hold a link or a short note about
// a screenshot or piece of evidence — links/notes only, no file upload
// in this phase. All content is teacher-entered.
import {
  json,
  err,
  parseJsonBody,
  reqString,
  optString,
  nowIso,
  allRows,
  firstRow,
} from "../../_lib.js";

const TEXT_FIELDS = ["description", "curriculum_id", "source", "source_id", "evidence_link", "evidence_note"];

function getId(context) {
  return context.params ? context.params.id : null;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const id = getId(context);
  if (!id) return err(400, "student id is required");
  try {
    const student = await firstRow(env.DB, "SELECT id FROM students WHERE id = ?", id);
    if (!student) return err(404, "student not found");
    const url = new URL(request.url);
    const curriculumId = url.searchParams.get("curriculum_id");
    const rows = curriculumId
      ? await allRows(
          env.DB,
          "SELECT * FROM portfolio_entries WHERE student_id = ? AND curriculum_id = ? ORDER BY created_at ASC",
          id,
          curriculumId
        )
      : await allRows(
          env.DB,
          "SELECT * FROM portfolio_entries WHERE student_id = ? ORDER BY created_at ASC",
          id
        );
    return json(rows);
  } catch {
    return err(500, "server error");
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const studentId = getId(context);
  if (!studentId) return err(400, "student id is required");
  const body = await parseJsonBody(request);
  if (!body || typeof body !== "object") {
    return err(400, "invalid JSON body");
  }
  const title = reqString(body.title);
  if (!title) return err(400, "title is required");
  for (const key of TEXT_FIELDS) {
    if (body[key] !== undefined && body[key] !== null && typeof body[key] !== "string") {
      return err(400, key + " must be a string");
    }
  }
  try {
    const student = await firstRow(env.DB, "SELECT id FROM students WHERE id = ?", studentId);
    if (!student) return err(404, "student not found");
    const curriculumId = optString(body.curriculum_id);
    if (curriculumId) {
      const curriculum = await firstRow(env.DB, "SELECT id FROM curricula WHERE id = ?", curriculumId);
      if (!curriculum) return err(404, "curriculum not found");
    }
    const id = crypto.randomUUID();
    const now = nowIso();
    await env.DB.prepare(
      "INSERT INTO portfolio_entries (id, student_id, curriculum_id, title, description, source, source_id, evidence_link, evidence_note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(
        id,
        studentId,
        curriculumId,
        title,
        optString(body.description),
        optString(body.source),
        optString(body.source_id),
        optString(body.evidence_link),
        optString(body.evidence_note),
        now
      )
      .run();
    const entry = await firstRow(env.DB, "SELECT * FROM portfolio_entries WHERE id = ?", id);
    return json(entry, 201);
  } catch {
    return err(500, "server error");
  }
}
