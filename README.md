# 📋 Daily Task Dashboard

A production-grade, multi-user personal productivity web app with AI-powered motivation, weekend revision quizzes, voice notes, and smart analytics — built with Next.js, Supabase, and Tailwind CSS.

## Features

- **Multi-User Auth** — Email/password + Google/GitHub OAuth via Supabase Auth
- **Task Management** — CRUD with categories (Upskillment, Personal, Health), priorities, deadlines
- **Voice Notes** — Record audio on completed tasks (MediaRecorder API, stored in Supabase Storage)
- **AI Motivation** — Personalized motivational emails for overdue tasks (any OpenAI-compatible LLM)
- **Weekend Revision** — Spaced-repetition review of Upskillment tasks + AI-generated quizzes
- **Analytics Dashboard** — Completion trends, category breakdown, quiz progression, streak heatmap
- **Auto-Archive** — Completed tasks from previous days are archived automatically
- **Scratchpad** — Quick timestamped notes
- **Dark/Light Mode** — Toggleable theme

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (@supabase/ssr) |
| Storage | Supabase Storage (voice notes) |
| AI | OpenAI-compatible SDK (OpenAI, Gemini, Claude, Groq, Ollama, etc.) |
| Email | Resend |
| Charts | Recharts + react-calendar-heatmap |
| Cron | Vercel Cron |
| Deploy | Vercel |

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → paste the contents of `supabase/migrations/0001_init.sql` → Run
3. Go to **Settings → API** → copy your Project URL, publishable key, and secret key

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
ENCRYPTION_KEY=          # openssl rand -base64 32
AI_API_KEY=              # optional: default AI provider key
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o
RESEND_API_KEY=          # optional: for email features
CRON_SECRET=             # optional: protects cron endpoints
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## AI Provider Configuration

Users can configure their own AI provider in **Settings**:
- **OpenAI**: `https://api.openai.com/v1` — gpt-4o, gpt-4o-mini
- **Google Gemini**: `https://generativelanguage.googleapis.com/v1beta/openai` — gemini-2.0-flash
- **Groq**: `https://api.groq.com/openai/v1` — llama-3.1-70b-versatile
- **Ollama (local)**: `http://localhost:11434/v1` — llama3
- **OpenRouter**: `https://openrouter.ai/api/v1` — any model

API keys are encrypted with AES-256-GCM before storage.

## Deployment

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add all environment variables in the Vercel dashboard
4. Deploy — cron jobs are configured in `vercel.json`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript compiler check |
