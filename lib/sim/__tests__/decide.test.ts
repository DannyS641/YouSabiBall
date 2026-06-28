import { describe, it, expect } from 'vitest';
import { decide } from '../decide';
import type { Team } from '../../types';

const teamA: Team = { name: 'Alpha', abbr: 'ALP', rating: 90, isHuman: true };
const teamB: Team = { name: 'Beta',  abbr: 'BET', rating: 80, isHuman: false };

describe('decide()', () => {
  it('returns a winner that is either teamA or teamB', () => {
    const result = decide(teamA, teamB);
    expect([teamA, teamB]).toContain(result.winner);
  });

  it('winner score is higher than loser score', () => {
    const result = decide(teamA, teamB);
    if (result.winner === teamA) {
      expect(result.sa).toBeGreaterThan(result.sb);
    } else {
      expect(result.sb).toBeGreaterThan(result.sa);
    }
  });

  it('scores are realistic NBA numbers (96–136)', () => {
    for (let i = 0; i < 50; i++) {
      const r = decide(teamA, teamB);
      expect(r.sa).toBeGreaterThanOrEqual(96);
      expect(r.sb).toBeGreaterThanOrEqual(96);
      // loser ≤ 112, margin ≤ 24 → winner ≤ 136
      expect(Math.max(r.sa, r.sb)).toBeLessThanOrEqual(136);
    }
  });

  it('favors the stronger team over many trials', () => {
    let aWins = 0;
    for (let i = 0; i < 500; i++) {
      if (decide(teamA, teamB).winner === teamA) aWins++;
    }
    // 90 vs 80 → teamA should win > 60% of trials
    expect(aWins / 500).toBeGreaterThan(0.55);
  });

  it('diffBias shifts win probability toward human', () => {
    const weak: Team  = { name: 'Weak', abbr: 'WK', rating: 60, isHuman: true };
    const strong: Team = { name: 'Strong', abbr: 'ST', rating: 95, isHuman: false };
    let winsWithBias = 0;
    let winsWithout  = 0;
    for (let i = 0; i < 400; i++) {
      if (decide(weak, strong, { diffBias: 20 }).winner === weak) winsWithBias++;
      if (decide(weak, strong).winner === weak) winsWithout++;
    }
    expect(winsWithBias).toBeGreaterThan(winsWithout);
  });
});
