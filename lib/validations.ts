import { z } from "zod";

// ─── Task validation ────────────────────────────────────────
export const categorySchema = z.enum(["Upskillment", "Personal", "Health"]);
export const prioritySchema = z.enum(["High", "Medium", "Low"]);

export const createTaskSchema = z.object({
  task_name: z.string().min(1, "Task name is required").max(500),
  description: z.string().max(5000).nullable().optional(),
  category: categorySchema,
  priority: prioritySchema,
  end_date: z.string().min(1, "End date is required"), // yyyy-mm-dd
});

export const updateTaskSchema = z.object({
  task_name: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  category: categorySchema.optional(),
  priority: prioritySchema.optional(),
  end_date: z.string().min(1).optional(),
  status: z.enum(["pending", "completed"]).optional(),
  voice_note_url: z.string().nullable().optional(),
  revised: z.boolean().optional(),
  revision_week: z.string().nullable().optional(),
});

export const completeTaskSchema = z.object({
  status: z.enum(["pending", "completed"]),
});

// ─── Scratchpad ─────────────────────────────────────────────
export const scratchpadSchema = z.object({
  entry: z.string().min(1, "Note cannot be empty").max(5000),
});

// ─── AI Motivation ──────────────────────────────────────────
export const motivateSchema = z.object({
  task_id: z.string().uuid().optional(),
  bulk: z.boolean().optional(),
});

// ─── Revision ───────────────────────────────────────────────
export const revisionUpdateSchema = z.object({
  task_id: z.string().uuid(),
  action: z.enum(["revised", "later"]),
});

// ─── Quiz ───────────────────────────────────────────────────
export const quizEvaluateSchema = z.object({
  questions: z.array(
    z.object({
      id: z.number(),
      type: z.enum(["mcq", "short_answer"]),
      question: z.string(),
      options: z.array(z.string()).nullable(),
      correct_answer: z.string(),
      user_answer: z.string().nullable(),
    }),
  ),
  topics: z.array(z.string()),
});

// ─── Quiz JSON schema (strict, mirrors spec §5) ─────────────
export const quizQuestionSchema = z.object({
  id: z.number(),
  type: z.enum(["mcq", "short_answer"]),
  question: z.string(),
  options: z.array(z.string()).nullable(),
  correct_answer: z.string(),
  user_answer: z.string().nullable(),
  is_correct: z.boolean().nullable(),
  explanation: z.string(),
});

export const quizMetadataSchema = z.object({
  generated_at: z.string(),
  ai_model: z.string(),
  topics: z.array(z.string()),
  total_questions: z.number(),
  mcq_count: z.number(),
  short_answer_count: z.number(),
});

export const quizDataSchema = z.object({
  questions: z.array(quizQuestionSchema),
  metadata: quizMetadataSchema,
});

// ─── Settings ───────────────────────────────────────────────
export const settingsSchema = z.object({
  display_name: z.string().max(100).nullable().optional(),
  theme: z.enum(["light", "dark"]).optional(),
  ai_base_url: z.string().url().nullable().optional(),
  ai_model: z.string().max(200).nullable().optional(),
  ai_api_key: z.string().max(500).nullable().optional(), // will be encrypted
  notifications: z.boolean().optional(),
});

// ─── Helper ─────────────────────────────────────────────────
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export function validate<T>(
  schema: z.ZodSchema<T>,
  input: unknown,
): ValidationResult<T> {
  const result = schema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: result.error.issues.map((i) => i.message).join("; "),
  };
}
