import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ArchivedTask } from "@/types";

/** GET /api/archive — list all archived tasks for the authenticated user. */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("archived_tasks")
    .select("*")
    .eq("user_id", user.id)
    .order("archived_at", { ascending: false })
    .returns<ArchivedTask[]>();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
