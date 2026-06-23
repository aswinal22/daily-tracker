import OpenAI from "openai";
import { decrypt } from "@/lib/crypto";
import type { Profile } from "@/types";

/**
 * OpenAI-compatible LLM client.
 *
 * Resolves the provider config per-user:
 *   1. User's stored config (decrypted key + base_url + model) from `profiles`
 *   2. Fallback to env vars (AI_API_KEY, AI_BASE_URL, AI_MODEL)
 *
 * Works with OpenAI, Gemini (OpenAI endpoint), Claude, Groq, Ollama, OpenRouter,
 * and any provider that exposes an OpenAI-compatible /chat/completions endpoint.
 */

export interface AIConfig {
  apiKey: string;
  baseURL: string;
  model: string;
  /** Where the config came from — for logging/debugging. */
  source: "user" | "env";
}

export class AIConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIConfigError";
  }
}

/**
 * Resolve the effective AI config for a user profile.
 * Throws AIConfigError if no usable config exists.
 */
export function resolveAIConfig(profile: Pick<
  Profile,
  "ai_api_key" | "ai_base_url" | "ai_model"
> | null): AIConfig {
  // 1. Try user's stored config
  if (profile?.ai_api_key) {
    const apiKey = decrypt(profile.ai_api_key);
    if (apiKey) {
      return {
        apiKey,
        baseURL: profile.ai_base_url || "https://api.openai.com/v1",
        model: profile.ai_model || "gpt-4o",
        source: "user",
      };
    }
  }

  // 2. Fallback to env vars
  const envKey = process.env.AI_API_KEY;
  if (envKey) {
    return {
      apiKey: envKey,
      baseURL: process.env.AI_BASE_URL || "https://api.openai.com/v1",
      model: process.env.AI_MODEL || "gpt-4o",
      source: "env",
    };
  }

  throw new AIConfigError(
    "No AI provider configured. Add an API key in Settings, or set AI_API_KEY in the environment.",
  );
}

/** Create a configured OpenAI-compatible client. */
export function createAIClient(config: AIConfig): OpenAI {
  // OpenRouter requires HTTP-Referer and X-Title headers
  const isOpenRouter = config.baseURL.includes("openrouter.ai");

  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    timeout: 50_000,
    maxRetries: 0, // We handle retries ourselves — SDK retries make rate limits worse
    defaultHeaders: isOpenRouter
      ? {
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://daily-tracker-mu-roan.vercel.app",
          "X-Title": "Daily Task Dashboard",
        }
      : undefined,
  });
}

/** Check if an error is a rate-limit (429) from the provider. */
export function isRateLimitError(err: unknown): boolean {
  if (err && typeof err === "object" && "status" in err) {
    return (err as { status: number }).status === 429;
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return msg.includes("429") || msg.includes("rate limit") || msg.includes("too many requests");
  }
  return false;
}

/** Extract a user-friendly message from an API error. */
export function getAIErrorMessage(err: unknown): string {
  if (isRateLimitError(err)) {
    return "The AI provider is rate-limiting requests (429). Free models have strict limits. Please wait 1-2 minutes and try again, or switch to a paid model in Settings.";
  }
  if (err instanceof Error) {
    // OpenRouter / OpenAI often wrap the real message
    const msg = err.message;
    if (msg.includes("401") || msg.includes("incorrect api key")) {
      return "Invalid API key. Check your AI provider settings.";
    }
    if (msg.includes("404") || msg.includes("model")) {
      return "Model not found. Check the model name in Settings — it may be deprecated.";
    }
    return msg;
  }
  return "An unexpected error occurred. Please try again.";
}

/**
 * Extract JSON from an LLM text response.
 * Handles common cases:
 *   - Raw JSON
 *   - JSON wrapped in ```json ... ``` code fences
 *   - JSON with leading/trailing text
 */
function extractJSON(raw: string): unknown {
  const trimmed = raw.trim();

  // Case 1: already valid JSON
  try {
    return JSON.parse(trimmed);
  } catch {
    // continue
  }

  // Case 2: wrapped in markdown code fences ```json ... ```
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      // continue
    }
  }

  // Case 3: find the first { and last } — extract the JSON object
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonStr = trimmed.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(jsonStr);
    } catch {
      // continue
    }
  }

  throw new Error("Could not extract valid JSON from AI response");
}

/**
 * Generate a personalized motivational message for an overdue task.
 * Returns 3-5 sentences of encouragement.
 */
export async function generateMotivation(
  config: AIConfig,
  opts: {
    userName: string;
    taskName: string;
    category: string;
    daysOverdue: number;
  },
): Promise<string> {
  const client = createAIClient(config);

  const prompt = `You are an encouraging, warm motivational coach. Write a short, personalized motivational message (3-5 sentences) for someone who is ${opts.daysOverdue} day${opts.daysOverdue === 1 ? "" : "s"} overdue on a task.

Person's name: ${opts.userName}
Task: "${opts.taskName}"
Category: ${opts.category}
Days overdue: ${opts.daysOverdue}

Guidelines:
- Be genuine and warm, not overly cheerful or corporate.
- Acknowledge the slip without guilt-tripping.
- Offer one concrete, small next step.
- Keep it to 3-5 sentences.
- Do not use placeholders or brackets — write the actual message.
- Address them by name at least once.`;

  const completion = await client.chat.completions.create({
    model: config.model,
    messages: [
      { role: "system", content: "You are a motivational coach who writes concise, warm, encouraging messages." },
      { role: "user", content: prompt },
    ],
    temperature: 0.8,
    max_tokens: 300,
  });

  const message = completion.choices[0]?.message?.content?.trim();
  if (!message) {
    throw new Error("AI returned an empty message");
  }
  return message;
}

