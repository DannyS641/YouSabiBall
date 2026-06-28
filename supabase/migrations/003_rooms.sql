-- HARDWOOD Phase 3 – multiplayer draft rooms

create table if not exists public.rooms (
  id            text        primary key,              -- 6-char invite code
  host_id       uuid        references auth.users(id) on delete cascade not null,
  guest_id      uuid        references auth.users(id) on delete set null,
  status        text        not null default 'waiting',  -- waiting | drafting | done
  host_name     text        not null,
  guest_name    text,
  host_roster   jsonb,
  guest_roster  jsonb,
  result        jsonb,       -- { winner: 'host'|'guest', host_score, guest_score }
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '2 hours'
);

-- Index for quick lookup by host / guest
create index if not exists rooms_host_idx  on public.rooms(host_id);
create index if not exists rooms_guest_idx on public.rooms(guest_id);

-- Remove expired rooms automatically (requires pg_cron or manual cleanup)
-- For now, the app filters expired rooms client-side.

alter table public.rooms enable row level security;

-- Anyone can read a room they are in (host or guest), or that is waiting (joinable)
create policy "rooms_read" on public.rooms for select
  using (
    auth.uid() = host_id
    or auth.uid() = guest_id
    or status = 'waiting'
  );

-- Host creates their own room
create policy "rooms_insert" on public.rooms for insert
  with check (auth.uid() = host_id);

-- Host or guest can update (they write their own roster / ready state)
create policy "rooms_update" on public.rooms for update
  using (auth.uid() = host_id or auth.uid() = guest_id);

-- ─── Function: resolve match (server-definer so it can always write result) ────

create or replace function public.resolve_room(p_room_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room rooms%rowtype;
  host_avg float;
  guest_avg float;
  host_wins bool;
  host_score int;
  guest_score int;
  margin int;
begin
  select * into v_room from rooms where id = p_room_id;
  if not found then return; end if;
  if v_room.status = 'done' then return; end if;
  if v_room.host_roster is null or v_room.guest_roster is null then return; end if;

  -- Compute average OVR for each team (simple average of 5 players)
  select avg((card->>'ovr')::int)
  into host_avg
  from jsonb_each(v_room.host_roster) as kv(pos, card)
  where card <> 'null'::jsonb;

  select avg((card->>'ovr')::int)
  into guest_avg
  from jsonb_each(v_room.guest_roster) as kv(pos, card)
  where card <> 'null'::jsonb;

  -- Use Elo-like win probability with randomness (mirrors decide.ts)
  -- P(host wins) = 1 / (1 + 10^((guest_avg - host_avg)/15))
  -- Add a random factor for upset potential
  declare
    diff float := coalesce(host_avg, 80) - coalesce(guest_avg, 80);
    win_prob float;
    roll float;
  begin
    win_prob := 1.0 / (1.0 + power(10, -diff / 15.0));
    roll := random();
    host_wins := roll < win_prob;
  end;

  -- Score: base ~105, winner gets more
  margin    := 2 + floor(random() * 22)::int;
  host_score  := case when host_wins  then 105 + floor(random() * 16)::int
                                       else 105 + floor(random() * 16)::int - margin end;
  guest_score := case when not host_wins then 105 + floor(random() * 16)::int
                                          else host_score - margin end;

  update rooms set
    status = 'done',
    result = jsonb_build_object(
      'winner',      case when host_wins then 'host' else 'guest' end,
      'host_score',  host_score,
      'guest_score', guest_score
    )
  where id = p_room_id;
end;
$$;
