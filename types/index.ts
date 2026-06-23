// ─── Shared domain types ─────────────────────────────────────
// Mirrors the Supabase schema (see supabase/migrations/0001_init.sql).
// The backend API and frontend validate against these types so both sides
// stay in sync (per spec §5 quiz schema validation rules).

export type Category = "Upskillment" | "Personal" | "Health";
export type Priority = "High" | "Medium" | "Low";
export type TaskStatus = "pending" | "completed";
export type Theme = "light" | "dark";

export const CATEGORIES: Category[] = ["Upskillment", "Personal", "Health"];
export const PRIORITIES: Priority[] = ["High", "Medium", "Low"];

// ─── profiles ────────────────────────────────────────────────
export interface Profile {
  id: string; // references auth.users.id
  display_name: string | null;
  // ai_api_key is stored encrypted at rest; never select it into client types.
  ai_api_key: string | null; // ciphertext (base64) — server-only
  ai_base_url: string | null;
  ai_model: string | null;
  theme: Theme;
  notifications: boolean;
  created_at: string;
  updated_at: string;
}

/** Profile row safe to expose to the client (no encrypted key). */
export interface ProfilePublic {
  id: string;
  display_name: string | null;
  ai_base_url: string | null;
  ai_model: string | null;
  has_ai_key: boolean; // boolean only — never the key itself
  theme: Theme;
  notifications: boolean;
}

// ─── tasks ───────────────────────────────────────────────────
export interface Task {
  id: string;
  user_id: string;
  task_name: string;
  description: string | null; // what the task is about
  notes: string | null; // what I learned (added after completion)
  category: Category;
  priority: Priority;
  status: TaskStatus;
  end_date: string; // DATE (ISO yyyy-mm-dd)
  added_at: string;
  completed_at: string | null;
  voice_note_url: string | null;
  revised: boolean;
  revision_week: string | null; // DATE
}

export type TaskInsert = Pick<
  Task,
  "task_name" | "category" | "priority" | "end_date"
> & {
  description?: string | null;
};

export type TaskUpdate = Partial<
  Pick<Task, "task_name" | "description" | "notes" | "category" | "priority" | "end_date" | "status" | "voice_note_url" | "revised" | "revision_week">
>;

// ─── scratchpad ──────────────────────────────────────────────
export interface ScratchpadEntry {
  id: string;
  user_id: string;
  entry: string;
  created_at: string;
}

// ─── archived_tasks ──────────────────────────────────────────
export interface ArchivedTask {
  id: string; // original task id
  user_id: string;
  task_name: string;
  description: string | null;
  notes: string | null;
  category: Category;
  priority: Priority;
  end_date: string;
  added_at: string;
  completed_at: string | null;
  archived_at: string;
  voice_note_url: string | null;
}

// ─── quiz_results + questions_json strict schema (spec §5) ───
export type QuestionType = "mcq" | "short_answer";

export interface QuizQuestion {
  id: number;
  type: QuestionType;
  question: string;
  options: string[] | null; // 4 strings for mcq, null for short_answer
  correct_answer: string;
  user_answer: string | null;
  is_correct: boolean | null;
  explanation: string;
}

export interface QuizMetadata {
  generated_at: string; // ISO 8601
  ai_model: string;
  topics: string[];
  total_questions: number;
  mcq_count: number;
  short_answer_count: number;
}

export interface QuizData {
  questions: QuizQuestion[];
  metadata: QuizMetadata;
}

export interface QuizResult {
  id: string;
  user_id: string;
  week_of: string; // DATE (Monday of revision week)
  total_questions: number;
  correct_answers: number;
  score_percent: number;
  questions_json: QuizData;
  taken_at: string;
}

// ─── revision_streaks ────────────────────────────────────────
export interface RevisionStreak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_revised_at: string | null;
}

// ─── API response envelope ───────────────────────────────────
export interface ApiError {
  error: string;
}

export type ApiResponse<T> = T | ApiError;
