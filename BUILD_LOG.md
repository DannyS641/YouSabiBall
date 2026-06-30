# HARDWOOD — Phase 0 Build Log

## Status: Complete ✅

All Phase 0 deliverables are done. The app runs, TypeScript is clean, and 18/18 unit tests pass.

---

## What was built

### Core infrastructure
- **Next.js 16.2.9** App Router + TypeScript strict mode
- **Tailwind v4** CSS-first config via `@theme` in `globals.css` (no `tailwind.config.js`)
- **Plus Jakarta Sans** + **IBM Plex Mono** via `next/font/google`
- **Vitest** in node environment targeting `lib/**/__tests__/`
- **Supabase** stub wired at `supabase/client.ts` — unused in Phase 0

### `/lib/types` — all shared domain types
`Position`, `Tier`, `Difficulty`, `Card`, `Roster`, `Team`, `Match`, `Bracket`, `LiveGame`, `Save`, `Stats`, `LbEntry`, `StreakNode`, `DayReward`, `BadgeDef`, `PlayerOfGame`, `PbpEntry`, `CourtDot`, `MatchResult`, `ConferenceRounds`, `Slot`, `MatchRow`

### `/lib/sim` — pure TypeScript game engine (zero React deps)
| File | What it does |
|------|-------------|
| `decide.ts` | Elo-style win probability with `diffBias` and `upsetFactor` |
| `events.ts` | Play-by-play generation, court dots, Player of the Game |
| `bracket.ts` | 16-team bracket construction, round simulation, `scoreRun` |
| `economy.ts` | Save/load, `tierFor`, daily rewards, streak nodes, badge checks |
| `badges.ts` | 12 badge definitions |
| `index.ts` | Central re-export barrel |

**Tests:** 18/18 pass (3 files: decide, events, bracket)

### `/data` — static game data
- `players.ts` — 50 NBA player cards + `SCORERS_BY_TEAM` lookup
- `cpuTeams.ts` — 15 CPU teams
- `seedLeaderboard.ts` — 14 seeded leaderboard entries

### `/store/gameStore.ts` — Zustand state machine
Holds all transient UI state across 7 phases: `register → home → draft → court → bracket → game → leaderboard`. Key design decisions:
- `_recordRun` uses `isHuman` flag (not object identity) to count wins in cloned brackets
- `_endGame` reads from `live.targetA/B` — never re-calls `decide()`
- All economy mutations (streaks, badges, coins) persist to `localStorage` immediately

### Components
- `GameRoot.tsx` — phase router + global overlay host
- `Navbar.tsx` — coin HUD + leaderboard link + profile chip
- `screens/RegisterScreen.tsx` — name input + difficulty selector + returning profiles
- `screens/HomeScreen.tsx` — stats HUD + streak calendar + card spin
- `screens/DraftScreen.tsx` — slot grid + CSS reel spin machine
- `screens/CourtScreen.tsx` — basketball court SVG + player dots
- `screens/BracketScreen.tsx` — round-by-round bracket + champion reveal
- `screens/LiveGameScreen.tsx` — auto-ticking scoreboard + PBP feed + POG card
- `screens/LeaderboardScreen.tsx` — ranked table with medal colors
- `RewardToast.tsx` — auto-dismissing streak/badge toast
- `HighlightCard.tsx` — full-screen run summary with share button

---

## Key guardrails preserved
- **No real money** — fake `coins` only, no payment integration
- **No multiplayer server trust** — `_recordRun` runs client-side in Phase 0; Phase 1 will move outcome recording to a server action backed by Supabase RLS
- **Supabase wired but inert** — all saves use `localStorage` until Phase 1

---

---

## Season Mode — S1 ✅ (2026-06-30)

### Removed
- Phase 20 "5-run season" system: `runSeason` from `Save` type and `defaultSave`, season tracking block from `_recordRun`, `pendingSeasonEnd` state + `claimSeasonEnd` action, Season Progress card from HomeScreen, `SeasonEndModal` from BracketScreen.

### Added
**`supabase/migrations/006_season_mode.sql`**
Five new tables, all with RLS via `seasons_v2.user_id = auth.uid()`:
- `seasons_v2` — one row per user per season (length, status, difficulty, champion, coins awarded)
- `season_teams` — 30 AI + 1 human team per season (conf, OVR, W/L, PF/PA)
- `season_games` — schedule + results (regular season + playoff, incl. series_game for best-of-7)
- `player_season_stats` — running totals per player (pts/reb/ast/stl/blk/tov/fgm/fga/fg3m/fg3a/ftm/fta/min)
- `season_trades` — trade window log

**`lib/sim/season.ts`** (pure / deterministic)
- `buildSeasonTeams()` — creates 30-team roster, replaces lowest same-conf team with human
- `generateSchedule()` — seeded balanced round-robin with home/away assignment
- `simulateGame()` — calls existing `decide()` + generates synthetic per-player box scores
- `simulateSeason()` — applies all schedule slots, updates team W/L/PF/PA
- `computeStandings()` — returns sorted East/West `StandingsRow[]`
- `buildPlayInFull()` — sets up 7v8 / 9v10 per conference
- `resolvePlayIn()` — fully sims the three play-in games per conference
- `createSeries / simSeriesGame / simFullSeries` — best-of-7 with 2-2-1-1-1 home-court format
- `buildPlayoffBracket / simPlayoffRound / buildNextRound` — 8-team playoff bracket per conference

TypeScript: **0 errors** after all changes.

### Next: S2
`SeasonHubScreen` — pick length (Short 14 / Standard 28 / Full 82), pick difficulty, view projected standings, start button → triggers regular-season simulation and shows live standings.
