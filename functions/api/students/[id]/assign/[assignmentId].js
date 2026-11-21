// DELETE /api/students/:id/assign/:assignmentId -> 204.
// 404 if the assignment does not exist for that student.
import { err, firstRow } from "../../../_lib.js";

export async function onRequestDelete(context) {
  const { env } = context;
  const studentId = context.params ? context.params.id : null;
  const assignmentId = context.params ? context.params.assignmentId : null;
  if (!studentId || !assignmentId) return err(400, "student id and assignment id are required");
  try {
    const existing = await firstRow(
      env.DB,
      "SELECT id FROM student_curricula WHERE id = ? AND student_id = ?",
      assignmentId,
      studentId
    );
    if (!existing) return err(404, "assignment not found");
    await env.DB.prepare("DELETE FROM student_curricula WHERE id = ?")
      .bind(assignmentId)
      .run();
    return new Response(null, { status: 204 });
  } catch {
    return err(500, "server error");
  }
}
