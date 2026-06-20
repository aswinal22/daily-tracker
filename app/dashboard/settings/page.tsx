import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./_components/SettingsClient";
import type { Profile } from "@/types";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, ai_base_url, ai_model, ai_api_key, theme, notifications")
    .eq("id", user.id)
    .single<Profile>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">⚙️ Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile, AI provider, and notification preferences.
        </p>
      </div>
      <SettingsClient
        initialProfile={{
          display_name: profile?.display_name ?? null,
          ai_base_url: profile?.ai_base_url ?? "https://api.openai.com/v1",
          ai_model: profile?.ai_model ?? "gpt-4o",
          has_ai_key: Boolean(profile?.ai_api_key),
          theme: profile?.theme ?? "light",
          notifications: profile?.notifications ?? true,
        }}
        email={user.email ?? null}
      />
    </div>
  );
}
