-- HARDWOOD Phase 1 – initial schema
-- Run against your Supabase project via the SQL editor or CLI:
--   supabase db push  OR  copy-paste into the Dashboard → SQL Editor

-- ─── Extensions ──────────────────────────────────────────────────────────────

create extension if not exists "uuid-ossp";

-- ─── Tables ──────────────────────────────────────────────────────────────────

-- One profile row per auth user (created by trigger on sign-up)
create table if not exists public.profiles (
  id            uuid references auth.users(id) on delete cascade primary key,
  display_name  text        not null,
  difficulty    text        not null default 'Pro',
  updated_at    timestamptz not null default now()
);

-- Full game save state (coins, streak, stats, badges)
create table if not exists public.saves (
  id         uuid references auth.users(id) on delete cascade primary key,
  data       jsonb        not null default '{}',
  updated_at timestamptz  not null default now()
);

-- Individual playoff run record (server-verified score)
create table if not exists public.runs (
  id            uuid        default gen_random_uuid() primary key,
  user_id       uuid        references auth.users(id) on delete cascade not null,
  display_name  text        not null,
  difficulty    text        not null,
  round_reached integer     not null default 0,
  is_champion   boolean     not null default false,
  points_earned integer     not null default 0,
  coins_earned  integer     not null default 0,
  run_label     text        not null default '',
  created_at    timestamptz not null default now()
);

-- Aggregated leaderboard (upserted by server function only)
create table if not exists public.leaderboard (
  user_id       uuid        references auth.users(id) on delete cascade primary key,
  display_name  text        not null,
  total_points  integer     not null default 0,
  titles        integer     not null default 0,
  games         integer     not null default 0,
  best_round    integer     not null default 0,
  updated_at    timestamptz not null default now()
);

-- ─── Row-Level Security ───────────────────────────────────────────────────────

alter table public.profiles    enable row level security;
alter table public.saves       enable row level security;
alter table public.runs        enable row level security;
alter table public.leaderboard enable row level security;

-- profiles: each user owns their own row
create policy "profiles_select" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- saves: each user owns their own row
create policy "saves_select" on public.saves for select using (auth.uid() = id);
create policy "saves_insert" on public.saves for insert with check (auth.uid() = id);
create policy "saves_update" on public.saves for update using (auth.uid() = id);

-- runs: user inserts own; everyone reads (leaderboard page)
create policy "runs_insert" on public.runs for insert with check (auth.uid() = user_id);
create policy "runs_select" on public.runs for select using (true);

-- leaderboard: public read; no direct client writes (server function only)
create policy "leaderboard_select" on public.leaderboard for select using (true);

-- ─── Functions ───────────────────────────────────────────────────────────────

-- Called by server action to upsert leaderboard row (security definer bypasses RLS)
create or replace function public.upsert_leaderboard(
  p_user_id      uuid,
  p_display_name text,
  p_points_delta integer,
  p_games_delta  integer,
  p_titles_delta integer,
  p_best_round   integer
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.leaderboard
    (user_id, display_name, total_points, games, titles, best_round)
  values
    (p_user_id, p_display_name, p_points_delta, p_games_delta, p_titles_delta, p_best_round)
  on conflict (user_id) do update set
    display_name = excluded.display_name,
    total_points = leaderboard.total_points + p_points_delta,
    games        = leaderboard.games        + p_games_delta,
    titles       = leaderboard.titles       + p_titles_delta,
    best_round   = greatest(leaderboard.best_round, p_best_round),
    updated_at   = now();
end;
$$;

-- Auto-create profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
