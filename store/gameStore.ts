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
} from '@/lib/sim';
import type { GameEvent, EarnedBadge, ChallengeAward, DraftTokenTier, PackType } from '@/lib/sim';
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

export type Phase = 'register' | 'home' | 'draft' | 'court' | 'bracket' | 'game' | 'leaderboard' | 'challenges' | 'lobby' | 'mp_room' | 'friends' | 'history' | 'shop';

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
  roster:      Roster;
  available:   Card[];
  reelItems:   Card[];
  spinning:    boolean;
  lastPick:    Card | null;
  draftToken:  DraftTokenTier;

  // Shop
  packResult:  Card[] | null;

  // Bracket
  bracket:      Bracket | null;
  simStep:      number;
  champion:     Team | null;
  mvp:          string;
  pointsEarned: number;
  coinsEarned:  number;
  runLabel:     string;

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
  viewFriends:         () => void;
  viewHistory:         () => void;
  viewShop:            () => void;
  buyDraftToken:       (tier: 'gold' | 'diamond') => void;
  openPack:            (packType: PackType) => void;
  closePack:           () => void;
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
  draftToken: 'standard', packResult: null,
  bracket: null, simStep: 0, champion: null, mvp: '',
  pointsEarned: 0, coinsEarned: 0, runLabel: '',
  live: null, _events: [], _liveHuman: null, _liveOpp: null,
  _liveRound: 0, _liveMatch: null,
  _diffBias: 0, _diffMult: 1, _recorded: false,
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
    spinning: false, lastPick: null,
    bracket: null, simStep: 0, champion: null, mvp: '',
    pointsEarned: 0, coinsEarned: 0, runLabel: '', live: null, _recorded: false,
    activeChallengeId: null, activeChallengeTarget: null,
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

    // Fire draft_complete challenge event when all 5 positions are filled
    if (save && POSITIONS.every(p => newRoster[p])) {
      const cards       = POSITIONS.map(p => newRoster[p]!);
      const teamAvg     = Math.round(cards.reduce((s, c) => s + c.ovr, 0) / cards.length);
      const topOvr      = Math.max(...cards.map(c => c.ovr));
      const goldCount   = cards.filter(c => c.ovr >= 87).length;
      const award = applyChallengeEvent(save, { type: 'draft_complete', teamAvg, topOvr, goldCount });
      const { save: saved, newly } = checkBadges(award.save);
      persistSave(userName, saved);
      set({ save: saved, challengeAward: award.completedIds.length ? award : null, badgeToast: newly });
    }
  },

  viewTeam: () => set({ phase: 'court' }),

  // ── Enter playoffs ───────────────────────────────────────────────────────────
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
      draftToken: 'standard',  // token is consumed when playoffs start
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

    set({ bracket: b, simStep: simStep + 1, live: null, showHighlight: false, ...extra });
    if (simStep + 1 === 4 && !_recorded) get()._recordRun(b, _diffMult, userName);
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

    set({ bracket: b, simStep: _liveRound + 1, live: null, showHighlight: false, phase: 'bracket', ...extra });
    if (_liveRound + 1 === 4) get()._recordRun(b, _diffMult, userName);
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
  viewFriends:  () => set(s => ({ prevPhase: s.phase, phase: 'friends' })),
  viewHistory:  () => set(s => ({ prevPhase: s.phase, phase: 'history' })),
  viewShop:     () => set(s => ({ prevPhase: s.phase, phase: 'shop' })),

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
      leaderboard:    lb,
      pointsEarned:   rec.pointsEarned,
      coinsEarned:    rec.coinsEarned,
      runLabel:       rec.runLabel,
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
