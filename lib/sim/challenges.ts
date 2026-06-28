import type {
  ChallengeDef, DailyChallenge, Save,
  SeasonPass, SeasonReward,
} from '../types';

// ─── Challenge pool ───────────────────────────────────────────────────────────

export const CHALLENGE_DEFS: ChallengeDef[] = [
  // Draft
  { id: 'draft_diamond',   name: 'Diamond Draft',   desc: 'Draft a player rated 90 OVR or higher',        xp: 80,  coins: 60,  category: 'draft'   },
  { id: 'draft_legend',    name: 'Legend Alert',     desc: 'Draft a player rated 98 OVR or higher',        xp: 150, coins: 120, category: 'draft'   },
  { id: 'draft_avg85',     name: 'Elite Roster',     desc: 'Finish your draft with a team average of 85+', xp: 100, coins: 80,  category: 'draft'   },
  { id: 'draft_gold5',     name: 'All Gold',         desc: 'Draft 5 Gold-tier or better players',          xp: 120, coins: 90,  category: 'draft'   },
  { id: 'draft_any',       name: 'Drafted Up',       desc: 'Complete any draft',                           xp: 30,  coins: 25,  category: 'draft'   },

  // Run
  { id: 'run_win2',        name: 'Back-to-Back',     desc: 'Win 2 games in a single playoff run',          xp: 80,  coins: 60,  category: 'run'     },
  { id: 'run_finals',      name: 'Finals Bound',     desc: 'Reach the NBA Finals',                         xp: 120, coins: 100, category: 'run'     },
  { id: 'run_champ',       name: 'Championship!',    desc: 'Win the NBA Championship',                     xp: 250, coins: 200, category: 'run'     },
  { id: 'run_confinals',   name: 'Conference Elite', desc: 'Reach the Conference Finals',                  xp: 80,  coins: 60,  category: 'run'     },
  { id: 'run_any',         name: 'In The Arena',     desc: 'Complete any playoff run',                     xp: 40,  coins: 30,  category: 'run'     },

  // Game
  { id: 'game_130',        name: 'High Scorer',      desc: 'Win a game with 130+ points',                  xp: 90,  coins: 70,  category: 'game'    },
  { id: 'game_blowout',    name: 'Blowout',          desc: 'Win a game by 20+ points',                     xp: 80,  coins: 65,  category: 'game'    },
  { id: 'game_close',      name: 'Clutch Win',       desc: 'Win a game by fewer than 5 points',            xp: 100, coins: 80,  category: 'game'    },
  { id: 'game_win',        name: 'Playoff Win',      desc: 'Win any live playoff game',                    xp: 50,  coins: 40,  category: 'game'    },

  // Economy
  { id: 'eco_streak3',     name: 'On A Roll',        desc: 'Maintain a 3-day login streak',                xp: 60,  coins: 50,  category: 'economy' },
  { id: 'eco_streak7',     name: 'Weekly Warrior',   desc: 'Maintain a 7-day login streak',                xp: 150, coins: 120, category: 'economy' },
  { id: 'eco_1000coins',   name: 'Stack It Up',      desc: 'Have 1,000 coins in your wallet',              xp: 70,  coins: 0,   category: 'economy' },
];

// ─── Daily challenge selection (seeded by date) ───────────────────────────────

