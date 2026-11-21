// Lesson plans for one student (flowchart: Select Next Lesson ->
// Customise Individual Lesson Plan -> Prepare Teaching Materials).
// GET /api/students/:id/lesson-plans -> plans newest first (optional
// ?curriculum_id=... filter).
// POST /api/students/:id/lesson-plans {curriculum_id (required), module_id?,
// lesson_id?, title?, custom_objectives?, custom_activities?,
// assessment_plan?, materials?, session_number?} -> 201.
// The student must be assigned to the curriculum (409 otherwise).
// Title defaults to the library lesson title when a lesson is chosen and
// no title is given. All content fields are teacher-entered and start empty.
import {
  json,
  err,
  parseJsonBody,
  reqString,
  optString,
  optInt,
  isBadOptInt,
  nowIso,
  allRows,
  firstRow,
} from "../../_lib.js";

const TEXT_FIELDS = ["custom_objectives", "custom_activities", "assessment_plan", "materials"];

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
          "SELECT lp.*, c.title AS curriculum_title FROM lesson_plans lp LEFT JOIN curricula c ON c.id = lp.curriculum_id WHERE lp.student_id = ? AND lp.curriculum_id = ? ORDER BY lp.created_at DESC",
          id,
          curriculumId
        )
      : await allRows(
          env.DB,
          "SELECT lp.*, c.title AS curriculum_title FROM lesson_plans lp LEFT JOIN curricula c ON c.id = lp.curriculum_id WHERE lp.student_id = ? ORDER BY lp.created_at DESC",
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
  const curriculumId = reqString(body.curriculum_id);
  if (!curriculumId) return err(400, "curriculum_id is required");
  for (const key of ["module_id", "lesson_id", ...TEXT_FIELDS]) {
    if (body[key] !== undefined && body[key] !== null && typeof body[key] !== "string") {
      return err(400, key + " must be a string");
    }
  }
  if (body.title !== undefined && body.title !== null && typeof body.title !== "string") {
    return err(400, "title must be a string");
  }
  if (isBadOptInt(body.session_number)) {
    return err(400, "session_number must be a non-negative integer");
  }
  try {
    const student = await firstRow(env.DB, "SELECT id FROM students WHERE id = ?", studentId);
    if (!student) return err(404, "student not found");
    const curriculum = await firstRow(env.DB, "SELECT id FROM curricula WHERE id = ?", curriculumId);
    if (!curriculum) return err(404, "curriculum not found");
    const assignment = await firstRow(
      env.DB,
      "SELECT id FROM student_curricula WHERE student_id = ? AND curriculum_id = ?",
      studentId,
      curriculumId
    );
    if (!assignment) return err(409, "student is not assigned to this curriculum");
    let moduleId = optString(body.module_id);
    let lessonId = optString(body.lesson_id);
    let title = optString(body.title);
    // When a library lesson is chosen, it must belong to this curriculum
    // (through its module); its title becomes the plan title by default.
    if (lessonId) {
      const lesson = await firstRow(
        env.DB,
        "SELECT l.id, l.title, l.module_id, m.curriculum_id FROM lessons l JOIN modules m ON m.id = l.module_id WHERE l.id = ?",
        lessonId
      );
      if (!lesson) return err(404, "lesson not found");
      if (lesson.curriculum_id !== curriculumId) {
        return err(400, "lesson does not belong to this curriculum");
      }
      moduleId = lesson.module_id;
      if (!title) title = lesson.title;
    } else if (moduleId) {
      const mod = await firstRow(
        env.DB,
        "SELECT id, curriculum_id FROM modules WHERE id = ?",
        moduleId
      );
      if (!mod) return err(404, "module not found");
      if (mod.curriculum_id !== curriculumId) {
        return err(400, "module does not belong to this curriculum");
      }
    }
    if (!title) return err(400, "title is required (or choose a library lesson)");
    const id = crypto.randomUUID();
    const now = nowIso();
    await env.DB.prepare(
      "INSERT INTO lesson_plans (id, student_id, curriculum_id, module_id, lesson_id, title, custom_objectives, custom_activities, assessment_plan, materials, session_number, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)"
    )
      .bind(
        id,
        studentId,
        curriculumId,
        moduleId,
        lessonId,
        title,
        optString(body.custom_objectives),
        optString(body.custom_activities),
        optString(body.assessment_plan),
        optString(body.materials),
        optInt(body.session_number),
        now,
        now
      )
      .run();
    const plan = await firstRow(env.DB, "SELECT * FROM lesson_plans WHERE id = ?", id);
    return json(plan, 201);
  } catch {
    return err(500, "server error");
  }
}
