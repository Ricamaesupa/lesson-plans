// GET /api/students/:id/achievement-reports -> generated achievement
// reports for a student, newest first (optional ?curriculum_id=...
// filter). 404 if the student is missing.
import { json, err, allRows, firstRow } from "../../_lib.js";

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
          "SELECT * FROM achievement_reports WHERE student_id = ? AND curriculum_id = ? ORDER BY created_at DESC",
          id,
          curriculumId
        )
      : await allRows(
          env.DB,
          "SELECT * FROM achievement_reports WHERE student_id = ? ORDER BY created_at DESC",
          id
        );
    return json(rows);
  } catch {
    return err(500, "server error");
  }
}
