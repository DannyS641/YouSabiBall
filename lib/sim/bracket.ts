import type { Bracket, ConferenceRounds, Match, Team, MatchResult } from '../types';
import { decide, DecideOptions } from './decide';

// ─── Construction ─────────────────────────────────────────────────────────────

function mk(a: Team | null, b: Team | null): Match {
  return { a, b, result: null };
}

function buildConf(seeds: Team[]): ConferenceRounds {
  return {
    qf: [
      mk(seeds[0], seeds[7]),
      mk(seeds[3], seeds[4]),
      mk(seeds[2], seeds[5]),
      mk(seeds[1], seeds[6]),
    ],
    sf: [mk(null, null), mk(null, null)],
    cf: [mk(null, null)],
  };
}

/**
 * Build a 16-team bracket from 1 human + 15 CPU teams.
 * Splits by alternating East/West after sorting by rating.
 */
export function buildBracket(human: Team, cpuTeams: Team[]): Bracket {
  const all = [human, ...cpuTeams]
    .sort((a, b) => (b.rating - a.rating) || (Math.random() - 0.5));

  const east: Team[] = [];
  const west: Team[] = [];
  all.forEach((t, i) => {
    if (i % 2 === 0) { t.conf = 'East'; east.push(t); }
    else             { t.conf = 'West'; west.push(t); }
  });
  east.forEach((t, i) => { t.seed = i + 1; });
  west.forEach((t, i) => { t.seed = i + 1; });

  return {
    teams: all,
    east:  buildConf(east),
    west:  buildConf(west),
    finals: mk(null, null),
  };
}

// ─── Round helpers ────────────────────────────────────────────────────────────

export function roundMatches(b: Bracket, step: number): Match[] {
  if (step === 0) return [...b.east.qf, ...b.west.qf];
  if (step === 1) return [...b.east.sf, ...b.west.sf];
  if (step === 2) return [...b.east.cf, ...b.west.cf];
  return [b.finals];
}

export function wireNext(b: Bracket, step: number): void {
  if (step === 0) {
    (['east', 'west'] as const).forEach(c => {
      b[c].sf[0].a = b[c].qf[0].result!.winner;
      b[c].sf[0].b = b[c].qf[1].result!.winner;
      b[c].sf[1].a = b[c].qf[2].result!.winner;
      b[c].sf[1].b = b[c].qf[3].result!.winner;
    });
  } else if (step === 1) {
    (['east', 'west'] as const).forEach(c => {
      b[c].cf[0].a = b[c].sf[0].result!.winner;
      b[c].cf[0].b = b[c].sf[1].result!.winner;
    });
  } else if (step === 2) {
    b.finals.a = b.east.cf[0].result!.winner;
    b.finals.b = b.west.cf[0].result!.winner;
  }
}

export function champExtra(b: Bracket): { champion: Team; mvp: string } {
  const champ = b.finals.result!.winner;
  const mvp   = champ.isHuman
    ? [...(champ.players ?? [])].sort((x, y) => y.ovr - x.ovr)[0]?.name ?? champ.name
    : champ.star ?? champ.name;
  return { champion: champ, mvp };
}

/** Simulate all remaining unplayed matches in a round. */
export function simRound(b: Bracket, step: number, opts: DecideOptions): void {
  roundMatches(b, step).forEach(m => {
    if (m.a && m.b && !m.result) m.result = decide(m.a, m.b, opts);
  });
}

/** Find the human's unplayed match in the current round, if any. */
export function findHumanMatch(b: Bracket, step: number): Match | undefined {
  return roundMatches(b, step).find(
    m => m.a && m.b && !m.result && (m.a.isHuman || m.b.isHuman)
  );
}

// ─── Record a completed run ───────────────────────────────────────────────────

export interface RunRecord {
  winsCount:     number;
  isChampion:    boolean;
  pointsEarned:  number;
  coinsEarned:   number;
  runLabel:      string;
}

const RUN_LABELS = [
  'Eliminated in the First Round',
  'Lost in the Conference Semifinals',
  'Lost in the Conference Finals',
  'Runner-up — Lost in the Finals',
  '🏆 NBA CHAMPION',
];

export function scoreRun(
  b:        Bracket,
  human:    Team,
  diffMult: number
): RunRecord {
  let won = 0;
  const scan = (m: Match) => {
    if (m?.result?.winner?.isHuman) won++;
  };
  [
    ...b.east.qf, ...b.east.sf, ...b.east.cf,
    ...b.west.qf, ...b.west.sf, ...b.west.cf,
    b.finals,
  ].forEach(scan);

  const isChampion  = !!b.finals.result?.winner?.isHuman;
  const pts         = Math.round((100 + won * 200 + (isChampion ? 800 : 0) + human.rating) * diffMult);
  const coinsEarned = Math.round((50 + won * 40 + (isChampion ? 300 : 0)) * diffMult);

  return {
    winsCount:    won,
    isChampion,
    pointsEarned: pts,
    coinsEarned,
    runLabel:     RUN_LABELS[won] ?? `${won} wins`,
  };
}
