-- HARDWOOD Season Mode – migration 006
-- Run against your Supabase project via the SQL editor or CLI:
--   supabase db push  OR  copy-paste into Dashboard → SQL Editor

-- ─── seasons_v2 ──────────────────────────────────────────────────────────────
-- One row per user per season run.

create table if not exists public.seasons_v2 (
  id              uuid        default gen_random_uuid() primary key,
  user_id         uuid        references auth.users(id) on delete cascade not null,
  season_number   integer     not null default 1,
  length          text        not null default 'standard',   -- 'short' | 'standard' | 'full'
  status          text        not null default 'active',     -- 'active' | 'regular_season' | 'trade_window' | 'play_in' | 'playoffs' | 'complete'
  difficulty      text        not null default 'Pro',
  champion_team   text,                                      -- winning team name, null until complete
  coins_awarded   integer     not null default 0,
  started_at      timestamptz not null default now(),
  ended_at        timestamptz
);

alter table public.seasons_v2 enable row level security;

create policy "seasons_v2_select" on public.seasons_v2
  for select using (auth.uid() = user_id);
create policy "seasons_v2_insert" on public.seasons_v2
  for insert with check (auth.uid() = user_id);
create policy "seasons_v2_update" on public.seasons_v2
  for update using (auth.uid() = user_id);

-- ─── season_teams ─────────────────────────────────────────────────────────────
-- All 30 AI teams + 1 human team per season.

create table if not exists public.season_teams (
  id           uuid  default gen_random_uuid() primary key,
  season_id    uuid  references public.seasons_v2(id) on delete cascade not null,
  team_slug    text  not null,
  name         text  not null,
  conference   text  not null,    -- 'East' | 'West'
  ovr          integer not null default 80,
  is_human     boolean not null default false,
  wins         integer not null default 0,
  losses       integer not null default 0,
  points_for   integer not null default 0,
  points_against integer not null default 0
);

alter table public.season_teams enable row level security;

create policy "season_teams_select" on public.season_teams
  for select using (
    exists (
      select 1 from public.seasons_v2
      where seasons_v2.id = season_teams.season_id
        and seasons_v2.user_id = auth.uid()
    )
  );
create policy "season_teams_insert" on public.season_teams
  for insert with check (
    exists (
      select 1 from public.seasons_v2
      where seasons_v2.id = season_teams.season_id
        and seasons_v2.user_id = auth.uid()
    )
  );
create policy "season_teams_update" on public.season_teams
  for update using (
    exists (
      select 1 from public.seasons_v2
      where seasons_v2.id = season_teams.season_id
        and seasons_v2.user_id = auth.uid()
    )
  );

-- ─── season_games ─────────────────────────────────────────────────────────────
-- Schedule + results for every regular-season and playoff game.

create table if not exists public.season_games (
  id             uuid  default gen_random_uuid() primary key,
  season_id      uuid  references public.seasons_v2(id) on delete cascade not null,
  week           integer not null default 1,
  home_team_id   uuid  references public.season_teams(id) on delete cascade not null,
  away_team_id   uuid  references public.season_teams(id) on delete cascade not null,
  home_score     integer,
  away_score     integer,
  is_playoff     boolean not null default false,
  playoff_round  integer,           -- 0=play-in, 1=QF, 2=SF, 3=CF, 4=Finals
  series_game    integer,           -- 1–7 for best-of-7
  played_at      timestamptz
);

alter table public.season_games enable row level security;

create policy "season_games_select" on public.season_games
  for select using (
    exists (
      select 1 from public.seasons_v2
      where seasons_v2.id = season_games.season_id
        and seasons_v2.user_id = auth.uid()
    )
  );
create policy "season_games_insert" on public.season_games
  for insert with check (
    exists (
      select 1 from public.seasons_v2
      where seasons_v2.id = season_games.season_id
        and seasons_v2.user_id = auth.uid()
    )
  );
create policy "season_games_update" on public.season_games
  for update using (
    exists (
      select 1 from public.seasons_v2
      where seasons_v2.id = season_games.season_id
        and seasons_v2.user_id = auth.uid()
    )
  );

-- ─── player_season_stats ──────────────────────────────────────────────────────
-- Running totals per player per season (averages computed client-side ÷ gp).

create table if not exists public.player_season_stats (
  id          uuid  default gen_random_uuid() primary key,
  season_id   uuid  references public.seasons_v2(id) on delete cascade not null,
  team_id     uuid  references public.season_teams(id) on delete cascade not null,
  player_name text  not null,
  position    text  not null,
  gp          integer not null default 0,   -- games played
  pts_total   integer not null default 0,
  reb_total   integer not null default 0,
  ast_total   integer not null default 0,
  stl_total   integer not null default 0,
  blk_total   integer not null default 0,
  tov_total   integer not null default 0,
  min_total   integer not null default 0,
  fgm         integer not null default 0,
  fga         integer not null default 0,
  fg3m        integer not null default 0,
  fg3a        integer not null default 0,
  ftm         integer not null default 0,
  fta         integer not null default 0
);

alter table public.player_season_stats enable row level security;

create policy "player_season_stats_select" on public.player_season_stats
  for select using (
    exists (
      select 1 from public.seasons_v2
      where seasons_v2.id = player_season_stats.season_id
        and seasons_v2.user_id = auth.uid()
    )
  );
create policy "player_season_stats_insert" on public.player_season_stats
  for insert with check (
    exists (
      select 1 from public.seasons_v2
      where seasons_v2.id = player_season_stats.season_id
        and seasons_v2.user_id = auth.uid()
    )
  );
create policy "player_season_stats_update" on public.player_season_stats
  for update using (
    exists (
      select 1 from public.seasons_v2
      where seasons_v2.id = player_season_stats.season_id
        and seasons_v2.user_id = auth.uid()
    )
  );

-- ─── season_trades ────────────────────────────────────────────────────────────
-- Log of trades made during the trade window.

create table if not exists public.season_trades (
  id              uuid  default gen_random_uuid() primary key,
  season_id       uuid  references public.seasons_v2(id) on delete cascade not null,
  week            integer not null,
  offered_player  text  not null,
  received_player text  not null,
  cost_coins      integer not null default 80
);

alter table public.season_trades enable row level security;

create policy "season_trades_select" on public.season_trades
  for select using (
    exists (
      select 1 from public.seasons_v2
      where seasons_v2.id = season_trades.season_id
        and seasons_v2.user_id = auth.uid()
    )
  );
create policy "season_trades_insert" on public.season_trades
  for insert with check (
    exists (
      select 1 from public.seasons_v2
      where seasons_v2.id = season_trades.season_id
        and seasons_v2.user_id = auth.uid()
    )
  );
