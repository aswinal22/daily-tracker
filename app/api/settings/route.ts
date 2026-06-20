import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";
import { validate, settingsSchema } from "@/lib/validations";
import type { Profile, ProfilePublic } from "@/types";

/**
 * GET /api/settings — fetch the user's profile settings.
 * Returns a safe public projection (no raw AI key — only `has_ai_key`).
 */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Project to safe public shape
  const safe: ProfilePublic = {
    id: profile.id,
    display_name: profile.display_name,
    ai_base_url: profile.ai_base_url,
    ai_model: profile.ai_model,
    has_ai_key: Boolean(profile.ai_api_key),
    theme: profile.theme,
    notifications: profile.notifications,
  };

  return NextResponse.json(safe);
}

/**
 * PUT /api/settings — update the user's profile settings.
 *
 * If `ai_api_key` is provided and non-empty, it is encrypted before storage.
 * If `ai_api_key` is an empty string, the existing key is cleared.
 * If `ai_api_key` is omitted (undefined), the existing key is left unchanged.
 */
export async function PUT(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const result = validate(settingsSchema, body);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Build the update payload
  const update: Record<string, unknown> = {};

  if (result.data.display_name !== undefined) {
    update.display_name = result.data.display_name;
  }
  if (result.data.theme !== undefined) {
    update.theme = result.data.theme;
  }
  if (result.data.notifications !== undefined) {
    update.notifications = result.data.notifications;
  }
  if (result.data.ai_base_url !== undefined) {
    update.ai_base_url = result.data.ai_base_url;
  }
  if (result.data.ai_model !== undefined) {
    update.ai_model = result.data.ai_model;
  }

  // Handle API key specially: encrypt if provided, clear if empty, skip if undefined
  if (result.data.ai_api_key !== undefined) {
    if (result.data.ai_api_key && result.data.ai_api_key.trim()) {
      update.ai_api_key = encrypt(result.data.ai_api_key.trim());
    } else {
      update.ai_api_key = null;
    }
  }

  const { data: updated, error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id)
    .select("*")
    .single<Profile>();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return safe projection
  const safe: ProfilePublic & { _key_fingerprint?: string | null } = {
    id: updated.id,
    display_name: updated.display_name,
    ai_base_url: updated.ai_base_url,
    ai_model: updated.ai_model,
    has_ai_key: Boolean(updated.ai_api_key),
    theme: updated.theme,
    notifications: updated.notifications,
  };

  return NextResponse.json(safe);
}