/**
 * Generate quiz questions from a list of topics (for weekend revision).
 * Returns strictly-validated JSON matching the QuizData schema.
 *
 * Note: Does NOT use response_format json_object — many providers (especially
 * OpenRouter free models) don't support it. Instead we instruct the model
 * to output JSON and extract it from the text response.
 */
export async function generateQuiz(
  config: AIConfig,
  opts: {
    topics: string[];
    studyContext?: string[];
    weekRange: string;
  },
): Promise<unknown> {
  const client = createAIClient(config);

  // Use study context (description + notes) if available for richer questions
  const contextLines = opts.studyContext && opts.studyContext.length > 0
    ? opts.studyContext.map((c, i) => `${i + 1}. ${c}`).join("\n")
    : opts.topics.map((t, i) => `${i + 1}. ${t}`).join("\n");

  const totalQuestions = Math.min(6, Math.max(5, opts.topics.length + 1));

  const prompt = `Create a ${totalQuestions}-question quiz based on what the user studied this week (${opts.weekRange}):

${contextLines}

Rules:
- 4 MCQ questions (each with exactly 4 options A/B/C/D)
- 1-2 short answer questions
- One correct answer per question
- Questions should test understanding of the concepts described above
- If the user wrote notes about what they learned, base questions on those notes
- Brief explanation for each

Output ONLY this JSON (no markdown, no extra text):
{"questions":[{"id":1,"type":"mcq","question":"What is...?","options":["A","B","C","D"],"correct_answer":"B","user_answer":null,"is_correct":null,"explanation":"Because..."},{"id":2,"type":"short_answer","question":"Explain...","options":null,"correct_answer":"The answer","user_answer":null,"is_correct":null,"explanation":"Because..."}],"metadata":{"generated_at":"${new Date().toISOString()}","ai_model":"${config.model}","topics":${JSON.stringify(opts.topics)},"total_questions":${totalQuestions},"mcq_count":4,"short_answer_count":1}}`;

  const completion = await client.chat.completions.create({
    model: config.model,
    messages: [
      { role: "system", content: "You are a quiz generator. Output ONLY valid JSON, no markdown." },
      { role: "user", content: prompt },
    ],
    temperature: 0.5,
    max_tokens: 1500,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("AI returned empty quiz response");

  return extractJSON(raw);
}

/**
 * Generate a focused quiz about a SINGLE task/topic.
 * Used for per-task quizzes during revision.
 */
export async function generateTaskQuiz(
  config: AIConfig,
  opts: {
    taskName: string;
    studyContext: string;
    weekRange: string;
  },
): Promise<unknown> {
  const client = createAIClient(config);

  const prompt = `Create a 5-question quiz about this specific topic the user studied (${opts.weekRange}):

${opts.studyContext}

Rules:
- 4 MCQ questions (each with exactly 4 options A/B/C/D)
- 1 short answer question
- One correct answer per question
- Test understanding of the concepts, not memorization
- If the user wrote notes about what they learned, base questions on those notes
- Brief explanation for each answer

Output ONLY this JSON (no markdown, no extra text):
{"questions":[{"id":1,"type":"mcq","question":"What is...?","options":["A","B","C","D"],"correct_answer":"B","user_answer":null,"is_correct":null,"explanation":"Because..."},{"id":2,"type":"short_answer","question":"Explain...","options":null,"correct_answer":"The answer","user_answer":null,"is_correct":null,"explanation":"Because..."}],"metadata":{"generated_at":"${new Date().toISOString()}","ai_model":"${config.model}","topics":["${opts.taskName}"],"total_questions":5,"mcq_count":4,"short_answer_count":1}}`;

  const completion = await client.chat.completions.create({
    model: config.model,
    messages: [
      { role: "system", content: "You are a quiz generator. Output ONLY valid JSON, no markdown." },
      { role: "user", content: prompt },
    ],
    temperature: 0.5,
    max_tokens: 1200,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("AI returned empty quiz response");

  return extractJSON(raw);
}

/**
 * Evaluate a short-answer question semantically (not exact match).
 * Used for quiz grading per spec §5 (5-rule prompt).
 */
export async function evaluateShortAnswer(
  config: AIConfig,
  opts: {
    question: string;
    correctAnswer: string;
    userAnswer: string;
  },
): Promise<{ isCorrect: boolean; explanation: string }> {
  const client = createAIClient(config);

  const prompt = `Grade this short-answer question. Determine if the student understands the core concept.

Question: ${opts.question}
Reference answer: ${opts.correctAnswer}
Student's answer: ${opts.userAnswer}

Rules: Ignore typos and phrasing. Focus on core concept. If the answer captures the essence, mark correct.

Output ONLY this JSON (no markdown):
{"is_correct": true, "explanation": "1-2 sentence explanation"}`;

  const completion = await client.chat.completions.create({
    model: config.model,
    messages: [
      { role: "system", content: "You grade quiz answers. Output ONLY valid JSON, no markdown." },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
    max_tokens: 200,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("AI returned empty grading response");

  const parsed = extractJSON(raw) as { is_correct?: boolean; explanation?: string };
  return {
    isCorrect: Boolean(parsed.is_correct),
    explanation: String(parsed.explanation || ""),
  };
}
