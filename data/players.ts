import type { Card } from '@/lib/types';

export const PLAYERS: Card[] = [
  { name: 'Nikola Jokić',              team: 'DEN', pos: 'C',  ovr: 99 },
  { name: 'Shai Gilgeous-Alexander',   team: 'OKC', pos: 'PG', ovr: 97 },
  { name: 'Luka Dončić',               team: 'LAL', pos: 'PG', ovr: 96 },
  { name: 'Giannis Antetokounmpo',     team: 'MIL', pos: 'PF', ovr: 96 },
  { name: 'Jayson Tatum',              team: 'BOS', pos: 'PF', ovr: 95 },
  { name: 'Anthony Edwards',           team: 'MIN', pos: 'SG', ovr: 94 },
  { name: 'Victor Wembanyama',         team: 'SAS', pos: 'C',  ovr: 94 },
  { name: 'Joel Embiid',               team: 'PHI', pos: 'C',  ovr: 92 },
  { name: 'Kevin Durant',              team: 'HOU', pos: 'SF', ovr: 92 },
  { name: 'Stephen Curry',             team: 'GSW', pos: 'PG', ovr: 92 },
  { name: 'LeBron James',              team: 'LAL', pos: 'SF', ovr: 91 },
  { name: 'Donovan Mitchell',          team: 'CLE', pos: 'SG', ovr: 91 },
  { name: 'Jalen Brunson',             team: 'NYK', pos: 'PG', ovr: 91 },
  { name: 'Anthony Davis',             team: 'DAL', pos: 'C',  ovr: 91 },
  { name: 'Tyrese Haliburton',         team: 'IND', pos: 'PG', ovr: 90 },
  { name: 'Devin Booker',              team: 'PHX', pos: 'SG', ovr: 90 },
  { name: 'Kawhi Leonard',             team: 'LAC', pos: 'SF', ovr: 89 },
  { name: 'Jaylen Brown',              team: 'BOS', pos: 'SG', ovr: 89 },
  { name: 'Ja Morant',                 team: 'MEM', pos: 'PG', ovr: 89 },
  { name: 'Cade Cunningham',           team: 'DET', pos: 'PG', ovr: 89 },
  { name: 'Paolo Banchero',            team: 'ORL', pos: 'PF', ovr: 88 },
  { name: "De'Aaron Fox",              team: 'SAS', pos: 'PG', ovr: 88 },
  { name: 'Domantas Sabonis',          team: 'SAC', pos: 'C',  ovr: 88 },
  { name: 'Karl-Anthony Towns',        team: 'NYK', pos: 'C',  ovr: 88 },
  { name: 'Tyrese Maxey',              team: 'PHI', pos: 'PG', ovr: 88 },
  { name: 'Paul George',               team: 'PHI', pos: 'SF', ovr: 88 },
  { name: 'Evan Mobley',               team: 'CLE', pos: 'C',  ovr: 88 },
  { name: 'Bam Adebayo',               team: 'MIA', pos: 'C',  ovr: 87 },
  { name: 'Trae Young',                team: 'ATL', pos: 'PG', ovr: 87 },
  { name: 'Jimmy Butler',              team: 'GSW', pos: 'SF', ovr: 87 },
  { name: 'Alperen Şengün',            team: 'HOU', pos: 'C',  ovr: 87 },
  { name: 'Jalen Williams',            team: 'OKC', pos: 'PF', ovr: 87 },
  { name: 'Chet Holmgren',             team: 'OKC', pos: 'C',  ovr: 87 },
  { name: 'Zion Williamson',           team: 'NOP', pos: 'PF', ovr: 86 },
  { name: 'Franz Wagner',              team: 'ORL', pos: 'SF', ovr: 86 },
  { name: 'LaMelo Ball',               team: 'CHA', pos: 'PG', ovr: 86 },
  { name: 'Jaren Jackson Jr.',         team: 'MEM', pos: 'PF', ovr: 86 },
  { name: 'Pascal Siakam',             team: 'IND', pos: 'PF', ovr: 86 },
  { name: 'Jamal Murray',              team: 'DEN', pos: 'PG', ovr: 86 },
  { name: 'Darius Garland',            team: 'CLE', pos: 'PG', ovr: 85 },
  { name: 'Desmond Bane',              team: 'ORL', pos: 'SG', ovr: 85 },
  { name: 'Derrick White',             team: 'BOS', pos: 'SG', ovr: 85 },
  { name: 'Amen Thompson',             team: 'HOU', pos: 'SG', ovr: 85 },
  { name: 'Scottie Barnes',            team: 'TOR', pos: 'SF', ovr: 85 },
  { name: 'Kristaps Porziņģis',        team: 'ATL', pos: 'C',  ovr: 84 },
  { name: 'Brandon Miller',            team: 'CHA', pos: 'SF', ovr: 84 },
  { name: 'OG Anunoby',                team: 'NYK', pos: 'SF', ovr: 84 },
  { name: 'Mikal Bridges',             team: 'NYK', pos: 'SF', ovr: 84 },
  { name: 'Austin Reaves',             team: 'LAL', pos: 'PG', ovr: 84 },
  { name: 'Tyler Herro',               team: 'MIA', pos: 'SG', ovr: 84 },
];

/** Build scorer lookup: team abbr → top-4 player names by OVR */
export function buildScorersByTeam(players: Card[]): Record<string, string[]> {
  const map: Record<string, Card[]> = {};
  players.forEach(p => { (map[p.team] ??= []).push(p); });
  const out: Record<string, string[]> = {};
  Object.entries(map).forEach(([team, cards]) => {
    out[team] = cards
      .sort((a, b) => b.ovr - a.ovr)
      .slice(0, 4)
      .map(c => c.name);
  });
  return out;
}

export const SCORERS_BY_TEAM = buildScorersByTeam(PLAYERS);
