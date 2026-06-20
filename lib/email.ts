import { Resend } from "resend";
import type { Task } from "@/types";

/**
 * Email sending via Resend.
 *
 * All functions gracefully no-op (return a skipped status) when
 * RESEND_API_KEY is not set — so local dev without email config
 * doesn't crash, and the AI features still work (the message is
 * returned to the caller).
 */

let client: Resend | null = null;

function getEmailClient(): Resend | null {
  if (client) return client;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  client = new Resend(key);
  return client;
}

function getFromEmail(): string {
  return process.env.EMAIL_FROM || "Daily Task Dashboard <onboarding@resend.dev>";
}

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

interface EmailResult {
  sent: boolean;
  id?: string;
  skipped?: boolean;
  error?: string;
}

async function send(
  to: string,
  subject: string,
  html: string,
): Promise<EmailResult> {
  const resend = getEmailClient();
  if (!resend) {
    return { sent: false, skipped: true };
  }

  const { data, error } = await resend.emails.send({
    from: getFromEmail(),
    to,
    subject,
    html,
  });

  if (error) {
    return { sent: false, error: error.message };
  }

  return { sent: true, id: data?.id };
}

// ─── Templates ──────────────────────────────────────────────

export async function sendMotivationEmail(opts: {
  to: string;
  userName: string;
  task: Task;
  message: string;
  daysOverdue: number;
}): Promise<EmailResult> {
  const { userName, task, message, daysOverdue } = opts;

  const subject = `💪 You've got this, ${userName}! — "${task.task_name}" needs your attention`;

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
  <p style="font-size: 16px;">Hey ${userName},</p>
  <p style="font-size: 16px; line-height: 1.6;">${message}</p>
  <div style="margin: 24px 0; padding: 16px; background: #f4f4f5; border-radius: 12px;">
    <p style="margin: 0 0 8px; font-size: 14px;">📌 <strong>Task:</strong> ${task.task_name}</p>
    <p style="margin: 0 0 8px; font-size: 14px;">🏷️ <strong>Category:</strong> ${task.category}</p>
    <p style="margin: 0; font-size: 14px;">📅 <strong>Deadline was:</strong> ${task.end_date} (${daysOverdue} day${daysOverdue === 1 ? "" : "s"} ago)</p>
  </div>
  <p style="font-size: 16px;">One step at a time. You've got this! 🚀</p>
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;" />
  <p style="font-size: 13px; color: #71717a;">— Daily Task Dashboard</p>
</div>`;

  return send(opts.to, subject, html);
}

export async function sendRevisionReminderEmail(opts: {
  to: string;
  userName: string;
  tasks: Task[];
  streakCount: number;
}): Promise<EmailResult> {
  const { userName, tasks, streakCount } = opts;

  const subject = `📚 Weekend Revision Time, ${userName}! — ${tasks.length} topics to review`;

  const taskList = tasks.map((t) => `• ${t.task_name}`).join("\n");

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
  <p style="font-size: 16px;">Hey ${userName},</p>
  <p style="font-size: 16px;">You crushed it this week! You completed ${tasks.length} upskilling task${tasks.length === 1 ? "" : "s"}:</p>
  <pre style="font-size: 14px; line-height: 1.6; white-space: pre-wrap; font-family: inherit;">${taskList}</pre>
  <p style="font-size: 16px; line-height: 1.6;">Time to lock in that knowledge with a quick revision session. After you review, there's a quiz waiting to test what you remember 🧠</p>
  <p style="font-size: 16px; margin: 24px 0;">
    👉 <a href="${getAppUrl()}/dashboard/revision" style="color: #4f46e5; font-weight: 600;">Open your dashboard</a>
  </p>
  <p style="font-size: 16px;">Keep the streak going! 🔥 (${streakCount} week${streakCount === 1 ? "" : "s"} in a row)</p>
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;" />
  <p style="font-size: 13px; color: #71717a;">— Daily Task Dashboard</p>
</div>`;

  return send(opts.to, subject, html);
}

export async function sendQuizResultsEmail(opts: {
  to: string;
  userName: string;
  scorePercent: number;
  correct: number;
  total: number;
  weekOf: string;
}): Promise<EmailResult> {
  const { userName, scorePercent, correct, total } = opts;

  const subject = `🏆 Quiz Results — You scored ${scorePercent}%!`;

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
  <p style="font-size: 16px;">Hey ${userName},</p>
  <p style="font-size: 16px;">Your weekend revision quiz is graded:</p>
  <div style="margin: 24px 0; padding: 20px; background: #f4f4f5; border-radius: 12px; text-align: center;">
    <p style="font-size: 36px; font-weight: 700; margin: 0; color: #4f46e5;">${scorePercent}%</p>
    <p style="font-size: 14px; color: #71717a; margin: 4px 0 0;">${correct} / ${total} correct</p>
  </div>
  <p style="font-size: 16px;">
    👉 <a href="${getAppUrl()}/dashboard/quiz/results" style="color: #4f46e5; font-weight: 600;">See full breakdown</a>
  </p>
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;" />
  <p style="font-size: 13px; color: #71717a;">— Daily Task Dashboard</p>
</div>`;

  return send(opts.to, subject, html);
}
