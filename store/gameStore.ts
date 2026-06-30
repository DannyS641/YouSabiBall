'use client';

import { create } from 'zustand';
import type {
  Position, Card, Roster, Bracket, LiveGame,
  Save, LbEntry, StreakNode, Match, Team,
  FriendWithStats, PendingRequest, IncomingChallenge, OutgoingChallenge,
  RunRecord,
} from '@/lib/types';
import { POSITIONS, emptyRoster } from '@/lib/types';
import { PLAYERS, SCORERS_BY_TEAM } from '@/data/players';
import { CPU_TEAMS } from '@/data/cpuTeams';
import { SEED_LEADERBOARD } from '@/data/seedLeaderboard';
import {
  decide,
  buildBracket, roundMatches, wireNext, champExtra, simRound, findHumanMatch, scoreRun,
  buildEvents, buildCourtDots, computePog, eventToPbp,
  defaultSave, tierFor, TIER_COLORS, dayReward, buildStreakNodes, checkBadges,
  todayStr, yesterdayStr,
  applyChallengeEvent, getDailyChallenges, claimSeasonReward,
  DRAFT_TOKENS, PACKS,
  drawPerks,
  drawUpgrades,
  generateNickname,
  buildSeasonTeams,
  generateSchedule,
  simulateSeason,
  computeStandings,
  buildPlayInFull,
  resolvePlayIn,
  buildPlayoffBracket,
  simPlayoffRound,
  buildNextRound,
  simFullSeries,
} from '@/lib/sim';
import type { GameEvent, EarnedBadge, ChallengeAward, DraftTokenTier, PackType, Perk, Upgrade, SeasonLength, SeasonTeam, GameSlot, StandingsRow, PlayInBracket, PlayoffBracket, SeriesState } from '@/lib/sim';
import { recordRunServer, syncSave, fetchLeaderboard } from '@/app/actions/game';

// ─── Constants ────────────────────────────────────────────────────────────────

const DIFF_SETTINGS = {
  'Rookie':       { bias: 5,  mult: 0.7  },
  'Pro':          { bias: 0,  mult: 1.0  },
  'Hall of Fame': { bias: -5, mult: 1.45 },
} as const;

const LB_KEY      = 'hardwood_lb_v2';
const PROFILE_KEY = 'hardwood_profiles_v2';
const SAVE_KEY    = 'hardwood_save_v1';

export type Phase = 'register' | 'home' | 'draft' | 'court' | 'bracket' | 'game' | 'leaderboard' | 'challenges' | 'lobby' | 'mp_room' | 'friends' | 'history' | 'shop' | 'collection' | 'settings' | 'season_hub';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function fmt(n: number): string { return Math.round(n).toLocaleString('en-US'); }
function initials(name: string): string {
  return (name || '').trim().split(/\s+/).map(w => w[0] || '').join('').slice(0, 3).toUpperCase() || 'GM';
}
function clone<T>(o: T): T { return JSON.parse(JSON.stringify(o)); }

