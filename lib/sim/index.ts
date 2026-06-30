// Central re-export — import everything from '@/lib/sim'

export { decide }              from './decide';
export type { DecideOptions }  from './decide';

export {
  buildScoreSequence,
  buildEvents,
  buildCourtDots,
  computePog,
  eventToPbp,
  clock,
} from './events';
export type { GameEvent }      from './events';

export {
  buildBracket,
  roundMatches,
  wireNext,
  champExtra,
  simRound,
  findHumanMatch,
  scoreRun,
} from './bracket';
export type { RunRecord }      from './bracket';

export {
  defaultSave,
  defaultStats,
  tierFor,
  TIER_COLORS,
  dayReward,
  buildStreakNodes,
  checkBadges,
  todayStr,
  yesterdayStr,
  DRAFT_TOKENS,
  PACKS,
} from './economy';
export type { EarnedBadge, DraftTokenTier, PackType } from './economy';

export { BADGES }              from './badges';

export { getTeamProfile }      from './teamProfile';
export type { TeamProfile }    from './teamProfile';

export {
  CHALLENGE_DEFS,
  SEASON_REWARDS,
  XP_PER_LEVEL,
  MAX_LEVEL,
  getDailyChallenges,
  applyChallengeEvent,
  claimSeasonReward,
} from './challenges';
export type { ChallengeEvent, ChallengeAward } from './challenges';
