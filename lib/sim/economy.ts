import type { Save, Stats, Tier, DayReward, StreakNode, RunRecord } from '../types';
import { BADGES } from './badges';

// ─── Defaults ─────────────────────────────────────────────────────────────────

export function defaultStats(): Stats {
  return {
    drafts: 0, runs: 0, wins: 0, titles: 0,
    bestRound: 0, maxWinStreak: 0,
    topOvr: 0, pulls: 0, bestPull: 0,
    points: 0, hofTitle: false,
  };
}

export function defaultSave(): Save {
  return {
    coins: 250, streak: 0, lastClaim: null, badges: [], stats: defaultStats(),
    dailyChallenges: [],
    seasonPass: { season: 1, xp: 0, level: 1, claimed: [] },
    recentRuns: [],
  };
}

// ─── Tier ─────────────────────────────────────────────────────────────────────

export function tierFor(ovr: number): Tier {
  if (ovr >= 98) return 'Legend';
  if (ovr >= 90) return 'Diamond';
  if (ovr >= 87) return 'Gold';
  if (ovr >= 84) return 'Silver';
  return 'Bronze';
}

export const TIER_COLORS: Record<Tier, string> = {
  Bronze:  '#B07A42',
  Silver:  '#9AA0AB',
  Gold:    '#E0A93B',
  Diamond: '#4FB0E0',
  Legend:  '#7A3FF2',
};

// ─── Daily reward ────────────────────────────────────────────────────────────

export function dayReward(day: number): DayReward {
  if (day % 30 === 0) return { coins: 1000, pull: 'legend', label: 'Legendary Pack 👑' };
  if (day % 7  === 0) return { coins: 300,  pull: 'any',    label: 'Premium Pack 💎' };
  return { coins: 40 + day * 4, pull: false, label: `+${40 + day * 4} coins` };
}

// ─── Streak nodes (30-day calendar) ──────────────────────────────────────────

export function buildStreakNodes(
  claimedThrough: number,
  nextDay:        number,
  canClaim:       boolean
): StreakNode[] {
  return Array.from({ length: 30 }, (_, i) => {
    const day       = i + 1;
    const milestone = day % 7 === 0;
    const claimed   = day <= claimedThrough;
    const today     = canClaim && day === nextDay;
    const tierName  = day % 30 === 0 ? 'Legend' : milestone ? 'Diamond' : null;
    return {
      day,
      size: milestone ? '40px' : '32px',
      tag:  day % 30 === 0 ? 'LEGEND' : milestone ? 'PACK' : '',
      bg:   claimed   ? '#1F9D6B'
          : today     ? '#E2622C'
          : milestone ? '#F0EBFB'
          : '#F4F5F7',
      fg:   (claimed || today) ? '#fff' : milestone ? '#7A3FF2' : '#9CA1AC',
      ring: tierName ? TIER_COLORS[tierName as Tier] : 'transparent',
    };
  });
}

// ─── Badge check ─────────────────────────────────────────────────────────────

export interface EarnedBadge {
  id:    string;
  name:  string;
  glyph: string;
  tier:  Tier;
  color: string;
}

export function checkBadges(save: Save): { save: Save; newly: EarnedBadge[] } {
  const got   = new Set(save.badges ?? []);
  const newly: EarnedBadge[] = [];
  BADGES.forEach(bd => {
    if (!got.has(bd.id) && bd.cond(save)) {
      got.add(bd.id);
      newly.push({ id: bd.id, name: bd.name, glyph: bd.glyph, tier: bd.tier, color: TIER_COLORS[bd.tier] });
    }
  });
  return { save: { ...save, badges: [...got] }, newly };
}

// ─── Date helpers (pure) ──────────────────────────────────────────────────────

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
export function yesterdayStr(): string {
  const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10);
}
