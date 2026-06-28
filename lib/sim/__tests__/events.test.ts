import { describe, it, expect } from 'vitest';
import { buildScoreSequence, buildEvents, clock } from '../events';
import type { Team } from '../../types';

describe('buildScoreSequence()', () => {
  it('sums to the target total', () => {
    for (const total of [80, 95, 110, 120]) {
      const seq = buildScoreSequence(total);
      expect(seq.reduce((a, b) => a + b, 0)).toBe(total);
    }
  });

  it('each element is 1, 2, or 3', () => {
    buildScoreSequence(100).forEach(p => {
      expect([1, 2, 3]).toContain(p);
    });
  });
});

describe('clock()', () => {
  it('returns Q1 for first event', () => {
    expect(clock(1, 40).q).toBe(1);
  });

  it('returns Q4 for last event', () => {
    expect(clock(40, 40).q).toBe(4);
  });

  it('clockStr format is m:ss', () => {
    const { clockStr } = clock(1, 40);
    expect(clockStr).toMatch(/^\d+:\d{2}$/);
  });
});

describe('buildEvents()', () => {
  const human: Team = {
    name: 'Me', abbr: 'ME', rating: 88, isHuman: true,
    players: [
      { name: 'Player One', team: 'ME', pos: 'PG', ovr: 88 },
      { name: 'Player Two', team: 'ME', pos: 'SG', ovr: 85 },
      { name: 'Player Three', team: 'ME', pos: 'SF', ovr: 84 },
      { name: 'Player Four',  team: 'ME', pos: 'PF', ovr: 86 },
      { name: 'Player Five',  team: 'ME', pos: 'C',  ovr: 87 },
    ],
    color: '#7A3FF2',
  };
  const opp: Team = { name: 'CPU', abbr: 'CPU', rating: 85, isHuman: false, star: 'CPU Star' };
  const scorers: Record<string, string[]> = { CPU: ['CPU Star', 'CPU Two'] };

  it('team A total equals humanScore', () => {
    const events = buildEvents(human, opp, 110, 100, scorers);
    const aTotal = events.filter(e => e.team === 'A').reduce((s, e) => s + e.pts, 0);
    expect(aTotal).toBe(110);
  });

  it('team B total equals oppScore', () => {
    const events = buildEvents(human, opp, 110, 100, scorers);
    const bTotal = events.filter(e => e.team === 'B').reduce((s, e) => s + e.pts, 0);
    expect(bTotal).toBe(100);
  });

  it('every event has a non-empty line', () => {
    const events = buildEvents(human, opp, 105, 98, scorers);
    events.forEach(e => {
      expect(typeof e.line).toBe('string');
      expect(e.line.length).toBeGreaterThan(0);
    });
  });
});
