// POST /api/curricula/:id/publish -> 200 curriculum with status 'published'.
// Flowchart: Save -> Ready to Use? Yes -> Publish to Curriculum Library.
// Idempotent: publishing an already-published curriculum returns 200.
// 404 if the curriculum does not exist.
import { json, err, nowIso, firstRow } from "../../_lib.js";

function getId(context) {
  return context.params ? context.params.id : null;
}

export async function onRequestPost(context) {
  const { env } = context;
  const id = getId(context);
  if (!id) return err(400, "curriculum id is required");
  try {
    const existing = await firstRow(env.DB, "SELECT * FROM curricula WHERE id = ?", id);
    if (!existing) return err(404, "curriculum not found");
    await env.DB.prepare(
      "UPDATE curricula SET status = 'published', updated_at = ? WHERE id = ?"
    )
      .bind(nowIso(), id)
      .run();
    const curriculum = await firstRow(env.DB, "SELECT * FROM curricula WHERE id = ?", id);
    return json(curriculum, 200);
  } catch {
    return err(500, "server error");
  }
}