export function getDailyChallenges(dateStr: string): ChallengeDef[] {
  // Simple seed: sum of char codes of the date string
  const seed = dateStr.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const pool = [...CHALLENGE_DEFS];
  const picks: ChallengeDef[] = [];
  let s = seed;
  while (picks.length < 3 && pool.length > 0) {
    s = (s * 1664525 + 1013904223) & 0x7FFFFFFF;
    const idx = s % pool.length;
    picks.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return picks;
}

// ─── Season pass constants ────────────────────────────────────────────────────

export const XP_PER_LEVEL = 120;
export const MAX_LEVEL    = 30;

export const SEASON_REWARDS: SeasonReward[] = [
  { level: 3,  label: '+75 coins',         coins: 75  },
  { level: 5,  label: '+150 coins',        coins: 150 },
  { level: 7,  label: '+100 coins',        coins: 100 },
  { level: 10, label: '+300 coins · Pack', coins: 300 },
  { level: 12, label: '+100 coins',        coins: 100 },
  { level: 15, label: '+500 coins · Pack', coins: 500 },
  { level: 18, label: '+200 coins',        coins: 200 },
  { level: 20, label: '+600 coins · Pack', coins: 600 },
  { level: 23, label: '+300 coins',        coins: 300 },
  { level: 25, label: '+750 coins',        coins: 750 },
  { level: 28, label: '+400 coins',        coins: 400 },
  { level: 30, label: '+1500 coins · MVP', coins: 1500, badge: 'season_mvp' },
];

// ─── Check and award challenges ───────────────────────────────────────────────

export interface ChallengeEvent {
  type:        'run_complete' | 'game_win' | 'draft_complete';
  winsCount?:  number;
  isChampion?: boolean;
  teamAvg?:    number;    // draft average OVR
  topOvr?:     number;    // highest OVR drafted
  goldCount?:  number;    // number of Gold+ players drafted
  gameScore?:  { a: number; b: number };
}

function isMet(def: ChallengeDef, save: Save, ev: ChallengeEvent): boolean {
  switch (def.id) {
    case 'draft_any':      return ev.type === 'draft_complete';
    case 'draft_diamond':  return ev.type === 'draft_complete' && (ev.topOvr ?? 0) >= 90;
    case 'draft_legend':   return ev.type === 'draft_complete' && (ev.topOvr ?? 0) >= 98;
    case 'draft_avg85':    return ev.type === 'draft_complete' && (ev.teamAvg ?? 0) >= 85;
    case 'draft_gold5':    return ev.type === 'draft_complete' && (ev.goldCount ?? 0) >= 5;

    case 'run_any':        return ev.type === 'run_complete';
    case 'run_win2':       return ev.type === 'run_complete' && (ev.winsCount ?? 0) >= 2;
    case 'run_confinals':  return ev.type === 'run_complete' && (ev.winsCount ?? 0) >= 3;
    case 'run_finals':     return ev.type === 'run_complete' && (ev.winsCount ?? 0) >= 4;
    case 'run_champ':      return ev.type === 'run_complete' && !!ev.isChampion;

    case 'game_win':       return ev.type === 'game_win';
    case 'game_130':       return ev.type === 'game_win'  && (ev.gameScore?.a ?? 0) >= 130;
    case 'game_blowout':   return ev.type === 'game_win'  && ((ev.gameScore?.a ?? 0) - (ev.gameScore?.b ?? 0)) >= 20;
    case 'game_close':     return ev.type === 'game_win'  && ((ev.gameScore?.a ?? 0) - (ev.gameScore?.b ?? 0)) < 5;

    case 'eco_streak3':    return save.streak >= 3;
    case 'eco_streak7':    return save.streak >= 7;
    case 'eco_1000coins':  return save.coins >= 1000;
    default: return false;
  }
}

export interface ChallengeAward {
  save:         Save;
  completedIds: string[];
  xpGained:     number;
  coinsGained:  number;
  levelsGained: number;
  levelRewards: SeasonReward[];
}

export function applyChallengeEvent(save: Save, ev: ChallengeEvent): ChallengeAward {
  const today   = new Date().toISOString().slice(0, 10);
  const dailies = getDailyChallenges(today);
  let sv        = { ...save, dailyChallenges: [...(save.dailyChallenges ?? [])] };
  let sp        = { ...sv.seasonPass };

  const completedIds: string[] = [];
  let xpGained     = 0;
  let coinsGained  = 0;
  const levelRewards: SeasonReward[] = [];

  for (const def of dailies) {
    const existing = sv.dailyChallenges.find(d => d.defId === def.id && d.date === today);
    if (existing?.completed) continue;
    if (!isMet(def, sv, ev)) continue;

    // Mark complete
    if (existing) {
      existing.completed = true;
    } else {
      sv.dailyChallenges.push({ defId: def.id, date: today, completed: true });
    }
    completedIds.push(def.id);
    xpGained    += def.xp;
    coinsGained += def.coins;
  }

  if (xpGained > 0) {
    sp.xp += xpGained;
    sv.coins += coinsGained;

    // Level up
    while (sp.xp >= XP_PER_LEVEL && sp.level < MAX_LEVEL) {
      sp.xp   -= XP_PER_LEVEL;
      sp.level += 1;
    }

    // Auto-grant season pass rewards for newly reached levels
    const prevLevel = save.seasonPass?.level ?? 1;
    for (const rw of SEASON_REWARDS) {
      if (rw.level > prevLevel && rw.level <= sp.level && !sp.claimed.includes(rw.level)) {
        sp.claimed = [...sp.claimed, rw.level];
        sv.coins += rw.coins;
        levelRewards.push(rw);
      }
    }

    sv.seasonPass = sp;
  }

  return { save: sv, completedIds, xpGained, coinsGained, levelsGained: sp.level - (save.seasonPass?.level ?? 1), levelRewards };
}

// ─── Claim season pass reward manually ───────────────────────────────────────

export function claimSeasonReward(save: Save, level: number): Save {
  const rw = SEASON_REWARDS.find(r => r.level === level);
  if (!rw) return save;
  const sp = save.seasonPass;
  if (sp.level < level) return save;             // not yet reached
  if (sp.claimed.includes(level)) return save;   // already claimed
  return {
    ...save,
    coins:      save.coins + rw.coins,
    seasonPass: { ...sp, claimed: [...sp.claimed, level] },
  };
}
