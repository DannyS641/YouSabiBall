// Pure, deterministic season engine — no I/O, no Zustand imports.
// All randomness is seeded so results are reproducible.

import { decide } from './decide';
import type { Team, Card, Position } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SeasonLength = 'short' | 'standard' | 'full';

export interface SeasonRosterPlayer {
  card:          Card;
  isStarter:     boolean;
  trainingBoost: number;   // 0–5, added to card.ovr for effective OVR
}

export interface SeasonSave {
  status:          'roster_build' | 'regular_season' | 'trade_window' | 'play_in' | 'playoffs' | 'complete';
  length:          SeasonLength;
  conference:      'East' | 'West';
  difficulty:      string;
  teams:           SeasonTeam[];
  schedule:        GameSlot[];
  gameIndex:       number;             // next schedule index to sim
  standings:       { east: StandingsRow[]; west: StandingsRow[] } | null;
  rosterBudget:    number;             // remaining budget during roster_build
  roster:          SeasonRosterPlayer[];
  trainingPoints:  number;
  tradesLeft:      number;
  tradeLog:        { pos: string; offered: string; received: string }[];
  playInBracket:   PlayInBracket | null;
  playInSeeds:     { east: SeasonTeam[]; west: SeasonTeam[] } | null;
  playoffBracket:  PlayoffBracket | null;
}

// coin cost to buy a player in the roster builder: OVR 84=45, 87=60, 99=120
export function playerSeasonCost(ovr: number): number {
  return Math.round((ovr - 75) * 5);
}

export const SEASON_GAME_COUNTS: Record<SeasonLength, number> = {
  short:    14,
  standard: 28,
  full:     82,
};

export interface SeasonTeam {
  slug: string;
  name: string;
  conference: 'East' | 'West';
  ovr: number;
  isHuman: boolean;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
}

export interface GameSlot {
  week: number;
  homeSlug: string;
  awaySlug: string;
  homeScore: number | null;
  awayScore: number | null;
  played: boolean;
}

export interface PlayerBoxScore {
  playerName: string;
  position: string;
  teamSlug: string;
  min: number;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  fgm: number;
  fga: number;
  fg3m: number;
  fg3a: number;
  ftm: number;
  fta: number;
}

export interface GameResult {
  homeScore: number;
  awayScore: number;
  homeBoxScores: PlayerBoxScore[];
  awayBoxScores: PlayerBoxScore[];
}

export interface StandingsRow {
  slug: string;
  name: string;
  conference: 'East' | 'West';
  ovr: number;
  isHuman: boolean;
  wins: number;
  losses: number;
  pct: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
}

export interface PlayInBracket {
  east: PlayInConf;
  west: PlayInConf;
}

export interface PlayInConf {
  game1: { a: SeasonTeam; b: SeasonTeam; winner: SeasonTeam | null };   // 7 vs 8
  game2: { a: SeasonTeam; b: SeasonTeam; winner: SeasonTeam | null };   // 9 vs 10
  game3: { a: SeasonTeam | null; b: SeasonTeam | null; winner: SeasonTeam | null }; // loser(game1) vs winner(game2)
  seed7: SeasonTeam | null;
  seed8: SeasonTeam | null;
}

export interface SeriesState {
  teamA: SeasonTeam;
  teamB: SeasonTeam;
  winsA: number;
  winsB: number;
  games: { homeScore: number; awayScore: number; homeWon: boolean }[];
  winner: SeasonTeam | null;
}

// ─── 30 NBA teams ─────────────────────────────────────────────────────────────

