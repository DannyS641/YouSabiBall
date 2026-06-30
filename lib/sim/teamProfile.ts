import type { Roster } from '../types';

export function generateNickname(roster: Roster): string {
  const pg = roster.PG?.ovr ?? 0;
  const sg = roster.SG?.ovr ?? 0;
  const sf = roster.SF?.ovr ?? 0;
  const pf = roster.PF?.ovr ?? 0;
  const c  = roster.C?.ovr  ?? 0;

  const vals       = [pg, sg, sf, pf, c].filter(x => x > 0);
  const avg        = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  const max        = vals.length ? Math.max(...vals) : 0;
  const min        = vals.length === 5 ? Math.min(...vals) : 0;
  const backcourt  = pg && sg ? (pg + sg) / 2 : pg || sg;
  const frontcourt = pf && c  ? (pf + c)  / 2 : pf || c;

  const starPos =
    max === pg ? 'PG' : max === sg ? 'SG' :
    max === sf ? 'SF' : max === pf ? 'PF' : 'C';

  if (max >= 99)                            return 'The GOAT Squad';
  if (max >= 95 && backcourt > frontcourt)  return 'The Point Gods';
  if (max >= 95)                            return 'The Paint Kings';
  if (avg >= 92)                            return 'The All-Stars';
  if (vals.length === 5 && max - min <= 2)  return 'The Perfect System';
  if (backcourt >= frontcourt + 5)          return 'The Backcourt Bandits';
  if (frontcourt >= backcourt + 5)          return 'The Paint Bullies';
  if (starPos === 'SF' && sf >= 91)         return 'The Wing Commanders';
  if (starPos === 'C'  && c  >= 90)         return 'The Rim Protectors';
  if (avg >= 90)                            return 'The Dream Team';
  if (avg >= 88)                            return 'The Contenders';
  if (avg >= 86)                            return 'The Dark Horses';
  return 'The Underdogs';
}

export interface TeamProfile {
  overall:    number;
  backcourt:  number;
  wing:       number;
  frontcourt: number;
  tags:       string[];
  description: string;
}

export function getTeamProfile(roster: Roster): TeamProfile {
  const pg = roster.PG?.ovr ?? 0;
  const sg = roster.SG?.ovr ?? 0;
  const sf = roster.SF?.ovr ?? 0;
  const pf = roster.PF?.ovr ?? 0;
  const c  = roster.C?.ovr  ?? 0;

  const filled = [pg, sg, sf, pf, c].filter(x => x > 0);
  const overall = filled.length
    ? Math.round(filled.reduce((a, b) => a + b, 0) / filled.length) : 0;

  const backcourt  = pg && sg ? Math.round((pg + sg) / 2) : pg || sg;
  const wing       = sf;
  const frontcourt = pf && c ? Math.round((pf + c) / 2) : pf || c;

  const tags: string[] = [];

  if (backcourt >= 91)      tags.push('Guard-driven');
  else if (frontcourt >= 90) tags.push('Post presence');
  else                       tags.push('Balanced');

  const star = Math.max(pg, sg, sf, pf, c);
  if (star >= 95)       tags.push('Franchise star');
  else if (star >= 91)  tags.push('Star power');
  else                  tags.push('Deep roster');

  if (overall >= 91)      tags.push('Title favorite');
  else if (overall >= 88) tags.push('Contender');
  else if (overall >= 85) tags.push('Playoff ready');
  else                    tags.push('Underdog');

  const descriptions: Record<string, string> = {
    'Guard-driven': 'A backcourt-led team that lives on the perimeter — push the pace, hunt switches, and let the guards create.',
    'Post presence': 'Built around the paint — dominate inside, control the boards, and grind out wins in the half-court.',
    'Balanced':      'A versatile squad with no clear weakness — capable of winning in multiple ways depending on the matchup.',
  };

  return {
    overall, backcourt, wing, frontcourt, tags,
    description: descriptions[tags[0]] ?? descriptions['Balanced'],
  };
}
