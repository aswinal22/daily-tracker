import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validate, updateTaskSchema } from "@/lib/validations";
import { deleteVoiceNote } from "@/lib/supabase/storage";
import type { Task } from "@/types";

/** PATCH /api/tasks/:id — update a task (e.g. mark complete, edit fields). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const result = validate(updateTaskSchema, body);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // If marking complete, set completed_at
  const update: Record<string, unknown> = { ...result.data };
  if (result.data.status === "completed") {
    update.completed_at = new Date().toISOString();
  } else if (result.data.status === "pending") {
    update.completed_at = null;
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(update)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select()
    .single<Task>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/** DELETE /api/tasks/:id — permanently remove a task + its voice note. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch first to check for voice note (for cleanup)
  const { data: task } = await supabase
    .from("tasks")
    .select("voice_note_url")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single<Task>();

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Clean up voice note from storage (best-effort)
  if (task?.voice_note_url) {
    await deleteVoiceNote(user.id, params.id).catch(() => {});
  }

  return NextResponse.json({ success: true });
}
