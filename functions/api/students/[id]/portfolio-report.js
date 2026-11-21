// GET /api/students/:id/portfolio-report?curriculum_id=... -> the
// collected records behind the digital portfolio and achievement report
// (portfolio flowchart, mermaid-diagram__3.png): session reports,
// assessment scores, completed projects, skills & competencies, initial
// vs final performance, the final assessment, the latest generated
// achievement report, and the portfolio entries. 404 if the student is
// missing or not assigned to the curriculum.
import { json, err, firstRow } from "../../_lib.js";
import { collectStudentRecords } from "../../_collect.js";

function getId(context) {
  return context.params ? context.params.id : null;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const id = getId(context);
  if (!id) return err(400, "student id is required");
  const url = new URL(request.url);
  const curriculumId = url.searchParams.get("curriculum_id");
  if (!curriculumId) return err(400, "curriculum_id is required");
  try {
    const student = await firstRow(env.DB, "SELECT id FROM students WHERE id = ?", id);
    if (!student) return err(404, "student not found");
    const collected = await collectStudentRecords(env.DB, id, curriculumId);
    if (!collected) return err(404, "student is not assigned to this curriculum");
    return json(collected);
  } catch {
    return err(500, "server error");
  }
}
