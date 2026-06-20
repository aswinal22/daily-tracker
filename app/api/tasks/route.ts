import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validate, createTaskSchema } from "@/lib/validations";
import { autoArchive } from "@/lib/archive";
import type { Task } from "@/types";

/** GET /api/tasks — list all active tasks for the authenticated user. */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Best-effort: archive completed tasks from previous days on access
  await autoArchive(supabase, user.id).catch(() => {});

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .order("end_date", { ascending: true })
    .order("added_at", { ascending: false })
    .returns<Task[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/** POST /api/tasks — create a new task. */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const result = validate(createTaskSchema, body);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: user.id,
      ...result.data,
    })
    .select()
    .single<Task>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
