// GET /api/students/:id/progress -> per-curriculum progress for a student.
// With ?curriculum_id=... returns that assignment's progress only.
// Progress: completed (conducted) sessions, planned sessions, cycle
// length, whether the cycle is complete, sessions remaining, next session
// number, and objectives-achieved outcome counts (yes / partially / no).
// 404 if the student (or the assignment) is missing.
import { json, err, firstRow } from "../../_lib.js";
import { getAssignmentProgress, getStudentProgress } from "../../_progress.js";

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
    if (curriculumId) {
      const p = await getAssignmentProgress(env.DB, id, curriculumId);
      if (!p) return err(404, "student is not assigned to this curriculum");
      return json(p);
    }
    const progress = await getStudentProgress(env.DB, id);
    return json({ student_id: id, progress });
  } catch {
    return err(500, "server error");
  }
}