export const NBA_FRANCHISES: Omit<SeasonTeam, 'wins' | 'losses' | 'pointsFor' | 'pointsAgainst' | 'isHuman'>[] = [
  // East
  { slug: 'BOS', name: 'Celtics',      conference: 'East', ovr: 92 },
  { slug: 'MIL', name: 'Bucks',        conference: 'East', ovr: 90 },
  { slug: 'PHI', name: '76ers',        conference: 'East', ovr: 88 },
  { slug: 'CLE', name: 'Cavaliers',    conference: 'East', ovr: 88 },
  { slug: 'NYK', name: 'Knicks',       conference: 'East', ovr: 86 },
  { slug: 'MIA', name: 'Heat',         conference: 'East', ovr: 85 },
  { slug: 'ATL', name: 'Hawks',        conference: 'East', ovr: 84 },
  { slug: 'CHI', name: 'Bulls',        conference: 'East', ovr: 83 },
  { slug: 'TOR', name: 'Raptors',      conference: 'East', ovr: 82 },
  { slug: 'BKN', name: 'Nets',         conference: 'East', ovr: 81 },
  { slug: 'ORL', name: 'Magic',        conference: 'East', ovr: 80 },
  { slug: 'IND', name: 'Pacers',       conference: 'East', ovr: 80 },
  { slug: 'WAS', name: 'Wizards',      conference: 'East', ovr: 77 },
  { slug: 'CHA', name: 'Hornets',      conference: 'East', ovr: 76 },
  { slug: 'DET', name: 'Pistons',      conference: 'East', ovr: 75 },
  // West
  { slug: 'GSW', name: 'Warriors',     conference: 'West', ovr: 91 },
  { slug: 'LAL', name: 'Lakers',       conference: 'West', ovr: 90 },
  { slug: 'LAC', name: 'Clippers',     conference: 'West', ovr: 88 },
  { slug: 'PHX', name: 'Suns',         conference: 'West', ovr: 87 },
  { slug: 'DEN', name: 'Nuggets',      conference: 'West', ovr: 91 },
  { slug: 'DAL', name: 'Mavericks',    conference: 'West', ovr: 89 },
  { slug: 'MEM', name: 'Grizzlies',    conference: 'West', ovr: 85 },
  { slug: 'NOP', name: 'Pelicans',     conference: 'West', ovr: 84 },
  { slug: 'MIN', name: 'Timberwolves', conference: 'West', ovr: 86 },
  { slug: 'OKC', name: 'Thunder',      conference: 'West', ovr: 87 },
  { slug: 'SAC', name: 'Kings',        conference: 'West', ovr: 82 },
  { slug: 'POR', name: 'Blazers',      conference: 'West', ovr: 79 },
  { slug: 'UTA', name: 'Jazz',         conference: 'West', ovr: 78 },
  { slug: 'SAS', name: 'Spurs',        conference: 'West', ovr: 76 },
  { slug: 'HOU', name: 'Rockets',      conference: 'West', ovr: 80 },
];

// ─── Seeded RNG ───────────────────────────────────────────────────────────────

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Build initial team roster for a season ───────────────────────────────────

export function buildSeasonTeams(
  humanName: string,
  humanOvr: number,
  humanConference: 'East' | 'West' = 'East',
): SeasonTeam[] {
  // Replace one CPU team with the human's slot (same conference, lowest seed spot)
  const teams: SeasonTeam[] = NBA_FRANCHISES.map(f => ({
    ...f,
    wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, isHuman: false,
  }));

  // Replace the lowest-rated same-conf team with the human
  const confTeams = teams
    .filter(t => t.conference === humanConference)
    .sort((a, b) => a.ovr - b.ovr);
  const replaceIdx = teams.findIndex(t => t.slug === confTeams[0].slug);
  teams[replaceIdx] = {
    slug: 'YOU',
    name: humanName,
    conference: humanConference,
    ovr: humanOvr,
    isHuman: true,
    wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0,
  };

  return teams;
}

// ─── Schedule generation ──────────────────────────────────────────────────────
// Balanced round-robin within each conference, then inter-conference fill.

export function generateSchedule(
  teams: SeasonTeam[],
  length: SeasonLength,
  seed: number,
): GameSlot[] {
  const rand = mulberry32(seed);
  const totalGames = SEASON_GAME_COUNTS[length];
  const perTeam = totalGames; // each team plays `totalGames` games total
  const slots: GameSlot[] = [];

  const east = teams.filter(t => t.conference === 'East');
  const west = teams.filter(t => t.conference === 'West');

  // Build pair list: all conf pairs + cross-conf pairs, then shuffle + trim
  const pairs: [string, string][] = [];

  function addPairs(group: SeasonTeam[]) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        pairs.push([group[i].slug, group[j].slug]);
      }
    }
  }
  addPairs(east);
  addPairs(west);
  // Cross-conference pairs
  for (const e of east) {
    for (const w of west) {
      pairs.push([e.slug, w.slug]);
    }
  }

  // Shuffle pairs
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }

  // Count games per team and fill until each team reaches perTeam games
  const gameCounts: Record<string, number> = {};
  for (const t of teams) gameCounts[t.slug] = 0;

  const weeksNeeded = length === 'full' ? 41 : length === 'standard' ? 14 : 7;
  let week = 1;
  let slotIdx = 0;

  while (slotIdx < pairs.length && week <= weeksNeeded) {
    const gamesThisWeek = Math.ceil(teams.length / 2);
    let added = 0;
    const usedThisWeek = new Set<string>();

    for (let pi = slotIdx; pi < pairs.length && added < gamesThisWeek; pi++) {
      const [a, b] = pairs[pi];
      if (
        gameCounts[a] < perTeam &&
        gameCounts[b] < perTeam &&
        !usedThisWeek.has(a) &&
        !usedThisWeek.has(b)
      ) {
        const homeIsA = rand() > 0.5;
        slots.push({
          week,
          homeSlug: homeIsA ? a : b,
          awaySlug: homeIsA ? b : a,
          homeScore: null,
          awayScore: null,
          played: false,
        });
        gameCounts[a]++;
        gameCounts[b]++;
        usedThisWeek.add(a);
        usedThisWeek.add(b);
        added++;
        slotIdx = pi + 1;
      }
    }
    week++;
    if (added === 0) break; // safety: avoid infinite loop if pairs exhausted
  }

  return slots;
}

