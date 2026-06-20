import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  uploadVoiceNote,
  deleteVoiceNote,
} from "@/lib/supabase/storage";
import type { Task } from "@/types";

/**
 * POST /api/tasks/:id/voice — upload a voice note for a task.
 *
 * Accepts multipart/form-data with an `audio` field (Blob from MediaRecorder).
 * Uploads to Supabase Storage at `{user_id}/{task_id}.webm` and stores the
 * resulting public URL on the task.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify the task belongs to the user
  const { data: task } = await supabase
    .from("tasks")
    .select("id, voice_note_url")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single<Task>();

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Parse multipart form data
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json(
      { error: "Expected multipart/form-data" },
      { status: 400 },
    );
  }

  const audioFile = formData.get("audio");
  if (!audioFile || !(audioFile instanceof File)) {
    return NextResponse.json(
      { error: "Missing 'audio' file field" },
      { status: 400 },
    );
  }

  // Max 5 MB audio file
  if (audioFile.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Audio file too large (max 5 MB)" },
      { status: 413 },
    );
  }

  // If replacing, delete the old file first (no orphans)
  if (task.voice_note_url) {
    await deleteVoiceNote(user.id, params.id).catch(() => {});
  }

  const contentType = audioFile.type || "audio/webm";
  const arrayBuffer = await audioFile.arrayBuffer();

  let url: string;
  try {
    url = await uploadVoiceNote(user.id, params.id, arrayBuffer, contentType);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 },
    );
  }

  // Save URL on the task
  const { data: updated, error } = await supabase
    .from("tasks")
    .update({ voice_note_url: url })
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select()
    .single<Task>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(updated);
}

/**
 * DELETE /api/tasks/:id/voice — remove a voice note from a task and storage.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: task } = await supabase
    .from("tasks")
    .select("id, voice_note_url")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single<Task>();

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Delete from storage (best-effort)
  if (task.voice_note_url) {
    await deleteVoiceNote(user.id, params.id).catch(() => {});
  }

  // Clear URL on the task
  const { error } = await supabase
    .from("tasks")
    .update({ voice_note_url: null })
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
