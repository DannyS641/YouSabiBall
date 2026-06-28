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

## Phase 1 next steps
1. Supabase auth (anonymous → linked)
2. Server actions for `_recordRun` (move off client)
3. Leaderboard sync (real-time via Supabase Realtime)
4. PvP draft room (presence channel)
5. Season/league system (server-authoritative)
