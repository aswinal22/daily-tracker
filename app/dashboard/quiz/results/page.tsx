import { createClient } from "@/lib/supabase/server";
import { QuizResultsClient } from "./_components/QuizResultsClient";
import type { QuizResult } from "@/types";

export default async function QuizResultsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: results } = await supabase
    .from("quiz_results")
    .select("*")
    .eq("user_id", user.id)
    .order("taken_at", { ascending: false })
    .returns<QuizResult[]>();

  return <QuizResultsClient initialResults={results ?? []} />;
}
