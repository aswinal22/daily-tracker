import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validate, scratchpadSchema } from "@/lib/validations";
import type { ScratchpadEntry } from "@/types";

/** GET /api/scratchpad — list all scratchpad entries for the authenticated user. */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("scratchpad")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .returns<ScratchpadEntry[]>();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/** POST /api/scratchpad — add a new scratchpad entry. */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const result = validate(scratchpadSchema, body);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("scratchpad")
    .insert({ user_id: user.id, entry: result.data.entry })
    .select()
    .single<ScratchpadEntry>();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
