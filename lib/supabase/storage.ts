/**
 * Supabase Storage helpers for voice notes.
 *
 * Bucket: `voice-notes`
 * Object naming convention: `{user_id}/{task_id}.webm`
 *
 * Uses the admin client for server-side writes (uploads from API routes)
 * so we can write to the private bucket regardless of RLS.
 */

const VOICE_NOTES_BUCKET = "voice-notes";

export function voiceNotePath(userId: string, taskId: string, ext = "webm") {
  return `${userId}/${taskId}.${ext}`;
}

export async function uploadVoiceNote(
  userId: string,
  taskId: string,
  file: Blob | ArrayBuffer,
  contentType = "audio/webm",
): Promise<string> {
  const admin = (await import("./admin")).getAdminClient();
  const path = voiceNotePath(userId, taskId);
  const { error } = await admin.storage
    .from(VOICE_NOTES_BUCKET)
    .upload(path, file, {
      contentType,
      upsert: true, // re-record replaces the existing file
    });
  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = admin.storage
    .from(VOICE_NOTES_BUCKET)
    .getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteVoiceNote(
  userId: string,
  taskId: string,
  ext = "webm",
) {
  const admin = (await import("./admin")).getAdminClient();
  const path = voiceNotePath(userId, taskId, ext);
  const { error } = await admin.storage.from(VOICE_NOTES_BUCKET).remove([path]);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}

export { VOICE_NOTES_BUCKET };
