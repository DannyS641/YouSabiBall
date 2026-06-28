import type { Card, Team, PbpEntry, CourtDot } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function lastName(name: string): string {
  const parts = name.split(' ');
  return parts.length > 1 ? parts.slice(1).join(' ') : name;
}

/** Weighted random pick */
function pickWeighted<T extends { w: number }>(pool: T[]): T {
  const tot = pool.reduce((s, p) => s + p.w, 0);
  let r = Math.random() * tot;
  for (const p of pool) { r -= p.w; if (r <= 0) return p; }
  return pool[0];
}

// ─── Score sequence ───────────────────────────────────────────────────────────

/** Break a total score into individual scoring plays (1, 2, or 3 pts). */
export function buildScoreSequence(total: number): number[] {
  const out: number[] = [];
  let rem = total;
  while (rem > 0) {
    let p: number;
    if (rem <= 1) { p = 1; }
    else          { p = Math.random() < 0.32 ? 3 : 2; if (p > rem) p = rem; }
    out.push(p);
    rem -= p;
  }
  return out;
}

// ─── Play-by-play line ────────────────────────────────────────────────────────

function commentaryLine(name: string, pts: number): string {
  const ln = lastName(name);
  if (pts === 3) return `${ln} ${pick(['drains a three', 'splashes a triple', 'hits from deep', 'buries a three'])}`;
  if (pts === 1) return `${ln} hits a free throw`;
  return `${ln} ${pick(['lays it in', 'hits the jumper', 'scores inside', 'throws it down', 'knocks down two', 'spins to the rim'])}`;
}

// ─── Scorer pools ─────────────────────────────────────────────────────────────

function humanScorers(players: Card[]): { name: string; w: number }[] {
  return players.map(p => ({ name: p.name, w: Math.max(8, p.ovr - 70) }));
}

function cpuScorers(
  team: Team,
  scorersByTeam: Record<string, string[]>
): { name: string; w: number }[] {
  const names = scorersByTeam[team.abbr] ?? [team.star ?? team.name];
  return names.map((n, i) => ({ name: n, w: i === 0 ? 100 : 55 }));
}

// ─── Clock ────────────────────────────────────────────────────────────────────

export function clock(idx: number, total: number): { q: number; clockStr: string } {
  const eq      = Math.ceil(total / 4);
  const q       = Math.min(4, Math.floor((idx - 1) / eq) + 1);
  const within  = (idx - 1) - (q - 1) * eq;
  const frac    = Math.min(1, (within + 1) / eq);
  const sec     = Math.max(0, Math.round(720 * (1 - frac)));
  const m       = Math.floor(sec / 60);
  const ss      = sec % 60;
  return { q, clockStr: `${m}:${String(ss).padStart(2, '0')}` };
}

// ─── Full event list ──────────────────────────────────────────────────────────

export interface GameEvent {
  team:   'A' | 'B';
  pts:    number;
  scorer: string;
  line:   string;
}

export function buildEvents(
  human:         Team,
  opp:           Team,
  humanScore:    number,
  oppScore:      number,
  scorersByTeam: Record<string, string[]>
): GameEvent[] {
  const hPool = humanScorers(human.players ?? []);
  const oPool = cpuScorers(opp, scorersByTeam);

  const hPlays = buildScoreSequence(humanScore).map(pts => ({ team: 'A' as const, pts }));
  const oPlays = buildScoreSequence(oppScore).map(pts => ({ team: 'B' as const, pts }));

  // interleave
  const out: { team: 'A' | 'B'; pts: number }[] = [];
  let i = 0, j = 0;
  while (i < hPlays.length || j < oPlays.length) {
    if (j >= oPlays.length || (i < hPlays.length && Math.random() < 0.52)) {
      out.push(hPlays[i++]);
    } else {
      out.push(oPlays[j++]);
    }
  }

  return out.map(ev => {
    const sc = pickWeighted(ev.team === 'A' ? hPool : oPool);
    return { ...ev, scorer: sc.name, line: commentaryLine(sc.name, ev.pts) };
  });
}

// ─── PbpEntry from event ──────────────────────────────────────────────────────

export function eventToPbp(
  ev:        GameEvent,
  idx:       number,
  total:     number,
  aColor:    string
): PbpEntry {
  const { q, clockStr } = clock(idx + 1, total);
  return {
    txt:   ev.line,
    team:  ev.team,
    color: ev.team === 'A' ? aColor : '#16181D',
    tag:   `Q${q} ${clockStr}`,
  };
}

// ─── Court dot positions ──────────────────────────────────────────────────────

const A_LEFT   = [15, 27, 27, 41, 41];
const A_TOP    = [50, 27, 73, 37, 63];
const B_LEFT   = [85, 73, 73, 59, 59];

export function buildCourtDots(human: Team): { aDots: CourtDot[]; bDots: CourtDot[] } {
  const aDots: CourtDot[] = (human.players ?? []).map((p, i) => ({
    l:     A_LEFT[i],
    t:     A_TOP[i],
    label: String(p.ovr),
    color: human.color ?? '#7A3FF2',
  }));
  const bDots: CourtDot[] = [0, 1, 2, 3, 4].map(i => ({
    l:     B_LEFT[i],
    t:     A_TOP[i],
    label: '',
    color: '#6B7280',
  }));
  return { aDots, bDots };
}

// ─── Player of the Game ───────────────────────────────────────────────────────

function synthAst(p: { pos: Position; pts: number }): number {
  const g = p.pos === 'PG' ? 1 : p.pos === 'SG' ? 0.8 : p.pos === 'SF' ? 0.55 : 0.3;
  return Math.max(1, Math.round(p.pts * 0.12 * g + 2 + Math.random() * 3 * g));
}
function synthReb(p: { pos: Position; pts: number }): number {
  const r = p.pos === 'C' ? 1 : p.pos === 'PF' ? 0.85 : p.pos === 'SF' ? 0.55 : 0.3;
  return Math.max(1, Math.round(p.pts * 0.10 * r + 3 * r + Math.random() * 4 * r));
}

import type { Position } from '../types';
import { tierFor } from './economy';

export function computePog(
  events:  GameEvent[],
  human:   Team,
  opp:     Team,
  targetA: number,
  targetB: number,
  youWon:  boolean
) {
  const pts: Record<string, number> = {};
  events.forEach(ev => {
    if (ev.team === 'A') pts[ev.scorer] = (pts[ev.scorer] ?? 0) + ev.pts;
  });

  const board = (human.players ?? [])
    .map(p => ({ name: p.name, pos: p.pos, ovr: p.ovr, pts: pts[p.name] ?? 0 }))
    .sort((a, b) => b.pts - a.pts);

  const top = board[0];
  return {
    name:    top.name,
    pos:     top.pos as Position,
    ovr:     top.ovr,
    pts:     top.pts,
    ast:     synthAst(top),
    reb:     synthReb(top),
    team:    human.name,
    oppName: opp.name,
    scoreA:  targetA,
    scoreB:  targetB,
    youWon,
    tier:    tierFor(top.ovr),
  };
}
