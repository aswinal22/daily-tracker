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
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });
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
 */
export async function generateQuiz(
  config: AIConfig,
  opts: {
    topics: string[];
    weekRange: string;
  },
): Promise<unknown> {
  const client = createAIClient(config);

  const topicList = opts.topics.map((t, i) => `${i + 1}. ${t}`).join("\n");
  const totalQuestions = Math.min(10, Math.max(5, opts.topics.length + 2));

  const prompt = `You are an expert educator creating a knowledge-check quiz. Generate ${totalQuestions} questions based on these topics that the user studied this week (${opts.weekRange}):

${topicList}

Requirements:
- Mix of MCQ (multiple choice, exactly 4 options) and short_answer questions.
- At least 60% should be MCQ.
- Questions should test understanding of the core concepts, not trivia.
- Each MCQ must have exactly 4 options with one definitive correct answer.
- Each short_answer must have a concise reference answer.
- Include a brief explanation for every question.

Return ONLY valid JSON in this exact structure (no markdown, no commentary):
{
  "questions": [
    {
      "id": 1,
      "type": "mcq",
      "question": "The question text",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "B",
      "user_answer": null,
      "is_correct": null,
      "explanation": "Why B is correct."
    }
  ],
  "metadata": {
    "generated_at": "ISO-8601 timestamp",
    "ai_model": "${config.model}",
    "topics": ${JSON.stringify(opts.topics)},
    "total_questions": ${totalQuestions},
    "mcq_count": 0,
    "short_answer_count": 0
  }
}`;

  const completion = await client.chat.completions.create({
    model: config.model,
    messages: [
      { role: "system", content: "You are an expert quiz generator. You output only valid JSON." },
      { role: "user", content: prompt },
    ],
    temperature: 0.5,
    max_tokens: 2000,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("AI returned empty quiz response");

  return JSON.parse(raw);
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

  const prompt = `You are grading a short-answer quiz question. Determine if the student's answer is correct.

Question: ${opts.question}
Reference answer: ${opts.correctAnswer}
Student's answer: ${opts.userAnswer}

Grading rules:
1. Grade based on whether the CORE TECHNICAL CONCEPT was understood.
2. Ignore minor typos, phrasing differences, or alternate terminology.
3. Return a binary judgment: correct or incorrect.
4. Provide a 1-2 sentence explanation justifying the grade.
5. If the answer captures the essence but is incomplete, mark it CORRECT with a note about what could be expanded.

Return ONLY valid JSON:
{
  "is_correct": true,
  "explanation": "Your 1-2 sentence explanation."
}`;

  const completion = await client.chat.completions.create({
    model: config.model,
    messages: [
      { role: "system", content: "You are a precise quiz grader. You output only valid JSON." },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
    max_tokens: 200,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("AI returned empty grading response");

  const parsed = JSON.parse(raw);
  return {
    isCorrect: Boolean(parsed.is_correct),
    explanation: String(parsed.explanation || ""),
  };
}
