-- ============================================================================
-- Migration 0002: Add description and notes columns
-- ============================================================================

-- tasks: add description (what the task is about) and notes (what I learned)
alter table public.tasks
  add column if not exists description text,
  add column if not exists notes text;

-- archived_tasks: preserve description and notes during archival
alter table public.archived_tasks
  add column if not exists description text,
  add column if not exists notes text;
