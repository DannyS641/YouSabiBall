import type { Team } from '@/lib/types';

export const CPU_TEAMS: Omit<Team, 'conf' | 'seed'>[] = [
  { name: 'Thunder',       abbr: 'OKC', rating: 93, isHuman: false, star: 'Shai Gilgeous-Alexander' },
  { name: 'Celtics',       abbr: 'BOS', rating: 91, isHuman: false, star: 'Jayson Tatum' },
  { name: 'Nuggets',       abbr: 'DEN', rating: 90, isHuman: false, star: 'Nikola Jokić' },
  { name: 'Cavaliers',     abbr: 'CLE', rating: 89, isHuman: false, star: 'Donovan Mitchell' },
  { name: 'Knicks',        abbr: 'NYK', rating: 89, isHuman: false, star: 'Jalen Brunson' },
  { name: 'Rockets',       abbr: 'HOU', rating: 88, isHuman: false, star: 'Kevin Durant' },
  { name: 'Timberwolves',  abbr: 'MIN', rating: 88, isHuman: false, star: 'Anthony Edwards' },
  { name: 'Lakers',        abbr: 'LAL', rating: 88, isHuman: false, star: 'Luka Dončić' },
  { name: 'Pacers',        abbr: 'IND', rating: 86, isHuman: false, star: 'Tyrese Haliburton' },
  { name: 'Warriors',      abbr: 'GSW', rating: 86, isHuman: false, star: 'Stephen Curry' },
  { name: 'Spurs',         abbr: 'SAS', rating: 86, isHuman: false, star: 'Victor Wembanyama' },
  { name: 'Bucks',         abbr: 'MIL', rating: 85, isHuman: false, star: 'Giannis Antetokounmpo' },
  { name: 'Magic',         abbr: 'ORL', rating: 85, isHuman: false, star: 'Paolo Banchero' },
  { name: 'Mavericks',     abbr: 'DAL', rating: 84, isHuman: false, star: 'Anthony Davis' },
  { name: 'Pistons',       abbr: 'DET', rating: 84, isHuman: false, star: 'Cade Cunningham' },
];
