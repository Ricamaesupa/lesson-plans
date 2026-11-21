// POST /api/curricula/:id/unpublish -> 200 curriculum with status 'draft'.
// Sends a published curriculum back to draft (flowchart: Ready to Use? No ->
// Edit Curriculum -> Save). Existing assignments are left in place; only NEW
// assignments are gated on 'published'. Idempotent. 404 if missing.
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
      "UPDATE curricula SET status = 'draft', updated_at = ? WHERE id = ?"
    )
      .bind(nowIso(), id)
      .run();
    const curriculum = await firstRow(env.DB, "SELECT * FROM curricula WHERE id = ?", id);
    return json(curriculum, 200);
  } catch {
    return err(500, "server error");
  }
}
