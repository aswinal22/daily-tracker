"use client";

import { useState, useCallback } from "react";
import type { ProfilePublic, Theme } from "@/types";
import { useToast } from "@/components/Toast";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

interface SettingsClientProps {
  initialProfile: Omit<ProfilePublic, "id">;
  email: string | null;
}

// Common provider presets for the dropdown
const PROVIDER_PRESETS: { label: string; baseURL: string; model: string }[] = [
  { label: "OpenAI", baseURL: "https://api.openai.com/v1", model: "gpt-4o" },
  { label: "OpenAI (mini)", baseURL: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  { label: "Google Gemini", baseURL: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-2.0-flash" },
  { label: "Anthropic Claude", baseURL: "https://api.anthropic.com/v1", model: "claude-3.5-sonnet" },
  { label: "Groq", baseURL: "https://api.groq.com/openai/v1", model: "llama-3.1-70b-versatile" },
  { label: "OpenRouter", baseURL: "https://openrouter.ai/api/v1", model: "openai/gpt-4o" },
  { label: "Ollama (local)", baseURL: "http://localhost:11434/v1", model: "llama3" },
  { label: "Custom...", baseURL: "", model: "" },
];

export function SettingsClient({ initialProfile, email }: SettingsClientProps) {
  const [displayName, setDisplayName] = useState(initialProfile.display_name ?? "");
  const [aiBaseURL, setAiBaseURL] = useState(initialProfile.ai_base_url ?? "");
  const [aiModel, setAiModel] = useState(initialProfile.ai_model ?? "");
  const [apiKey, setApiKey] = useState("");
  const [hasApiKey, setHasApiKey] = useState(initialProfile.has_ai_key);
  const [notifications, setNotifications] = useState(initialProfile.notifications);
  const [saving, setSaving] = useState<"profile" | "ai" | "prefs" | null>(null);
  const { showToast } = useToast();
  const { theme, setTheme } = useTheme();

  const saveProfile = useCallback(async () => {
    setSaving("profile");
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: displayName || null }),
    });
    setSaving(null);
    if (res.ok) {
      showToast("Profile saved", "success");
      window.location.reload();
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || "Failed to save", "error");
    }
  }, [displayName, showToast]);

  const saveAI = useCallback(async () => {
    setSaving("ai");
    const payload: Record<string, unknown> = {
      ai_base_url: aiBaseURL,
      ai_model: aiModel,
    };
    // Only send the key if the user typed a new one
    if (apiKey) {
      payload.ai_api_key = apiKey;
    }
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(null);
    if (res.ok) {
      showToast("AI provider saved", "success");
      setApiKey("");
      setHasApiKey(Boolean(apiKey) || hasApiKey);
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || "Failed to save", "error");
    }
  }, [aiBaseURL, aiModel, apiKey, hasApiKey, showToast]);

  const savePrefs = useCallback(async () => {
    setSaving("prefs");
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notifications }),
    });
    setSaving(null);
    if (res.ok) {
      showToast("Preferences saved", "success");
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || "Failed to save", "error");
    }
  }, [notifications, showToast]);

  const handlePreset = (preset: (typeof PROVIDER_PRESETS)[number]) => {
    if (preset.baseURL) {
      setAiBaseURL(preset.baseURL);
      setAiModel(preset.model);
    }
  };

  const clearApiKey = async () => {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ai_api_key: "" }),
    });
    if (res.ok) {
      setHasApiKey(false);
      showToast("API key removed", "info");
    }
  };

  const handleThemeChange = (t: Theme) => {
    setTheme(t);
  };

  return (
    <div className="space-y-6">
      {/* Profile section */}
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold">Profile</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Your name appears in the dashboard greeting and emails.
        </p>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="w-full max-w-md rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <p className="text-sm text-muted-foreground">{email || "—"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Email is managed by your login provider and cannot be changed here.
            </p>
          </div>
          <button
            onClick={saveProfile}
            disabled={saving === "profile"}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {saving === "profile" ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </section>

      {/* Theme section */}
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold">Appearance</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Choose your preferred theme.
        </p>
        <div className="flex gap-3">
          {(["light", "dark"] as Theme[]).map((t) => (
            <button
              key={t}
              onClick={() => handleThemeChange(t)}
              className={cn(
                "rounded-xl border px-6 py-3 text-sm font-medium capitalize transition",
                theme === t
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border hover:bg-muted",
              )}
            >
              {t === "light" ? "☀️ Light" : "🌙 Dark"}
            </button>
          ))}
        </div>
      </section>

      {/* AI Provider section */}
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold">🤖 AI Provider</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Configure any OpenAI-compatible provider for AI motivation and quizzes.
          Your API key is encrypted before storage.
        </p>

        {/* Provider presets */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium">Quick presets</label>
          <div className="flex flex-wrap gap-2">
            {PROVIDER_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePreset(preset)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                  aiBaseURL === preset.baseURL && aiModel === preset.model
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Base URL</label>
            <input
              type="url"
              value={aiBaseURL}
              onChange={(e) => setAiBaseURL(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full max-w-md rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Model</label>
            <input
              type="text"
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              placeholder="gpt-4o"
              className="w-full max-w-md rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">API Key</label>
            {hasApiKey ? (
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  ✓ Key saved
                </span>
                <button
                  onClick={() => setApiKey("xxxx")}
                  className="text-xs text-accent hover:underline"
                >
                  Replace key
                </button>
                <button
                  onClick={clearApiKey}
                  className="text-xs text-red-600 hover:underline dark:text-red-400"
                >
                  Remove
                </button>
              </div>
            ) : (
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full max-w-md rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            )}
            {apiKey === "xxxx" && (
              <input
                type="password"
                value=""
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter new key..."
                autoFocus
                className="mt-2 w-full max-w-md rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            )}
          </div>
          <button
            onClick={saveAI}
            disabled={saving === "ai"}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {saving === "ai" ? "Saving..." : "Save AI Config"}
          </button>
        </div>
      </section>

      {/* Notifications section */}
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold">Notifications</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Control when the app emails you.
        </p>
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={notifications}
              onChange={(e) => setNotifications(e.target.checked)}
              className="h-5 w-5 rounded border-border accent-accent"
            />
            <span className="text-sm">
              Send motivation emails when I click &quot;Motivate Me&quot;
            </span>
          </label>
          <button
            onClick={savePrefs}
            disabled={saving === "prefs"}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {saving === "prefs" ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </section>
    </div>
  );
}
