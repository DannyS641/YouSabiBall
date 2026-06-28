import type { Team, MatchResult } from '../types';

export interface DecideOptions {
  upsetFactor?: number;
  diffBias?:    number;  // positive = human favored, negative = human penalised
}

/**
 * Elo-style win probability → score pair.
 * Pure function — no side effects, no DOM, no React.
 */
export function decide(a: Team, b: Team, opts: DecideOptions = {}): MatchResult {
  const k    = 9 * (opts.upsetFactor ?? 1);
  const bias = opts.diffBias ?? 0;

  const ra = a.rating + (a.isHuman ? bias : 0);
  const rb = b.rating + (b.isHuman ? bias : 0);

  const pA    = 1 / (1 + Math.pow(10, (rb - ra) / k));
  const aWins = Math.random() < pA;

  const loser  = 96 + Math.round(Math.random() * 16);
  const margin = Math.min(24, 3 + Math.round(Math.abs(ra - rb) * 0.5) + Math.round(Math.random() * 9));
  const win    = loser + margin;

  return aWins
    ? { winner: a, sa: win, sb: loser }
    : { winner: b, sa: loser, sb: win };
}
