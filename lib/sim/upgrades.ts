// ─── Between-Round Upgrades (Phase 10) ───────────────────────────────────────
// Shown after winning each bracket round before the next one.
// Free, smaller boosts than perks — they stack across the run.

export interface Upgrade {
  id:    string;
  name:  string;
  desc:  string;
  glyph: string;
  boost: number;   // added to _diffBias for remainder of run
}

export const UPGRADE_POOL: Upgrade[] = [
  { id: 'scout',     name: 'Scouting Report',    glyph: '🔭', desc: 'Identified key weaknesses in the next opponent.',   boost: 2 },
  { id: 'crowd',     name: 'Crowd Energy',        glyph: '📣', desc: 'Hometown crowd is electric — momentum carries.',    boost: 2 },
  { id: 'film',      name: 'Film Session',        glyph: '📽️', desc: 'Tactical adjustments after reviewing the tape.',    boost: 2 },
  { id: 'rest',      name: 'Extra Recovery',      glyph: '😴', desc: 'Full rest day — every player arrives at 100%.',    boost: 1 },
  { id: 'momentum',  name: 'Win Streak Energy',   glyph: '🔥', desc: 'Confidence is through the roof after that win.',   boost: 2 },
  { id: 'matchup',   name: 'Favorable Matchup',   glyph: '🎯', desc: 'Film study reveals a clear stylistic edge.',       boost: 2 },
  { id: 'pride',     name: 'Team Pride',          glyph: '💜', desc: 'Playing for something bigger than basketball.',    boost: 2 },
  { id: 'adjust',    name: 'Half-Time Adjustments', glyph: '📊', desc: 'Coach makes the right calls at the right time.', boost: 1 },
];

export function drawUpgrades(): Upgrade[] {
  return [...UPGRADE_POOL].sort(() => Math.random() - 0.5).slice(0, 3);
}