// ─── Simulate a single game ───────────────────────────────────────────────────

export function simulateGame(
  homeTeam: SeasonTeam,
  awayTeam: SeasonTeam,
  seed: number,
  diffBias = 0,
): GameResult {
  const rand = mulberry32(seed);

  const home: Team = {
    name: homeTeam.name, abbr: homeTeam.slug,
    rating: homeTeam.ovr + 2,   // home-court +2
    isHuman: homeTeam.isHuman,
    color: homeTeam.isHuman ? '#7A3FF2' : '#E2622C',
  };
  const away: Team = {
    name: awayTeam.name, abbr: awayTeam.slug,
    rating: awayTeam.ovr,
    isHuman: awayTeam.isHuman,
    color: awayTeam.isHuman ? '#7A3FF2' : '#6B7280',
  };

  const result = decide(home, away, { diffBias });

  // Generate rough box scores for 5-player rosters (simulated, no actual Card data needed)
  function fakeBox(teamSlug: string, totalPts: number, seed2: number): PlayerBoxScore[] {
    const r = mulberry32(seed2);
    const positions = ['PG', 'SG', 'SF', 'PF', 'C'];
    const shares = positions.map(() => r());
    const total = shares.reduce((a, b) => a + b, 0);
    return positions.map((pos, i) => {
      const share = shares[i] / total;
      const pts = Math.round(totalPts * share);
      const fgm = Math.round(pts * 0.38 + r() * 2);
      const fga = fgm + Math.round(r() * 8 + 4);
      const fg3m = Math.round(r() * Math.min(fgm, 4));
      const fg3a = fg3m + Math.round(r() * 4);
      const ftm = Math.max(0, pts - fgm * 2 - fg3m);
      const fta = ftm + Math.round(r() * 3);
      return {
        playerName: `${teamSlug} ${pos}`,
        position: pos,
        teamSlug,
        min: Math.round(24 + r() * 14),
        pts,
        reb: Math.round(r() * 10 + (pos === 'C' || pos === 'PF' ? 4 : 1)),
        ast: Math.round(r() * 8 + (pos === 'PG' ? 4 : 0)),
        stl: Math.round(r() * 3),
        blk: Math.round(r() * 2 + (pos === 'C' ? 1 : 0)),
        tov: Math.round(r() * 4),
        fgm, fga, fg3m, fg3a, ftm, fta,
      };
    });
  }

  return {
    homeScore: result.sa,
    awayScore: result.sb,
    homeBoxScores: fakeBox(homeTeam.slug, result.sa, seed ^ 0xABCD),
    awayBoxScores: fakeBox(awayTeam.slug, result.sb, seed ^ 0xDCBA),
  };
}

// ─── Simulate entire regular season ──────────────────────────────────────────

export function simulateSeason(
  teams: SeasonTeam[],
  schedule: GameSlot[],
  diffBias = 0,
): { teams: SeasonTeam[]; schedule: GameSlot[] } {
  const teamMap: Record<string, SeasonTeam> = {};
  for (const t of teams) teamMap[t.slug] = { ...t };

  const filledSchedule = schedule.map((slot, i) => {
    if (slot.played) return slot;
    const home = teamMap[slot.homeSlug];
    const away = teamMap[slot.awaySlug];
    const result = simulateGame(home, away, i * 997 + 13, diffBias);
    teamMap[slot.homeSlug].wins   += result.homeScore > result.awayScore ? 1 : 0;
    teamMap[slot.homeSlug].losses += result.homeScore < result.awayScore ? 1 : 0;
    teamMap[slot.awaySlug].wins   += result.awayScore > result.homeScore ? 1 : 0;
    teamMap[slot.awaySlug].losses += result.awayScore < result.homeScore ? 1 : 0;
    teamMap[slot.homeSlug].pointsFor     += result.homeScore;
    teamMap[slot.homeSlug].pointsAgainst += result.awayScore;
    teamMap[slot.awaySlug].pointsFor     += result.awayScore;
    teamMap[slot.awaySlug].pointsAgainst += result.homeScore;
    return { ...slot, homeScore: result.homeScore, awayScore: result.awayScore, played: true };
  });

  return { teams: Object.values(teamMap), schedule: filledSchedule };
}

