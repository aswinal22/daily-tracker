-- ============================================================================
-- Daily Task Dashboard — Initial schema migration
-- Mirrors spec §5 (Database Schema). All tables have RLS enabled; policies
-- enforce auth.uid() = user_id on every row.
-- ============================================================================

-- Needed for gen_random_uuid() and pgcrypto
create extension if not exists "pgcrypto";

-- ─── Enums ────────────────────────────────────────────────────────────────
do $$ begin
  create type task_category as enum ('Upskillment', 'Personal', 'Health');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_priority as enum ('High', 'Medium', 'Low');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_status as enum ('pending', 'completed');
exception when duplicate_object then null; end $$;

-- ─── profiles ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  -- Stored as AES-256-GCM ciphertext (base64) written by the app.
  -- Encrypted/decrypted server-side with ENCRYPTION_KEY; never selected by
  -- RLS-scoped clients in raw form.
  ai_api_key    text,
  ai_base_url   text default 'https://api.openai.com/v1',
  ai_model      text default 'gpt-4o',
  theme         text not null default 'light' check (theme in ('light','dark')),
  notifications boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── tasks ────────────────────────────────────────────────────────────────
create table if not exists public.tasks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  task_name     text not null check (char_length(task_name) > 0),
  category      task_category not null,
  priority      task_priority not null,
  status        task_status not null default 'pending',
  end_date      date not null,
  added_at      timestamptz not null default now(),
  completed_at  timestamptz,
  voice_note_url text,
  revised       boolean not null default false,
  revision_week date,
  constraint tasks_user_category_priority_status_check check (true)
);

create index if not exists tasks_user_id_idx        on public.tasks(user_id);
create index if not exists tasks_status_idx          on public.tasks(status);
create index if not exists tasks_end_date_idx        on public.tasks(end_date);
create index if not exists tasks_revised_idx         on public.tasks(revised);
create index if not exists tasks_revision_week_idx   on public.tasks(revision_week);

-- ─── scratchpad ───────────────────────────────────────────────────────────
create table if not exists public.scratchpad (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  entry      text not null,
  created_at timestamptz not null default now()
);
create index if not exists scratchpad_user_id_idx on public.scratchpad(user_id);

-- ─── archived_tasks ───────────────────────────────────────────────────────
-- id is the ORIGINAL task id (preserved so voice_note_url stays resolvable).
create table if not exists public.archived_tasks (
  id            uuid primary key,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  task_name     text not null,
  category      task_category not null,
  priority      task_priority not null,
  end_date      date not null,
  added_at      timestamptz not null,
  completed_at  timestamptz,
  archived_at   timestamptz not null default now(),
  voice_note_url text
);
create index if not exists archived_tasks_user_id_idx on public.archived_tasks(user_id);

-- ─── quiz_results ─────────────────────────────────────────────────────────
create table if not exists public.quiz_results (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  week_of         date not null,
  total_questions int not null,
  correct_answers int not null,
  score_percent   float not null,
  -- Strict JSON schema validated by the app (zod) + this check:
  questions_json  jsonb not null,
  taken_at        timestamptz not null default now()
);
create index if not exists quiz_results_user_id_idx on public.quiz_results(user_id);
create index if not exists quiz_results_week_of_idx on public.quiz_results(week_of);

-- ─── revision_streaks ─────────────────────────────────────────────────────
create table if not exists public.revision_streaks (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique references public.profiles(id) on delete cascade,
  current_streak  int not null default 0,
  longest_streak  int not null default 0,
  last_revised_at timestamptz
);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles        enable row level security;
alter table public.tasks           enable row level security;
alter table public.scratchpad      enable row level security;
alter table public.archived_tasks  enable row level security;
alter table public.quiz_results    enable row level security;
alter table public.revision_streaks enable row level security;

-- profiles: a user owns the row whose id == their auth uid
drop policy if exists "profiles_select_own"  on public.profiles;
drop policy if exists "profiles_insert_own"  on public.profiles;
drop policy if exists "profiles_update_own"  on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Generic helper policy applier for user-scoped tables
do $$
declare
  t text;
begin
  foreach t in array array['tasks','scratchpad','archived_tasks','quiz_results','revision_streaks']
  loop
    execute format('drop policy if exists %I on public.%I;', t || '_select_own', t);
    execute format('drop policy if exists %I on public.%I;', t || '_insert_own', t);
    execute format('drop policy if exists %I on public.%I;', t || '_update_own', t);
    execute format('drop policy if exists %I on public.%I;', t || '_delete_own', t);

    execute format(
      'create policy %I on public.%I for select using (auth.uid() = user_id);',
      t || '_select_own', t
    );
    execute format(
      'create policy %I on public.%I for insert with check (auth.uid() = user_id);',
      t || '_insert_own', t
    );
    execute format(
      'create policy %I on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      t || '_update_own', t
    );
    execute format(
      'create policy %I on public.%I for delete using (auth.uid() = user_id);',
      t || '_delete_own', t
    );
  end loop;
end $$;

-- ============================================================================
-- Auto-create a profile row on signup
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- updated_at auto-touch on profiles
-- ============================================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- Storage bucket for voice notes
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('voice-notes', 'voice-notes', true)
on conflict (id) do update set public = true;

-- Storage policies: a user can manage objects under their own prefix only.
drop policy if exists "voice_notes_select_own"  on storage.objects;
drop policy if exists "voice_notes_insert_own" on storage.objects;
drop policy if exists "voice_notes_update_own" on storage.objects;
drop policy if exists "voice_notes_delete_own" on storage.objects;

create policy "voice_notes_select_own" on storage.objects
  for select using (
    bucket_id = 'voice-notes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "voice_notes_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'voice-notes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "voice_notes_update_own" on storage.objects
  for update using (
    bucket_id = 'voice-notes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "voice_notes_delete_own" on storage.objects
  for delete using (
    bucket_id = 'voice-notes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
