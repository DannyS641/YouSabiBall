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

### Next: S2 ✅ (2026-06-30)
`SeasonHubScreen` with two internal views:

**Setup view:** pick season length (Short 14 / Standard 28 / Full 82), conference (East/West), difficulty (Rookie/Pro/HoF). Human OVR pulled from `save.stats.topOvr`. "Simulate Season →" button triggers `startSeason()`.

**Standings view:** East + West tables with seed coloring (green=playoff 1–6, amber=play-in 7–10, grey=eliminated). Human row highlighted in purple with star. Top banner shows human team's final W/L/PCT/DIFF. Coins awarded (+5 per win) immediately. "Advance to Trade Window" button (disabled, coming S3).

Navigation: "Season Mode" button added to HomeScreen header. "Season" added to desktop Navbar + "🏟️ Season" in mobile menu.

TypeScript: **0 errors**.

### S3 ✅ (2026-06-30)
**Trade Window** — mid-season player market after standings are revealed.

- `startSeason()` now builds `seasonRoster` (5 real player cards, one per position, OVR-matched to the human's topOvr from their save)
- New state: `seasonRoster`, `seasonTradesLeft` (max 3), `seasonTradeLog`, `seasonTradeTarget`
- New actions: `advanceToTradeWindow`, `openTradeModal`, `closeTradeModal`, `executeTrade`, `skipTradeWindow`
- `executeTrade(pos, target)`: deducts 80 coins, swaps the player, recalculates team OVR across `seasonTeams`, logs the trade, closes modal
- **TradeWindowView**: shows 5 starter cards (tap to open trade modal), trade log of completed swaps, "Continue to Play-In" CTA
- **TradeModal**: bottom-sheet on mobile, centered modal on desktop; generates 4 fresh candidates from full PLAYERS pool per position on mount; shows OVR diff (+/−) vs current player
- "Enter Trade Window →" button in StandingsView now live (was disabled in S2)
- `seasonStatus` extended to include `'trade_window' | 'play_in'`

TypeScript: **0 errors**.

### S4 ✅ (2026-06-30)
**Play-In Tournament UI**

- `playInBracket` and `playInSeeds` added to store state (initial: `null`)
- `skipTradeWindow` now calls `buildPlayInFull()` to build the bracket before transitioning to `play_in`
- `simPlayIn()` action: calls `resolvePlayIn()`, then builds the 8-team playoff field (top 6 + play-in seeds 7/8 per conf), stores in `playInSeeds`
- `advanceToPlayoffs()` action: transitions `seasonStatus → 'playoffs'`
- **`PlayInView`**: full play-in screen with:
  - Human status banner: "clinched" (seed 1–6) · "you're in the play-in" (7–10) · "eliminated" (11–15)
  - `PlayInConfCard` per conference: shows Game 1 (7v8), Game 2 (9v10), Game 3 (loser vs winner); winner highlighted in green; seed 7/8 result panel after sim
  - Post-sim outcome banner: human advanced or eliminated
  - Playoff field grid (8 per conf with human highlighted) after sim resolves
  - "Simulate Play-In →" CTA before sim; "Enter Playoffs →" / "Watch Playoffs →" after

TypeScript: **0 errors**.

### S5 ✅ (2026-06-30)
**Season Playoffs**

- `playoffBracket: PlayoffBracket | null` added to store state (initial: `null`; reset on `viewSeasonHub`)
- `advanceToPlayoffs()` now builds the bracket via `buildPlayoffBracket(playInSeeds.east, playInSeeds.west)` before switching `seasonStatus → 'playoffs'`
- `simNextPlayoffRound()`: advances exactly one stage per call — resolves the current round if unresolved, otherwise builds + sims the next round (`buildNextRound` + `simPlayoffRound`) for both conferences in lockstep. Once both conference finals resolve, builds and sims the NBA Finals (`simFullSeries`) in the same click and sets `champion`. Awards +250 coins and +1 title to the save if the human wins it all.
- **`PlayoffsView`**: full bracket screen with:
  - Human fate banner (`getHumanFate`) — eliminated (with stage + opponent), still alive (with next stage), or in the Finals
  - `ConferenceBracket` per conference — renders each completed round (QF/SF/CF) as a `SeriesCard` showing both teams, series score, and winner once resolved
  - `FinalsCard` — dark "NBA Finals" panel with large score readout once the conference finals are done
  - Champion banner — gold for a human title, neutral for a CPU champion
  - "Simulate {stage} →" CTA that advances one round per click (label updates per stage); replaced by "← Home" only once a champion is crowned (Season Awards screen arrives in S6)
- Verified with a temporary vitest smoke test simulating season → play-in → 6 playoff-round clicks end-to-end (full bracket resolves, champion crowned) — test removed after passing.

TypeScript: **0 errors**.

### Next: S6
Stats screen (Standings + League Leaders + My Team tabs) + Season Awards + economy payouts + leaderboard write.
