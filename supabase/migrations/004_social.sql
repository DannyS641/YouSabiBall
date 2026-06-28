-- Phase 4: Social — friendships & direct score challenges
-- Run this in your Supabase SQL editor after 001_schema.sql and 003_rooms.sql.

-- ─── Friendships ──────────────────────────────────────────────────────────────

create table if not exists public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid references public.profiles(id) on delete cascade not null,
  addressee_id uuid references public.profiles(id) on delete cascade not null,
  status       text check (status in ('pending', 'accepted')) not null default 'pending',
  created_at   timestamptz not null default now(),
  unique(requester_id, addressee_id)
);

alter table public.friendships enable row level security;

create policy "friendship_select"
  on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "friendship_insert"
  on public.friendships for insert
  with check (auth.uid() = requester_id);

-- Only the addressee can accept (update status to 'accepted')
create policy "friendship_update"
  on public.friendships for update
  using (auth.uid() = addressee_id);

-- Either party can unfriend / cancel
create policy "friendship_delete"
  on public.friendships for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- ─── Direct score challenges ──────────────────────────────────────────────────

create table if not exists public.direct_challenges (
  id            uuid primary key default gen_random_uuid(),
  challenger_id uuid references public.profiles(id) on delete cascade not null,
  challengee_id uuid references public.profiles(id) on delete cascade not null,
  target_points integer not null,
  difficulty    text not null default 'Pro',
  status        text check (status in ('pending', 'beaten', 'expired')) not null default 'pending',
  result_points integer,
  expires_at    timestamptz not null default (now() + interval '7 days'),
  created_at    timestamptz not null default now()
);

alter table public.direct_challenges enable row level security;

create policy "challenge_select"
  on public.direct_challenges for select
  using (auth.uid() = challenger_id or auth.uid() = challengee_id);

create policy "challenge_insert"
  on public.direct_challenges for insert
  with check (auth.uid() = challenger_id);

-- Only the challengee can update (mark beaten)
create policy "challenge_update"
  on public.direct_challenges for update
  using (auth.uid() = challengee_id);

-- Expire stale pending challenges (call periodically or via cron)
create or replace function public.expire_direct_challenges()
returns void language plpgsql security definer as $$
begin
  update public.direct_challenges
  set status = 'expired'
  where status = 'pending' and expires_at < now();
end;
$$;