// ─── Standings ────────────────────────────────────────────────────────────────

export function computeStandings(teams: SeasonTeam[]): {
  east: StandingsRow[];
  west: StandingsRow[];
} {
  function toRow(t: SeasonTeam): StandingsRow {
    const gp = t.wins + t.losses;
    return {
      slug: t.slug, name: t.name, conference: t.conference,
      ovr: t.ovr, isHuman: t.isHuman,
      wins: t.wins, losses: t.losses,
      pct: gp > 0 ? t.wins / gp : 0,
      pointsFor: t.pointsFor,
      pointsAgainst: t.pointsAgainst,
      diff: t.pointsFor - t.pointsAgainst,
    };
  }
  const sort = (rows: StandingsRow[]) =>
    [...rows].sort((a, b) => b.pct - a.pct || b.wins - a.wins);

  const all = teams.map(toRow);
  return {
    east: sort(all.filter(r => r.conference === 'East')),
    west: sort(all.filter(r => r.conference === 'West')),
  };
}

// ─── Play-In bracket (seeds 7–10 per conference) ──────────────────────────────

export function buildPlayIn(standings: { east: StandingsRow[]; west: StandingsRow[] }): PlayInBracket {
  function confPlayIn(rows: StandingsRow[], teams: SeasonTeam[], conf: 'East' | 'West'): PlayInConf {
    const findTeam = (slug: string) => teams.find(t => t.slug === slug)!;
    const s7 = findTeam(rows[6]?.slug ?? '');
    const s8 = findTeam(rows[7]?.slug ?? '');
    const s9 = findTeam(rows[8]?.slug ?? '');
    const s10 = findTeam(rows[9]?.slug ?? '');
    return {
      game1: { a: s7, b: s8, winner: null },
      game2: { a: s9, b: s10, winner: null },
      game3: { a: null, b: null, winner: null },
      seed7: null,
      seed8: null,
    };
  }
  // teams argument must be full list — caller provides it
  return {
    east: { game1: { a: {} as SeasonTeam, b: {} as SeasonTeam, winner: null }, game2: { a: {} as SeasonTeam, b: {} as SeasonTeam, winner: null }, game3: { a: null, b: null, winner: null }, seed7: null, seed8: null },
    west: { game1: { a: {} as SeasonTeam, b: {} as SeasonTeam, winner: null }, game2: { a: {} as SeasonTeam, b: {} as SeasonTeam, winner: null }, game3: { a: null, b: null, winner: null }, seed7: null, seed8: null },
  };
}

export function buildPlayInFull(
  teams: SeasonTeam[],
  standings: { east: StandingsRow[]; west: StandingsRow[] },
): PlayInBracket {
  function confPlayIn(rows: StandingsRow[]): PlayInConf {
    const find = (slug: string) => teams.find(t => t.slug === slug) ?? teams[0];
    const s7  = find(rows[6]?.slug ?? '');
    const s8  = find(rows[7]?.slug ?? '');
    const s9  = find(rows[8]?.slug ?? '');
    const s10 = find(rows[9]?.slug ?? '');
    return {
      game1: { a: s7, b: s8, winner: null },
      game2: { a: s9, b: s10, winner: null },
      game3: { a: null, b: null, winner: null },
      seed7: null,
      seed8: null,
    };
  }
  return {
    east: confPlayIn(standings.east),
    west: confPlayIn(standings.west),
  };
}

export function simulatePlayInGame(
  teamA: SeasonTeam,
  teamB: SeasonTeam,
  seed: number,
  diffBias = 0,
): SeasonTeam {
  const result = simulateGame(teamA, teamB, seed, diffBias);
  return result.homeScore > result.awayScore ? teamA : teamB;
}

