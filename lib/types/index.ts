// ─── Positions & Tiers ────────────────────────────────────────────────────────

import type { SeasonSave } from '@/lib/sim/season';
export type { SeasonSave };

export type Position = 'PG' | 'SG' | 'SF' | 'PF' | 'C';
export const POSITIONS: Position[] = ['PG', 'SG', 'SF', 'PF', 'C'];

export type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Diamond' | 'Legend';
export type Difficulty = 'Rookie' | 'Pro' | 'Hall of Fame';

// ─── Card / Player ─────────────────────────────────────────────────────────────

export interface Card {
  name: string;
  team: string;
  pos:  Position;
  ovr:  number;
  tier?: Tier;
}

// ─── Roster ───────────────────────────────────────────────────────────────────

export type Roster = Record<Position, Card | null>;

export function emptyRoster(): Roster {
  return { PG: null, SG: null, SF: null, PF: null, C: null };
}

// ─── Teams (for bracket) ──────────────────────────────────────────────────────

export interface Team {
  name:    string;
  abbr:    string;
  rating:  number;
  isHuman: boolean;
  players?: Card[];   // only set on human team
  color?:  string;
  star?:   string;    // CPU star player name
  conf?:   'East' | 'West';
  seed?:   number;
}

// ─── Bracket ─────────────────────────────────────────────────────────────────

export interface MatchResult {
  winner: Team;
  sa:     number;   // score for team a
  sb:     number;   // score for team b
}

export interface Match {
  a:      Team | null;
  b:      Team | null;
  result: MatchResult | null;
}

export interface ConferenceRounds {
  qf: Match[];   // 4 quarterfinal matchups
  sf: Match[];   // 2 semifinal matchups
  cf: Match[];   // 1 conference final
}

export interface Bracket {
  teams:  Team[];
  east:   ConferenceRounds;
  west:   ConferenceRounds;
  finals: Match;
}

// ─── Play-by-play ─────────────────────────────────────────────────────────────

export interface PbpEntry {
  txt:   string;
  team:  'A' | 'B';
  color: string;
  tag:   string;   // e.g. "Q2 3:14"
}

// ─── Live game state ──────────────────────────────────────────────────────────

export interface CourtDot {
  l:     number;  // left %
  t:     number;  // top %
  label: string;
  color: string;
}

export interface PlayerOfGame {
  name:    string;
  pos:     Position;
  ovr:     number;
  pts:     number;
  ast:     number;
  reb:     number;
  team:    string;
  oppName: string;
  scoreA:  number;
  scoreB:  number;
  youWon:  boolean;
  tier:    Tier;
}

export interface LiveGame {
  aName:    string;
  bName:    string;
  aColor:   string;
  bColor:   string;
  scoreA:   number;
  scoreB:   number;
  targetA:  number;
  targetB:  number;
  idx:      number;
  total:    number;
  pbp:      PbpEntry[];
  ballSide: 'A' | 'B' | 'mid';
  done:     boolean;
  winnerName: string;
  aDots:    CourtDot[];
  bDots:    CourtDot[];
  roundName: string;
  pog?:     PlayerOfGame;
}

// ─── Economy / Save ───────────────────────────────────────────────────────────

export interface Stats {
  drafts:       number;
  runs:         number;
  wins:         number;
  titles:       number;
  bestRound:    number;
  maxWinStreak: number;
  topOvr:       number;
  pulls:        number;
  bestPull:     number;
  points:       number;
  hofTitle:     boolean;
}

// ─── Run history (Phase 6) ───────────────────────────────────────────────────
export interface RunRecord {
  date:       string;   // YYYY-MM-DD
  label:      string;   // "Conference Semis", "Champion!", etc.
  round:      number;   // wins count 0-4
  points:     number;   // points earned this run
  coins:      number;   // coins earned this run
  champion:   boolean;
  difficulty: string;
}

export interface Save {
  coins:            number;
  streak:           number;
  lastClaim:        string | null;
  badges:           string[];
  stats:            Stats;
  // Phase 2
  dailyChallenges:  DailyChallenge[];
  seasonPass:       SeasonPass;
  // Phase 6
  recentRuns:       RunRecord[];
  // Phase 9
  bestPulls:        Card[];   // top 10 ever by OVR, sorted desc
  // Phase 18
  favoritePlayers:  Record<string, number>;  // player name → draft count
  // Phase 21
  seenTips: string[];
  // Season Mode
  activeSeason: SeasonSave | null;
}

// ─── Badge ────────────────────────────────────────────────────────────────────

export interface BadgeDef {
  id:    string;
  name:  string;
  desc:  string;
  glyph: string;
  tier:  Tier;
  cond:  (save: Save) => boolean;
}

// ─── Leaderboard row ──────────────────────────────────────────────────────────

export interface LbEntry {
  name:      string;
  points:    number;
  titles:    number;
  games:     number;
  bestRound: number;
  isYou?:    boolean;
}

// ─── Streak node (UI) ────────────────────────────────────────────────────────

export interface StreakNode {
  day:  number;
  size: string;
  tag:  string;
  bg:   string;
  fg:   string;
  ring: string;
}

// ─── Day reward ───────────────────────────────────────────────────────────────

export interface DayReward {
  coins: number;
  pull:  'legend' | 'any' | false;
  label: string;
}

// ─── Slot (draft UI) ─────────────────────────────────────────────────────────

export interface Slot {
  pos:        Position;
  filled:     boolean;
  open:       boolean;
  last:       string;
  ovr:        number | '';
  labelColor: string;
  bg:         string;
  border:     string;
}

// ─── Match row (bracket UI) ──────────────────────────────────────────────────

export interface MatchRow {
  showWin:    boolean;
  showNormal: boolean;
  showTbd:    boolean;
  name:       string;
  seed:       number | string;
  score:      number | string;
  dot:        string;
}

// ─── Phase 2: Daily Challenges & Season Pass ─────────────────────────────────

export type ChallengeCategory = 'draft' | 'run' | 'game' | 'economy';

export interface ChallengeDef {
  id:       string;
  name:     string;
  desc:     string;
  xp:       number;
  coins:    number;
  category: ChallengeCategory;
}

export interface DailyChallenge {
  defId:     string;
  date:      string;   // YYYY-MM-DD
  completed: boolean;
}

export interface SeasonPass {
  season:  number;
  xp:      number;
  level:   number;     // 1-30
  claimed: number[];   // levels where reward was claimed
}

export interface SeasonReward {
  level:  number;
  label:  string;
  coins:  number;
  badge?: string;
}

// ─── Phase 4: Social ──────────────────────────────────────────────────────────

export interface FriendWithStats {
  friendshipId: string;
  id:     string;
  name:   string;
  points: number;
  titles: number;
  games:  number;
}

export interface PendingRequest {
  friendshipId: string;
  id:   string;
  name: string;
}

export interface SearchProfile {
  id:   string;
  name: string;
}

export interface IncomingChallenge {
  id:           string;
  from:         string;
  targetPoints: number;
  difficulty:   string;
  expiresAt:    string;
  status:       'pending' | 'beaten';
}

export interface OutgoingChallenge {
  id:           string;
  to:           string;
  targetPoints: number;
  difficulty:   string;
  expiresAt:    string;
  status:       'pending' | 'beaten';
}

