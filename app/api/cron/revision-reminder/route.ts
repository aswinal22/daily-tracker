import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendRevisionReminderEmail } from "@/lib/email";
import { weekStartUTC } from "@/lib/utils";
import type { Task, Profile, RevisionStreak } from "@/types";

/**
 * GET /api/cron/revision-reminder — Saturday revision reminder email.
 *
 * Runs via Vercel Cron (vercel.json: "0 9 * * 6" = Saturday 9 AM UTC).
 * Fetches all users with completed Upskillment tasks this week and sends
 * a revision reminder email.
 *
 * Protected by CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const weekStart = weekStartUTC().toISOString().slice(0, 10);

  // 1. Get all users who have notifications enabled
  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("id, display_name, notifications")
    .eq("notifications", true)
    .returns<Profile[]>();

  if (profilesError) {
    return NextResponse.json(
      { error: profilesError.message },
      { status: 500 },
    );
  }

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ sent: 0, users: 0 });
  }

  // 2. For each user, check if they have completed Upskillment tasks this week
  let sentCount = 0;
  const failures: string[] = [];

  for (const profile of profiles) {
    try {
      const { data: tasks } = await admin
        .from("tasks")
        .select("*")
        .eq("user_id", profile.id)
        .eq("category", "Upskillment")
        .eq("status", "completed")
        .gte("completed_at", weekStart)
        .returns<Task[]>();

      if (!tasks || tasks.length === 0) continue;

      // Get the user's email from auth
      const { data: authUser } = await admin.auth.admin.getUserById(profile.id);
      const email = authUser?.user?.email;
      if (!email) continue;

      // Get streak
      const { data: streak } = await admin
        .from("revision_streaks")
        .select("*")
        .eq("user_id", profile.id)
        .single<RevisionStreak>();

      const userName = profile.display_name || email.split("@")[0];

      const result = await sendRevisionReminderEmail({
        to: email,
        userName,
        tasks,
        streakCount: streak?.current_streak || 0,
      });

      if (result.sent) sentCount++;
    } catch (err) {
      failures.push(
        `${profile.id}: ${err instanceof Error ? err.message : "unknown"}`,
      );
    }
  }

  return NextResponse.json({
    sent: sentCount,
    candidates: profiles.length,
    failures,
  });
}