function loadLB(): LbEntry[] {
  if (typeof window === 'undefined') return SEED_LEADERBOARD.map(x => ({ ...x }));
  try {
    const raw = localStorage.getItem(LB_KEY);
    const parsed: LbEntry[] = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed) && parsed.length) return [...parsed].sort((a, b) => b.points - a.points);
  } catch { /* ignore */ }
  const seeded = SEED_LEADERBOARD.map(x => ({ ...x }));
  try { localStorage.setItem(LB_KEY, JSON.stringify(seeded)); } catch { /* ignore */ }
  return seeded;
}
function saveLB(lb: LbEntry[]): void {
  try { localStorage.setItem(LB_KEY, JSON.stringify(lb)); } catch { /* ignore */ }
}
function loadProfiles(): string[] {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || '[]'); } catch { return []; }
}
function saveProfiles(p: string[]): void {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}
function loadSave(name: string): Save {
  try {
    const all = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') as Record<string, Save>;
    const def = defaultSave();
    const x   = all[name];
    if (!x) return def;
    return {
      ...def, ...x,
      stats:           { ...def.stats,      ...(x.stats ?? {}) },
      seasonPass:      { ...def.seasonPass, ...(x.seasonPass ?? {}) },
      dailyChallenges: x.dailyChallenges ?? [],
      recentRuns:      x.recentRuns ?? [],
      bestPulls:       x.bestPulls ?? [],
      favoritePlayers: x.favoritePlayers ?? {},
      seenTips:        x.seenTips ?? [],
    };
  } catch { return defaultSave(); }
}
function persistSave(name: string, save: Save): void {
  try {
    const all = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') as Record<string, Save>;
    all[name] = save;
    localStorage.setItem(SAVE_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

// ─── State shape ──────────────────────────────────────────────────────────────

interface GameState {
  // Navigation
  phase:      Phase;
  prevPhase:  Phase;

  // Auth (null = guest / Phase 0 mode)
  authUser: { id: string; email: string } | null;

  // Player identity
  userName:   string;
  difficulty: 'Rookie' | 'Pro' | 'Hall of Fame';
  profiles:   string[];
  save:       Save | null;

  // Register
  nameInput:  string;

  // Draft
  roster:       Roster;
  available:    Card[];
  reelItems:    Card[];
  spinning:     boolean;
  lastPick:     Card | null;
  draftToken:   DraftTokenTier;
  rerollsUsed:  number;

  // Shop
  packResult:  Card[] | null;

  // Perk (Phase 8)
  pendingPerks: Perk[];     // 3 drawn perks waiting for selection
  activePerk:   Perk | null; // chosen perk for current run

  // Between-round upgrades (Phase 10)
  pendingUpgrades: Upgrade[];   // 3 drawn upgrades waiting for selection
  activeUpgrades:  Upgrade[];   // all chosen upgrades this run

  // Bracket
  bracket:      Bracket | null;
  simStep:      number;
  champion:     Team | null;
  mvp:          string;
  pointsEarned: number;
  coinsEarned:  number;
  runLabel:     string;
  teamNickname: string;

  // Live game
  live:        LiveGame | null;
  _events:     GameEvent[];
  _liveHuman:  Team | null;
  _liveOpp:    Team | null;
  _liveRound:  number;
  _liveMatch:  Match | null;
  _diffBias:   number;
  _diffMult:   number;
  _recorded:   boolean;

  // Economy / HUD
  leaderboard:   LbEntry[];
  lastPull:      (Card & { tier: string }) | null;
  claimToast:    { coins: number; label: string; pull: null | { name: string; ovr: number; team: string; tier: string } } | null;
  badgeToast:    EarnedBadge[];
  showHighlight: boolean;
  shareCopied:   boolean;
  challengeAward: ChallengeAward | null;

  // Multiplayer lobby
  mpRoomId:    string | null;
  mpRole:      'host' | 'guest' | null;
  mpOpponent:  string | null;   // opponent's display name
  mpResult:    { winner: 'host' | 'guest'; hostScore: number; guestScore: number } | null;

  // Season Mode (S2+)
  seasonLength:      SeasonLength;
  seasonConference:  'East' | 'West';
  seasonTeams:       SeasonTeam[];
  seasonSchedule:    GameSlot[];
  seasonStandings:   { east: StandingsRow[]; west: StandingsRow[] } | null;
  seasonStatus:      'setup' | 'standings' | 'trade_window' | 'play_in' | 'playoffs';
  seasonRoster:      Card[];
  seasonTradesLeft:  number;
  seasonTradeLog:    { pos: string; offered: string; received: string }[];
  seasonTradeTarget: Position | null;
  playInBracket:     PlayInBracket | null;
  playInSeeds:       { east: SeasonTeam[]; west: SeasonTeam[] } | null;
  playoffBracket:    PlayoffBracket | null;

  // Social (Phase 4)
  friends:              FriendWithStats[];
  pendingRequests:      PendingRequest[];
  incomingChallenges:   IncomingChallenge[];
  outgoingChallenges:   OutgoingChallenge[];
  friendsLoading:       boolean;
  activeChallengeId:    string | null;
  activeChallengeTarget: number | null;

  // Public actions
  init:               () => void;
  setNameInput:       (v: string) => void;
  setDifficulty:      (d: 'Rookie' | 'Pro' | 'Hall of Fame') => void;
  setAuthUser:        (u: { id: string; email: string } | null) => void;
  play:               (name: string) => void;
  pickProfile:        (name: string) => void;
  startNewRun:        () => void;
  spin:               (onAnimate: (items: Card[], winIdx: number) => void) => void;
  rerollPosition:     (pos: Position, onAnimate: (items: Card[], winIdx: number) => void) => void;
  commitSpin:         (winner: Card) => void;
  viewTeam:           () => void;
  enterPlayoffs:      () => void;
  simNext:            () => void;
  simAll:             () => void;
  playRound:          () => void;
  tickGame:           () => void;
  skipGame:           () => void;
  continueAfterGame:  () => void;
  claimStreak:        () => void;
  spinCard:           () => void;
  closeToast:          () => void;
  goHome:              () => void;
  logout:              () => void;
  viewLeaderboard:     () => void;
  viewChallenges:      () => void;
  claimSeasonLevel:    (level: number) => void;
  enterLobby:          () => void;
  setMpRoom:           (id: string, role: 'host' | 'guest', opponent: string | null) => void;
  setMpResult:         (r: { winner: 'host' | 'guest'; hostScore: number; guestScore: number }) => void;
  showHighlightCard:   () => void;
  closeHighlightCard:  () => void;
  setShareCopied:      (v: boolean) => void;
  viewSeasonHub:          () => void;
  setSeasonLength:        (l: SeasonLength) => void;
  setSeasonConference:    (c: 'East' | 'West') => void;
  startSeason:            () => void;
  advanceToTradeWindow:   () => void;
  openTradeModal:         (pos: Position) => void;
  closeTradeModal:        () => void;
  executeTrade:           (pos: Position, target: Card) => void;
  skipTradeWindow:        () => void;
  simPlayIn:              () => void;
  advanceToPlayoffs:      () => void;
  simNextPlayoffRound:    () => void;
  viewFriends:         () => void;
  viewHistory:         () => void;
  viewShop:            () => void;
  viewCollection:      () => void;
  viewSettings:        () => void;
  buyDraftToken:       (tier: 'gold' | 'diamond') => void;
  openPack:            (packType: PackType) => void;
  closePack:           () => void;
  tradePosition:       (pos: Position) => void;
  dismissTip:          (id: string) => void;
  openPerkModal:       () => void;
  choosePerk:          (perk: Perk | null) => void;  // null = skip
  chooseUpgrade:       (upgrade: Upgrade | null) => void; // null = skip
  loadFriends:         () => Promise<void>;
  startChallenge:      (challengeId: string, target: number) => void;

  // Internal helpers (called within other actions via get())
  _endGame:   () => void;
  _recordRun: (b: Bracket, diffMult: number, userName: string) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'register', prevPhase: 'register',
  authUser: null,
  userName: '', difficulty: 'Pro', profiles: [], save: null,
  nameInput: '',
  roster: emptyRoster(), available: [], reelItems: [], spinning: false, lastPick: null,
  draftToken: 'standard', rerollsUsed: 0, packResult: null,
  pendingPerks: [], activePerk: null,
  pendingUpgrades: [], activeUpgrades: [],
  bracket: null, simStep: 0, champion: null, mvp: '',
  pointsEarned: 0, coinsEarned: 0, runLabel: '', teamNickname: '',
  live: null, _events: [], _liveHuman: null, _liveOpp: null,
  _liveRound: 0, _liveMatch: null,
  _diffBias: 0, _diffMult: 1, _recorded: false,
  seasonLength: 'standard', seasonConference: 'East',
  seasonTeams: [], seasonSchedule: [], seasonStandings: null, seasonStatus: 'setup',
  seasonRoster: [], seasonTradesLeft: 3, seasonTradeLog: [], seasonTradeTarget: null,
  playInBracket: null, playInSeeds: null, playoffBracket: null,
  leaderboard: [], lastPull: null,
  claimToast: null, badgeToast: [], showHighlight: false, shareCopied: false,
  challengeAward: null,
  mpRoomId: null, mpRole: null, mpOpponent: null, mpResult: null,
  friends: [], pendingRequests: [], incomingChallenges: [], outgoingChallenges: [], friendsLoading: false,
  activeChallengeId: null, activeChallengeTarget: null,

  // ── Init ────────────────────────────────────────────────────────────────────
  init: () => set({ leaderboard: loadLB(), profiles: loadProfiles() }),

  setNameInput:  v => set({ nameInput: v }),
  setDifficulty: d => set({ difficulty: d }),
  setAuthUser:   u => set({ authUser: u }),

  // ── Begin a session ─────────────────────────────────────────────────────────
  play: (rawName: string) => {
    const { profiles } = get();
    const name = (rawName && rawName.trim()) || 'You';
    const newProfiles = profiles.includes(name) ? profiles : [name, ...profiles].slice(0, 4);
    saveProfiles(newProfiles);
    const save = loadSave(name);
    set({
      userName: name, profiles: newProfiles, save,
      nameInput: '', lastPull: null, claimToast: null, badgeToast: [],
      roster: emptyRoster(), available: [...PLAYERS], reelItems: [],
      spinning: false, lastPick: null,
      bracket: null, simStep: 0, champion: null, mvp: '',
      pointsEarned: 0, coinsEarned: 0, runLabel: '', live: null, _recorded: false,
      phase: 'home',
    });
  },

  pickProfile: (name: string) => get().play(name),

  // ── New playoff run ──────────────────────────────────────────────────────────
  startNewRun: () => set({
    roster: emptyRoster(), available: [...PLAYERS], reelItems: [],
    spinning: false, lastPick: null, rerollsUsed: 0,
    bracket: null, simStep: 0, champion: null, mvp: '',
    pointsEarned: 0, coinsEarned: 0, runLabel: '', teamNickname: '', live: null, _recorded: false,
    activeChallengeId: null, activeChallengeTarget: null,
    pendingPerks: [], activePerk: null,
    pendingUpgrades: [], activeUpgrades: [],
    phase: 'draft',
  }),

  // ── Draft spin ───────────────────────────────────────────────────────────────
  spin: (onAnimate) => {
    const { spinning, roster, available, draftToken } = get();
    if (spinning || POSITIONS.every(p => roster[p])) return;

    const open    = POSITIONS.filter(p => !roster[p]);
    const minOvr  = draftToken !== 'standard' ? DRAFT_TOKENS[draftToken].minOvr : 0;
    const boosted = available.filter(p => open.includes(p.pos) && p.ovr >= minOvr);
    // fall back to full pool per position if boosted pool is empty for that position
    const elig    = boosted.length ? boosted : available.filter(p => open.includes(p.pos));
    if (!elig.length) return;

    const winner = elig[Math.floor(Math.random() * elig.length)];
    const N      = 46;
    const winIdx = N - 6;
    const items: Card[] = Array.from({ length: N }, (_, i) =>
      i === winIdx ? winner : elig[Math.floor(Math.random() * elig.length)]
    );

    set({ reelItems: items, spinning: true, lastPick: null });
    onAnimate(items, winIdx);
  },

  commitSpin: (winner: Card) => {
    const { roster, available, save, userName } = get();
    const newRoster = { ...roster, [winner.pos]: winner };
    set({
      roster:    newRoster,
      available: available.filter(c => c !== winner),
      spinning:  false,
      lastPick:  winner,
    });

    // Update bestPulls (top 10 unique by name, OVR desc) + fire draft_complete challenge
    if (save) {
      const existing  = save.bestPulls ?? [];
      const merged    = [...existing.filter(c => c.name !== winner.name), winner]
        .sort((a, b) => b.ovr - a.ovr)
        .slice(0, 10);
      const favs      = { ...(save.favoritePlayers ?? {}) };
      favs[winner.name] = (favs[winner.name] ?? 0) + 1;
      const withPulls = { ...save, bestPulls: merged, favoritePlayers: favs };

      if (POSITIONS.every(p => newRoster[p])) {
        const cards     = POSITIONS.map(p => newRoster[p]!);
        const teamAvg   = Math.round(cards.reduce((s, c) => s + c.ovr, 0) / cards.length);
        const topOvr    = Math.max(...cards.map(c => c.ovr));
        const goldCount = cards.filter(c => c.ovr >= 87).length;
        const award     = applyChallengeEvent(withPulls, { type: 'draft_complete', teamAvg, topOvr, goldCount });
        const { save: saved, newly } = checkBadges(award.save);
        persistSave(userName, saved);
        set({ save: saved, challengeAward: award.completedIds.length ? award : null, badgeToast: newly, teamNickname: generateNickname(newRoster) });
      } else {
        persistSave(userName, withPulls);
        set({ save: withPulls });
      }
    }
  },

  // ── Draft re-roll ─────────────────────────────────────────────────────────────
  rerollPosition: (pos, onAnimate) => {
    const { roster, available, save, userName, spinning, rerollsUsed } = get();
    if (spinning) return;

    const prev = roster[pos];
    if (!prev) return;

    const REROLL_COST = 30;
    const isFree = rerollsUsed === 0;
    if (!isFree && (!save || save.coins < REROLL_COST)) return;

    let sv = clone(save!);
    if (!isFree) {
      sv.coins -= REROLL_COST;
      persistSave(userName, sv);
    }

    set({
      roster:      { ...roster, [pos]: undefined as unknown as Card },
      available:   [...available, prev],
      rerollsUsed: rerollsUsed + 1,
      save:        !isFree ? sv : save,
    });

    get().spin(onAnimate);
  },

  // ── Tutorial tip dismiss (Phase 21) ─────────────────────────────────────────
  dismissTip: (id) => {
    const { save, userName } = get();
    if (!save) return;
    const seen = [...(save.seenTips ?? [])];
    if (seen.includes(id)) return;
    seen.push(id);
    const sv = clone(save);
    sv.seenTips = seen;
    persistSave(userName, sv);
    set({ save: sv });
  },

  // ── Post-draft trade ────────────────────────────────────────────────────────
  tradePosition: (pos) => {
    const { roster, available, save, userName } = get();
    const TRADE_COST = 80;
    if (!save || save.coins < TRADE_COST) return;
    const prev = roster[pos];
    if (!prev) return;

    const pool = available.filter(c => c.pos === pos);
    if (!pool.length) return;

    const picked = pool[Math.floor(Math.random() * pool.length)];
    const newRoster   = { ...roster, [pos]: picked };
    const newAvailable = [...available.filter(c => c !== picked), prev];
    let sv = clone(save);
    sv.coins -= TRADE_COST;
    persistSave(userName, sv);
    set({ roster: newRoster, available: newAvailable, save: sv, teamNickname: generateNickname(newRoster) });
  },

  viewTeam: () => set({ phase: 'court' }),

  // ── Perk selection (Phase 8) ─────────────────────────────────────────────────
  openPerkModal: () => set({ pendingPerks: drawPerks() }),

  choosePerk: (perk) => {
    const { roster, userName, difficulty, save, pendingPerks } = get();
    if (!pendingPerks.length) return;   // guard: only callable after openPerkModal

    // Deduct coins if perk has a cost
    let sv = clone(save!);
    if (perk && perk.cost > 0) {
      if (sv.coins < perk.cost) return;  // can't afford — UI should prevent this
      sv.coins -= perk.cost;
    }

    const players = POSITIONS.map(p => roster[p]!);
    const rating  = Math.round(players.reduce((a, b) => a + b.ovr, 0) / players.length);
    const diff    = DIFF_SETTINGS[difficulty];
    const perkBoost = perk ? perk.boost : 0;

    const human: Team = {
      name: userName, abbr: initials(userName), rating,
      isHuman: true, players, color: '#7A3FF2',
    };
    const bracket = buildBracket(human, CPU_TEAMS.slice(0, 15).map(c => ({ ...c })));

    sv.stats.drafts++;
    sv.stats.topOvr = Math.max(sv.stats.topOvr, Math.max(...players.map(p => p.ovr)));
    const { save: saved, newly } = checkBadges(sv);
    persistSave(userName, saved);

    set({
      bracket, simStep: 0, champion: null, mvp: '',
      pointsEarned: 0, coinsEarned: 0, runLabel: '', _recorded: false,
      draftToken: 'standard',
      pendingPerks: [], activePerk: perk,
      pendingUpgrades: [], activeUpgrades: [],
      _diffBias: diff.bias + perkBoost, _diffMult: diff.mult,
      _liveHuman: human, save: saved, badgeToast: newly,
      phase: 'bracket',
    });
  },

  // ── Enter playoffs (direct path — kept for multiplayer/challenge flows) ────────
  enterPlayoffs: () => {
    const { roster, userName, difficulty, save } = get();
    const players = POSITIONS.map(p => roster[p]!);
    const rating  = Math.round(players.reduce((a, b) => a + b.ovr, 0) / players.length);
    const diff    = DIFF_SETTINGS[difficulty];

    const human: Team = {
      name: userName, abbr: initials(userName), rating,
      isHuman: true, players, color: '#7A3FF2',
    };
    const bracket = buildBracket(human, CPU_TEAMS.slice(0, 15).map(c => ({ ...c })));

    let sv = clone(save!);
    sv.stats.drafts++;
    sv.stats.topOvr = Math.max(sv.stats.topOvr, Math.max(...players.map(p => p.ovr)));
    const { save: saved, newly } = checkBadges(sv);
    persistSave(userName, saved);

    set({
      bracket, simStep: 0, champion: null, mvp: '',
      pointsEarned: 0, coinsEarned: 0, runLabel: '', _recorded: false,
      draftToken: 'standard', pendingPerks: [], activePerk: null,
      _diffBias: diff.bias, _diffMult: diff.mult,
      _liveHuman: human, save: saved, badgeToast: newly,
      phase: 'bracket',
    });
  },

  // ── Sim one round ────────────────────────────────────────────────────────────
  simNext: () => {
    const { bracket, simStep, _diffBias, _diffMult, _recorded, userName } = get();
    if (!bracket || simStep >= 4) return;

    const b = clone(bracket) as Bracket;
    simRound(b, simStep, { diffBias: _diffBias });
    wireNext(b, simStep);

    let extra: Partial<GameState> = {};
    if (simStep === 3) extra = champExtra(b) as Partial<GameState>;

    const newStep = simStep + 1;

    // Offer upgrade if human won their match and run is not over
    let upgradeExtra: Partial<GameState> = {};
    if (newStep < 4) {
      const humanMatch = roundMatches(b, simStep).find(m => m.a?.isHuman || m.b?.isHuman);
      if (humanMatch?.result?.winner.isHuman) {
        upgradeExtra = { pendingUpgrades: drawUpgrades() };
      }
    }

    set({ bracket: b, simStep: newStep, live: null, showHighlight: false, ...extra, ...upgradeExtra });
    if (newStep === 4 && !_recorded) get()._recordRun(b, _diffMult, userName);
  },

  simAll: () => {
    const { bracket, simStep, _diffBias, _diffMult, userName } = get();
    if (!bracket) return;

    const b = clone(bracket) as Bracket;
    let extra: Partial<GameState> = {};
    for (let s = simStep; s < 4; s++) {
      simRound(b, s, { diffBias: _diffBias });
      wireNext(b, s);
      if (s === 3) extra = champExtra(b) as Partial<GameState>;
    }
    set({ bracket: b, simStep: 4, live: null, ...extra });
    get()._recordRun(b, _diffMult, userName);
  },

  // ── Play a round live ────────────────────────────────────────────────────────
  playRound: () => {
    const { bracket, simStep, _diffBias, _liveHuman } = get();
    if (!bracket || simStep >= 4) return;

    const m = findHumanMatch(bracket, simStep);
    if (!m) { get().simNext(); return; }

    const human = m.a?.isHuman ? m.a : m.b!;
    const opp   = m.a?.isHuman ? m.b! : m.a!;
    const d     = decide(human, opp, { diffBias: _diffBias });
    const { aDots, bDots } = buildCourtDots(human);
    const events = buildEvents(human, opp, d.sa, d.sb, SCORERS_BY_TEAM);
    const ROUND_NAMES = ['First Round', 'Conference Semifinals', 'Conference Finals', 'NBA Finals'];

    set({
      phase: 'game',
      _events:    events,
      _liveOpp:   opp,
      _liveRound: simStep,
      _liveMatch: m,
      live: {
        aName: human.name, bName: opp.name,
        aColor: human.color ?? '#7A3FF2', bColor: opp.color ?? '#E2622C',
        scoreA: 0, scoreB: 0,
        targetA: d.sa, targetB: d.sb,
        idx: 0, total: events.length,
        pbp: [], ballSide: 'mid', done: false, winnerName: '',
        aDots, bDots, roundName: ROUND_NAMES[simStep] ?? `Round ${simStep + 1}`,
      },
      showHighlight: false,
    });
  },

  tickGame: () => {
    const { live, _events } = get();
    if (!live) return;
    if (live.done || live.idx >= _events.length) { get()._endGame(); return; }

    const ev    = _events[live.idx];
    const scoreA = live.scoreA + (ev.team === 'A' ? ev.pts : 0);
    const scoreB = live.scoreB + (ev.team === 'B' ? ev.pts : 0);
    const entry = eventToPbp(ev, live.idx, live.total, live.aColor);
    set({
      live: {
        ...live,
        scoreA, scoreB,
        idx:  live.idx + 1,
        pbp:  [entry, ...live.pbp].slice(0, 8),
        ballSide: ev.team,
      },
    });
  },

  skipGame: () => get()._endGame(),

  continueAfterGame: () => {
    const { bracket, _liveRound, _liveMatch, _liveHuman, _liveOpp, live, _diffMult, userName } = get();
    if (!bracket || !_liveMatch || !live || !_liveHuman || !_liveOpp) return;

    const b = clone(bracket) as Bracket;
    const matches   = roundMatches(b, _liveRound);
    const origMtchs = roundMatches(bracket, _liveRound);

    // find by name since deep-clone breaks reference equality
    const idx = origMtchs.findIndex(
      m => m.a?.name === _liveMatch.a?.name && m.b?.name === _liveMatch.b?.name
    );
    if (idx >= 0) {
      const humanWon = live.winnerName === _liveHuman.name;
      const humanIsA = _liveMatch.a?.isHuman ?? false;
      const winner   = humanWon ? _liveHuman : _liveOpp;
      matches[idx].result = {
        winner,
        sa: humanIsA ? live.targetA : live.targetB,
        sb: humanIsA ? live.targetB : live.targetA,
      };
    }

    roundMatches(b, _liveRound).forEach(m => {
      if (m.a && m.b && !m.result) m.result = decide(m.a, m.b, { diffBias: get()._diffBias });
    });
    wireNext(b, _liveRound);

    let extra: Partial<GameState> = {};
    if (_liveRound === 3) extra = champExtra(b) as Partial<GameState>;

    const newStep    = _liveRound + 1;
    const humanWon   = live.winnerName === _liveHuman.name;
    const upgradeExt: Partial<GameState> =
      humanWon && newStep < 4 ? { pendingUpgrades: drawUpgrades() } : {};

    set({ bracket: b, simStep: newStep, live: null, showHighlight: false, phase: 'bracket', ...extra, ...upgradeExt });
    if (newStep === 4) get()._recordRun(b, _diffMult, userName);
  },

  // ── Economy ──────────────────────────────────────────────────────────────────
  claimStreak: () => {
    const { save, userName } = get();
    if (!save) return;
    const today = todayStr(), yest = yesterdayStr();
    if (save.lastClaim === today) return;

    let sv = clone(save);
    sv.streak    = sv.lastClaim === yest ? sv.streak + 1 : 1;
    sv.lastClaim = today;
    const day    = ((sv.streak - 1) % 30) + 1;
    const rw     = dayReward(day);
    sv.coins    += rw.coins;

    let pull: Card | null = null;
    if (rw.pull) {
      const pool = rw.pull === 'legend' ? PLAYERS.filter(p => p.ovr >= 95) : PLAYERS;
      pull = pick(pool);
      sv.stats.pulls++;
      sv.stats.bestPull = Math.max(sv.stats.bestPull, pull.ovr);
    }
    const { save: saved, newly } = checkBadges(sv);
    persistSave(userName, saved);

    const pullCard = pull ? { ...pull, tier: tierFor(pull.ovr) } : null;
    set({
      save: saved,
      claimToast: {
        coins: rw.coins, label: rw.label,
        pull: pullCard ? { name: pull!.name, ovr: pull!.ovr, team: pull!.team, tier: tierFor(pull!.ovr) } : null,
      },
      badgeToast: newly,
      lastPull:   pullCard,
    });
  },

  spinCard: () => {
    const { save, userName } = get();
    if (!save || save.coins < 100) return;
    let sv   = clone(save);
    sv.coins -= 100;
    const pull = pick(PLAYERS);
    sv.stats.pulls++;
    sv.stats.bestPull = Math.max(sv.stats.bestPull, pull.ovr);
    const { save: saved, newly } = checkBadges(sv);
    persistSave(userName, saved);
    set({ save: saved, lastPull: { ...pull, tier: tierFor(pull.ovr) }, badgeToast: newly });
  },

  closeToast:         () => set({ claimToast: null, badgeToast: [] }),
  goHome:             () => set({ phase: 'home', claimToast: null, badgeToast: [] }),
  logout:             () => set({
    phase: 'register', authUser: null,
    userName: '', save: null, nameInput: '',
    roster: emptyRoster(), available: [...PLAYERS], reelItems: [],
    bracket: null, simStep: 0, champion: null, mvp: '',
    pointsEarned: 0, coinsEarned: 0, runLabel: '', live: null, _recorded: false,
    claimToast: null, badgeToast: [], friends: [], pendingRequests: [],
    incomingChallenges: [], outgoingChallenges: [],
  }),
  viewLeaderboard: () => {
    const userName = get().userName;
    set(s => ({ prevPhase: s.phase, phase: 'leaderboard' }));
    fetchLeaderboard().then(rows => {
      if (!rows.length) return;
      const cloudLb: LbEntry[] = rows.map(r => ({
        name:      r.display_name,
        points:    r.total_points,
        titles:    r.titles,
        games:     r.games,
        bestRound: r.best_round,
        isYou:     r.display_name === userName,
      }));
      cloudLb.sort((a, b) => b.points - a.points);
      saveLB(cloudLb);
      set({ leaderboard: cloudLb });
    }).catch(() => {});
  },
  viewChallenges:     () => set(s => ({ prevPhase: s.phase, phase: 'challenges' })),
  enterLobby:         () => set(s => ({ prevPhase: s.phase, phase: 'lobby', mpRoomId: null, mpRole: null, mpOpponent: null, mpResult: null })),
  setMpRoom:          (id, role, opponent) => set({ mpRoomId: id, mpRole: role, mpOpponent: opponent, phase: 'mp_room' }),
  setMpResult:        (r) => set({ mpResult: r }),
  claimSeasonLevel:   (level) => {
    const { save, userName } = get();
    if (!save) return;
    const updated = claimSeasonReward(save, level);
    persistSave(userName, updated);
    set({ save: updated });
  },
  showHighlightCard:  () => set({ showHighlight: true, shareCopied: false }),
  closeHighlightCard: () => set({ showHighlight: false }),
  setShareCopied:     v  => set({ shareCopied: v }),
  viewSeasonHub: () => set(s => ({
    prevPhase: s.phase, phase: 'season_hub', seasonStatus: 'setup', seasonStandings: null,
    playInBracket: null, playInSeeds: null, playoffBracket: null,
  })),

  setSeasonLength:     (l) => set({ seasonLength: l }),
  setSeasonConference: (c) => set({ seasonConference: c }),

  startSeason: () => {
    const { userName, save, difficulty, seasonLength, seasonConference } = get();
    const humanOvr = Math.max(save?.stats.topOvr ?? 82, 75);
    const diff = DIFF_SETTINGS[difficulty as keyof typeof DIFF_SETTINGS];
    const teams = buildSeasonTeams(userName, humanOvr, seasonConference);
    const seed = Date.now() & 0xFFFFFF;
    const schedule = generateSchedule(teams, seasonLength, seed);
    const { teams: simTeams, schedule: simSchedule } = simulateSeason(teams, schedule, diff.bias);
    const standings = computeStandings(simTeams);

    // Build season roster — one real player card per position near the human OVR
    const seasonRoster: Card[] = POSITIONS.map(pos => {
      const pool = PLAYERS.filter(p => p.pos === pos && Math.abs(p.ovr - humanOvr) <= 8);
      const src = pool.length ? pool : PLAYERS.filter(p => p.pos === pos);
      return src[Math.floor(Math.random() * src.length)];
    });

    // Award coins per win (5 per win)
    const humanTeam = simTeams.find(t => t.isHuman);
    if (humanTeam && save) {
      const coinsGained = humanTeam.wins * 5;
      if (coinsGained > 0) {
        const sv = clone(save);
        sv.coins += coinsGained;
        persistSave(userName, sv);
        set({ save: sv });
      }
    }

    set({
      seasonTeams: simTeams, seasonSchedule: simSchedule,
      seasonStandings: standings, seasonStatus: 'standings',
      seasonRoster, seasonTradesLeft: 3, seasonTradeLog: [],
    });
  },

  advanceToTradeWindow: () => set({ seasonStatus: 'trade_window', seasonTradeTarget: null }),

  openTradeModal:  (pos) => set({ seasonTradeTarget: pos }),
  closeTradeModal: ()    => set({ seasonTradeTarget: null }),

  executeTrade: (pos, target) => {
    const { seasonRoster, seasonTradesLeft, seasonTeams, seasonTradeLog, save, userName } = get();
    const TRADE_COST = 80;
    if (seasonTradesLeft <= 0 || !save || save.coins < TRADE_COST) return;

    const offered = seasonRoster.find(c => c.pos === pos);
    if (!offered || offered.name === target.name) return;

    const newRoster = seasonRoster.map(c => c.pos === pos ? target : c);
    const newOvr    = Math.round(newRoster.reduce((s, c) => s + c.ovr, 0) / newRoster.length);
    const newTeams  = seasonTeams.map(t => t.isHuman ? { ...t, ovr: newOvr } : t);

    const sv = clone(save);
    sv.coins -= TRADE_COST;
    persistSave(userName, sv);

    const newLog = [...seasonTradeLog, { pos, offered: offered.name, received: target.name }];
    set({
      save: sv, seasonRoster: newRoster, seasonTeams: newTeams,
      seasonTradesLeft: seasonTradesLeft - 1,
      seasonTradeLog: newLog, seasonTradeTarget: null,
    });
  },

  skipTradeWindow: () => {
    const { seasonStandings, seasonTeams } = get();
    const playIn = seasonStandings ? buildPlayInFull(seasonTeams, seasonStandings) : null;
    set({ seasonStatus: 'play_in', seasonTradeTarget: null, playInBracket: playIn, playInSeeds: null });
  },

  simPlayIn: () => {
    const { playInBracket, seasonTeams, seasonStandings, difficulty } = get();
    if (!playInBracket || !seasonStandings) return;
    const diff = DIFF_SETTINGS[difficulty as keyof typeof DIFF_SETTINGS];
    const resolved = resolvePlayIn(playInBracket, Date.now() & 0xFFFF, diff.bias);
    const findTeam = (slug: string) => seasonTeams.find(t => t.slug === slug) ?? seasonTeams[0];
    const buildConf = (rows: StandingsRow[], confResult: typeof resolved.east) => {
      const top6 = rows.slice(0, 6).map(r => findTeam(r.slug));
      return [...top6, confResult.seed7, confResult.seed8].filter((t): t is SeasonTeam => t !== null);
    };
    const east = buildConf(seasonStandings.east, resolved.east);
    const west = buildConf(seasonStandings.west, resolved.west);
    set({ playInBracket: resolved, playInSeeds: { east, west } });
  },

  advanceToPlayoffs: () => {
    const { playInSeeds } = get();
    if (!playInSeeds) return;
    const bracket = buildPlayoffBracket(playInSeeds.east, playInSeeds.west);
    set({ seasonStatus: 'playoffs', playoffBracket: bracket });
  },

  simNextPlayoffRound: () => {
    const { playoffBracket, difficulty, save, userName } = get();
    if (!playoffBracket || playoffBracket.champion) return;
    const diff = DIFF_SETTINGS[difficulty as keyof typeof DIFF_SETTINGS];
    const seed = Date.now() & 0xFFFF;

    let eastRounds = playoffBracket.eastRounds;
    let westRounds = playoffBracket.westRounds;
    let finals: SeriesState | null = playoffBracket.finals;
    let champion: SeasonTeam | null = playoffBracket.champion;

    const eastLast = eastRounds[eastRounds.length - 1];
    const eastResolved = eastLast.matchups.every(m => m.winner);
    if (!eastResolved) {
      const { round } = simPlayoffRound(eastLast, seed, diff.bias);
      eastRounds = [...eastRounds.slice(0, -1), round];
    } else if (eastRounds.length < 3) {
      const winners = eastLast.matchups.map(m => m.winner!);
      const nextRound = buildNextRound(winners);
      const { round } = simPlayoffRound(nextRound, seed + 1000, diff.bias);
      eastRounds = [...eastRounds, round];
    }

    const westLast = westRounds[westRounds.length - 1];
    const westResolved = westLast.matchups.every(m => m.winner);
    if (!westResolved) {
      const { round } = simPlayoffRound(westLast, seed + 2000, diff.bias);
      westRounds = [...westRounds.slice(0, -1), round];
    } else if (westRounds.length < 3) {
      const winners = westLast.matchups.map(m => m.winner!);
      const nextRound = buildNextRound(winners);
      const { round } = simPlayoffRound(nextRound, seed + 3000, diff.bias);
      westRounds = [...westRounds, round];
    }

    const eastChampDone = eastRounds.length === 3 && eastRounds[2].matchups[0].winner;
    const westChampDone = westRounds.length === 3 && westRounds[2].matchups[0].winner;

    if (eastChampDone && westChampDone && !finals) {
      const eastChamp = eastRounds[2].matchups[0].winner!;
      const westChamp = westRounds[2].matchups[0].winner!;
      finals = simFullSeries(eastChamp, westChamp, seed + 5000, diff.bias);
      champion = finals.winner;

      if (champion?.isHuman && save) {
        const sv = clone(save);
        sv.coins += 250;
        sv.stats.titles += 1;
        persistSave(userName, sv);
        set({ save: sv });
      }
    }

    set({ playoffBracket: { eastRounds, westRounds, finals, champion } });
  },

  viewFriends:  () => set(s => ({ prevPhase: s.phase, phase: 'friends' })),
  viewHistory:  () => set(s => ({ prevPhase: s.phase, phase: 'history' })),
  viewShop:       () => set(s => ({ prevPhase: s.phase, phase: 'shop' })),
  viewCollection: () => set(s => ({ prevPhase: s.phase, phase: 'collection' })),
  viewSettings:   () => set(s => ({ prevPhase: s.phase, phase: 'settings' })),

  buyDraftToken: (tier) => {
    const { save, userName, draftToken } = get();
    if (!save) return;
    const token = DRAFT_TOKENS[tier];
    if (save.coins < token.cost) return;
    // Refund the old token's cost if swapping mid-run
    const refund = draftToken !== 'standard' ? DRAFT_TOKENS[draftToken as 'gold' | 'diamond'].cost : 0;
    const newCoins = save.coins - token.cost + refund;
    const sv = { ...save, coins: newCoins };
    persistSave(userName, sv);
    set({ save: sv, draftToken: tier });
  },

  openPack: (packType) => {
    const { save, userName } = get();
    if (!save) return;
    const pack = PACKS[packType];
    if (save.coins < pack.cost) return;
    const pool    = PLAYERS.filter(p => p.ovr >= pack.minOvr);
    const cards: Card[] = Array.from({ length: pack.count }, () => pool[Math.floor(Math.random() * pool.length)]);
    const sv = { ...save, coins: save.coins - pack.cost, stats: { ...save.stats, pulls: save.stats.pulls + pack.count } };
    persistSave(userName, sv);
    set({ save: sv, packResult: cards });
  },

  closePack: () => set({ packResult: null }),

  chooseUpgrade: (upgrade) => {
    const { _diffBias, activeUpgrades, pendingUpgrades } = get();
    if (!pendingUpgrades.length) return;
    const boost = upgrade ? upgrade.boost : 0;
    set({
      pendingUpgrades: [],
      activeUpgrades: upgrade ? [...activeUpgrades, upgrade] : activeUpgrades,
      _diffBias: _diffBias + boost,
    });
  },

  startChallenge: (challengeId, target) => set({
    activeChallengeId: challengeId, activeChallengeTarget: target,
    roster: emptyRoster(), available: [...PLAYERS], reelItems: [],
    spinning: false, lastPick: null,
    bracket: null, simStep: 0, champion: null, mvp: '',
    pointsEarned: 0, coinsEarned: 0, runLabel: '', live: null, _recorded: false,
    phase: 'draft',
  }),

  loadFriends: async () => {
    const { authUser } = get();
    if (!authUser) return;
    set({ friendsLoading: true });
    const [{ getFriends }, { getPendingRequests }, { getDirectChallenges }] = await Promise.all([
      import('@/app/actions/social').then(m => ({ getFriends: m.getFriends })),
      import('@/app/actions/social').then(m => ({ getPendingRequests: m.getPendingRequests })),
      import('@/app/actions/social').then(m => ({ getDirectChallenges: m.getDirectChallenges })),
    ]);
    const [fr, pr, dc] = await Promise.all([getFriends(), getPendingRequests(), getDirectChallenges()]);
    set({
      friends:            fr.friends,
      pendingRequests:    pr.requests,
      incomingChallenges: dc.incoming,
      outgoingChallenges: dc.outgoing,
      friendsLoading: false,
    });
  },

  // ── Internal helpers ─────────────────────────────────────────────────────────
  _endGame: () => {
    const { live, _events, _liveHuman, _liveOpp, save, userName } = get();
    if (!live || live.done) return;
    const youWon     = live.targetA > live.targetB;
    const winnerName = youWon ? live.aName : live.bName;
    const pog = computePog(_events, _liveHuman!, _liveOpp!, live.targetA, live.targetB, youWon);
    set({
      live: {
        ...live,
        scoreA: live.targetA, scoreB: live.targetB,
        idx: _events.length, done: true,
        winnerName, ballSide: 'mid', pog,
      },
    });

    // Fire game_win challenge event
    if (youWon && save) {
      const gameScore = { a: live.targetA, b: live.targetB };
      const ca = applyChallengeEvent(save, { type: 'game_win', gameScore });
      if (ca.completedIds.length > 0) {
        const { save: saved, newly } = checkBadges(ca.save);
        persistSave(userName, saved);
        set({ save: saved, challengeAward: ca, badgeToast: newly });
      }
    }
  },

  _recordRun: (b: Bracket, diffMult: number, userName: string) => {
    if (get()._recorded) return;
    const human = get()._liveHuman;
    if (!human) return;

    // Always compute locally first so the UI updates immediately
    const rec = scoreRun(b, human, diffMult);
    const lb  = [...get().leaderboard].map(x => ({ ...x }));
    let entry = lb.find(x => x.name === userName);
    if (!entry) {
      entry = { name: userName, points: 0, titles: 0, games: 0, bestRound: 0, isYou: true };
      lb.push(entry);
    }
    entry.points   += rec.pointsEarned;
    entry.games    += 1;
    if (rec.isChampion) entry.titles++;
    entry.bestRound = Math.max(entry.bestRound ?? 0, rec.winsCount);
    entry.isYou     = true;
    lb.sort((a, bEntry) => bEntry.points - a.points);
    saveLB(lb);

    let sv = clone(get().save!);
    sv.coins          += rec.coinsEarned;
    sv.stats.runs     += 1;
    sv.stats.wins     += rec.winsCount;
    sv.stats.bestRound     = Math.max(sv.stats.bestRound, rec.winsCount);
    sv.stats.maxWinStreak  = Math.max(sv.stats.maxWinStreak, rec.winsCount);
    if (rec.isChampion) sv.stats.titles++;
    if (rec.isChampion && get().difficulty === 'Hall of Fame') sv.stats.hofTitle = true;
    sv.stats.points = entry.points;

    // Prepend run record to history (keep last 30)
    const runRec: RunRecord = {
      date:       todayStr(),
      label:      rec.runLabel,
      round:      rec.winsCount,
      points:     rec.pointsEarned,
      coins:      rec.coinsEarned,
      champion:   rec.isChampion,
      difficulty: get().difficulty,
    };
    sv.recentRuns = [runRec, ...(sv.recentRuns ?? [])].slice(0, 30);

    const { save: saved, newly } = checkBadges(sv);
    persistSave(userName, saved);

    // Fire run_complete challenge event
    const ca = applyChallengeEvent(saved, { type: 'run_complete', winsCount: rec.winsCount, isChampion: rec.isChampion });
    const { save: savedFinal, newly: newlyFinal } = checkBadges(ca.save);
    if (ca.completedIds.length > 0) persistSave(userName, savedFinal);

    set({
      leaderboard:      lb,
      pointsEarned:     rec.pointsEarned,
      coinsEarned:      rec.coinsEarned,
      runLabel:         rec.runLabel,
      save:           ca.completedIds.length ? savedFinal : saved,
      badgeToast:     ca.completedIds.length ? newlyFinal : newly,
      challengeAward: ca.completedIds.length ? ca : null,
      _recorded:      true,
    });

    // Auto-complete active duel challenge if target beaten
    const { activeChallengeId, activeChallengeTarget } = get();
    if (activeChallengeId && activeChallengeTarget !== null && entry.points >= activeChallengeTarget) {
      import('@/app/actions/social').then(({ markChallengeBeat }) => {
        markChallengeBeat(activeChallengeId, entry.points).catch(() => {});
      });
      set({ activeChallengeId: null, activeChallengeTarget: null });
    }

    // Fire-and-forget server action when authenticated — server re-validates score
    if (get().authUser) {
      const difficulty = get().difficulty;
      recordRunServer(b, diffMult, difficulty).then(result => {
        if (result.ok) {
          // Refresh cloud leaderboard in background
          fetchLeaderboard().then(rows => {
            if (!rows.length) return;
            const cloudLb: LbEntry[] = rows.map(r => ({
              name:       r.display_name,
              points:     r.total_points,
              titles:     r.titles,
              games:      r.games,
              bestRound:  r.best_round,
              isYou:      r.display_name === userName,
            }));
            cloudLb.sort((a, bE) => bE.points - a.points);
            saveLB(cloudLb);
            set({ leaderboard: cloudLb });
          });
          // Sync save to cloud
          syncSave(get().save!).catch(() => {});
        }
      }).catch(() => {});
    }
  },
}));

// ─── Derived selector helpers ────────────────────────────────────────────────

export function fmtCoins(save: Save | null): string {
  return save ? fmt(save.coins) : '0';
}

export function getStreakData(save: Save) {
  const today = todayStr(), yest = yesterdayStr();
  const canClaim = save.lastClaim !== today;
  let claimedThrough = 0, nextDay = 1;
  if (save.lastClaim === today) {
    claimedThrough = ((save.streak - 1) % 30) + 1;
    nextDay = 0;
  } else if (save.lastClaim === yest) {
    claimedThrough = save.streak > 0 ? ((save.streak - 1) % 30) + 1 : 0;
    nextDay = (claimedThrough % 30) + 1;
  }
  const nodes: StreakNode[] = buildStreakNodes(claimedThrough, nextDay, canClaim);
  const rw = dayReward(nextDay || 1);
  return { canClaim, nextDay, claimedThrough, nodes, rewardLabel: rw.label, streakCount: save.streak };
}

export function getLeaderboardRows(lb: LbEntry[], userName: string) {
  const FINISH_LABELS = ['First Round', 'Conf Semis', 'Conf Finals', 'Finals', 'Champion'];
  const MEDALS = ['#E0A93B', '#9AA0AB', '#C77B43', '#9CA1AC'];
  return lb.map((e, i) => ({
    rank:      i + 1,
    name:      e.name,
    points:    fmt(e.points),
    titles:    e.titles,
    games:     e.games,
    finish:    FINISH_LABELS[e.bestRound ?? 0] ?? '—',
    isYou:     !!e.isYou || e.name === userName,
    rowBg:     (!!e.isYou || e.name === userName) ? '#F4F0FE' : i < 3 ? '#FCFBF7' : '#fff',
    rankColor: MEDALS[i] ?? '#9CA1AC',
  }));
}

export function getMatchRows(m: Match) {
  const row = (team: Team | null, side: 'a' | 'b') => {
    if (!team) return { showTbd: true, showWin: false, showNormal: false, name: 'TBD', seed: '', score: '', dot: 'transparent' };
    const decided = !!m.result;
    const win     = decided && m.result!.winner === team;
    const score   = decided ? (side === 'a' ? m.result!.sa : m.result!.sb) : '';
    return { showTbd: false, showWin: win, showNormal: !win, name: team.name, seed: team.seed ?? '', score, dot: team.isHuman ? (team.color ?? '#7A3FF2') : 'transparent' };
  };
  return [row(m.a, 'a'), row(m.b, 'b')];
}

const POS_COLORS: Record<Position, string> = {
  PG: '#3B3FB6', SG: '#3E78D6', SF: '#1F9D6B', PF: '#E2622C', C: '#C23B6B',
};

// half-court top-down view: basket at top, ball-handler at bottom
const POS_SPOT_HALF: Record<Position, { left: number; top: number }> = {
  PG: { left: 46, top: 30 },
  SG: { left: 70, top: 48 },
  SF: { left: 26, top: 48 },
  PF: { left: 34, top: 66 },
  C:  { left: 57, top: 66 },
};

export function getWorldRank(lb: LbEntry[], userName: string): { rank: number; total: number } {
  const sorted = [...lb].sort((a, b) => b.points - a.points);
  const idx = sorted.findIndex(e => e.name === userName || e.isYou);
  return { rank: idx >= 0 ? idx + 1 : sorted.length + 1, total: sorted.length };
}

export function getBadgesCount(save: Save | null): { earned: number; total: number } {
  return { earned: save?.badges?.length ?? 0, total: 12 };
}

export function getStepPhase(phase: Phase): 1 | 2 | 3 | 0 {
  if (phase === 'draft') return 1;
  if (phase === 'court') return 2;
  if (phase === 'bracket' || phase === 'game') return 3;
  return 0;
}

export function lastName(name: string): string {
  const p = name.split(' ');
  return p.length > 1 ? p.slice(1).join(' ') : name;
}

export function getDailyChallengesLeft(save: Save | null): number {
  if (!save) return 0;
  const today   = todayStr();
  const dailies = getDailyChallenges(today);
  const done    = new Set((save.dailyChallenges ?? []).filter(d => d.date === today && d.completed).map(d => d.defId));
  return dailies.filter(d => !done.has(d.id)).length;
}

export function getFriendsBadgeCount(
  pendingRequests: PendingRequest[],
  incomingChallenges: IncomingChallenge[],
): number {
  return pendingRequests.length + incomingChallenges.filter(c => c.status === 'pending').length;
}

export { POS_COLORS, POS_SPOT_HALF, TIER_COLORS, fmt, initials };