export function resolvePlayIn(
  playin: PlayInBracket,
  baseSeed: number,
  diffBias = 0,
): PlayInBracket {
  function resolveConf(conf: PlayInConf, seedOffset: number): PlayInConf {
    const g1winner = simulatePlayInGame(conf.game1.a, conf.game1.b, baseSeed + seedOffset, diffBias);
    const g1loser  = g1winner.slug === conf.game1.a.slug ? conf.game1.b : conf.game1.a;
    const g2winner = simulatePlayInGame(conf.game2.a, conf.game2.b, baseSeed + seedOffset + 1, diffBias);
    const g3winner = simulatePlayInGame(g1loser, g2winner, baseSeed + seedOffset + 2, diffBias);
    return {
      game1: { ...conf.game1, winner: g1winner },
      game2: { ...conf.game2, winner: g2winner },
      game3: { a: g1loser, b: g2winner, winner: g3winner },
      seed7: g1winner,
      seed8: g3winner,
    };
  }
  return {
    east: resolveConf(playin.east, 0),
    west: resolveConf(playin.west, 10),
  };
}

// ─── Best-of-7 series ─────────────────────────────────────────────────────────

export function createSeries(teamA: SeasonTeam, teamB: SeasonTeam): SeriesState {
  return { teamA, teamB, winsA: 0, winsB: 0, games: [], winner: null };
}

export function simSeriesGame(
  series: SeriesState,
  seed: number,
  diffBias = 0,
): SeriesState {
  if (series.winner) return series;
  const gameNum = series.games.length;
  // 2-2-1-1-1 home-court format
  const homeIsA = gameNum < 2 || gameNum === 4 || (gameNum === 5 && series.winsA > series.winsB) || (gameNum === 6 && series.winsA > series.winsB);
  const home = homeIsA ? series.teamA : series.teamB;
  const away = homeIsA ? series.teamB : series.teamA;
  const result = simulateGame(home, away, seed, diffBias);
  const homeWon = result.homeScore > result.awayScore;
  const aWon    = homeIsA ? homeWon : !homeWon;

  const newWinsA = series.winsA + (aWon ? 1 : 0);
  const newWinsB = series.winsB + (!aWon ? 1 : 0);
  const winner   = newWinsA === 4 ? series.teamA : newWinsB === 4 ? series.teamB : null;

  return {
    ...series,
    winsA: newWinsA,
    winsB: newWinsB,
    games: [...series.games, { homeScore: result.homeScore, awayScore: result.awayScore, homeWon }],
    winner,
  };
}

export function simFullSeries(
  teamA: SeasonTeam,
  teamB: SeasonTeam,
  baseSeed: number,
  diffBias = 0,
): SeriesState {
  let s = createSeries(teamA, teamB);
  for (let g = 0; g < 7; g++) {
    if (s.winner) break;
    s = simSeriesGame(s, baseSeed + g * 31, diffBias);
  }
  return s;
}

// ─── Playoff bracket (8 teams per conf → Finals) ─────────────────────────────

export interface PlayoffRound {
  matchups: SeriesState[];
}

export interface PlayoffBracket {
  eastRounds: PlayoffRound[];  // rounds[0] = QF (4 series), [1] = SF (2), [2] = CF (1)
  westRounds: PlayoffRound[];
  finals: SeriesState | null;
  champion: SeasonTeam | null;
}

export function buildPlayoffBracket(
  eastSeeds: SeasonTeam[],  // 8 teams seeded 1–8
  westSeeds: SeasonTeam[],
): PlayoffBracket {
  // First round: 1v8, 2v7, 3v6, 4v5
  function firstRound(seeds: SeasonTeam[]): SeriesState[] {
    return [
      createSeries(seeds[0], seeds[7]),
      createSeries(seeds[1], seeds[6]),
      createSeries(seeds[2], seeds[5]),
      createSeries(seeds[3], seeds[4]),
    ];
  }
  return {
    eastRounds: [{ matchups: firstRound(eastSeeds) }],
    westRounds: [{ matchups: firstRound(westSeeds) }],
    finals: null,
    champion: null,
  };
}

export function simPlayoffRound(
  round: PlayoffRound,
  baseSeed: number,
  diffBias = 0,
): { round: PlayoffRound; winners: SeasonTeam[] } {
  const completed = round.matchups.map((s, i) =>
    s.winner ? s : simFullSeries(s.teamA, s.teamB, baseSeed + i * 100, diffBias)
  );
  return {
    round: { matchups: completed },
    winners: completed.map(s => s.winner!),
  };
}

export function buildNextRound(winners: SeasonTeam[]): PlayoffRound {
  const matchups: SeriesState[] = [];
  for (let i = 0; i < winners.length; i += 2) {
    matchups.push(createSeries(winners[i], winners[i + 1]));
  }
  return { matchups };
}
