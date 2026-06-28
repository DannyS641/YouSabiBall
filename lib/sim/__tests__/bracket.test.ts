import { describe, it, expect } from 'vitest';
import { buildBracket, roundMatches, wireNext, simRound, scoreRun } from '../bracket';
import type { Team } from '../../types';

function makeTeam(name: string, rating: number, isHuman = false): Team {
  return { name, abbr: name.slice(0, 3).toUpperCase(), rating, isHuman };
}

const human = makeTeam('Human', 88, true);
const cpuTeams = Array.from({ length: 15 }, (_, i) =>
  makeTeam(`CPU${i + 1}`, 75 + i * 1)
);

describe('buildBracket()', () => {
  it('creates 8 teams per conference', () => {
    const b = buildBracket(human, cpuTeams);
    const east = b.teams.filter(t => t.conf === 'East');
    const west = b.teams.filter(t => t.conf === 'West');
    expect(east).toHaveLength(8);
    expect(west).toHaveLength(8);
  });

  it('each conference has 4 QF matches', () => {
    const b = buildBracket(human, cpuTeams);
    expect(b.east.qf).toHaveLength(4);
    expect(b.west.qf).toHaveLength(4);
  });

  it('human appears exactly once in QF', () => {
    const b = buildBracket(human, cpuTeams);
    const all = roundMatches(b, 0);
    const humanMatches = all.filter(m => m.a?.isHuman || m.b?.isHuman);
    expect(humanMatches).toHaveLength(1);
  });
});

describe('full simulation', () => {
  it('sim all 4 rounds and produce a champion', () => {
    const b = buildBracket(human, cpuTeams);
    for (let step = 0; step < 4; step++) {
      simRound(b, step, {});
      wireNext(b, step);
    }
    expect(b.finals.result).not.toBeNull();
    expect(b.finals.result!.winner).toBeDefined();
  });

  it('scoreRun returns sensible numbers', () => {
    const b = buildBracket(human, cpuTeams);
    for (let step = 0; step < 4; step++) {
      simRound(b, step, {});
      wireNext(b, step);
    }
    const rec = scoreRun(b, human, 1);
    expect(rec.winsCount).toBeGreaterThanOrEqual(0);
    expect(rec.winsCount).toBeLessThanOrEqual(4);
    expect(rec.pointsEarned).toBeGreaterThan(0);
    expect(rec.coinsEarned).toBeGreaterThan(0);
    expect(rec.runLabel.length).toBeGreaterThan(0);
  });
});
