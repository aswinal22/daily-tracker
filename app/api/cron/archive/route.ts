import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { autoArchive } from "@/lib/archive";

/**
 * GET /api/cron/archive — daily auto-archive cron job.
 *
 * Runs via Vercel Cron (see vercel.json: "0 0 * * *" = daily at midnight UTC).
 * Iterates all users and archives their completed tasks from previous days.
 *
 * Protected by CRON_SECRET: Vercel sends it as `Authorization: Bearer <secret>`.
 * This check prevents public access.
 */
export async function GET(request: NextRequest) {
  // ─── Auth: verify CRON_SECRET ───
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Fetch all user IDs
  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("id");

  if (profilesError) {
    return NextResponse.json(
      { error: `Failed to fetch users: ${profilesError.message}` },
      { status: 500 },
    );
  }

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ archived: 0, users: 0 });
  }

  // Archive for each user
  const results = await Promise.allSettled(
    profiles.map((p: { id: string }) => autoArchive(admin, p.id)),
  );

  const totalArchived = results.reduce(
    (sum, r) => (r.status === "fulfilled" ? sum + r.value : sum),
    0,
  );
  const failures = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({
    archived: totalArchived,
    users: profiles.length,
    failures,
  });
}
