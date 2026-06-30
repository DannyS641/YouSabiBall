// ─── Coaching Perks (Phase 8) ─────────────────────────────────────────────────
// Perks are chosen once per run before entering playoffs.
// `boost` adds to _diffBias (team rating advantage vs CPU).
// `cost`  deducts coins when the perk is selected (0 = free).

export interface Perk {
  id:     string;
  name:   string;
  desc:   string;
  glyph:  string;
  boost:  number;   // added to _diffBias
  cost:   number;   // coins; 0 = free
}

export const PERK_POOL: Perk[] = [
  { id: 'clutch',   name: 'Clutch Factor',       glyph: '💎', desc: 'Your squad rises when the stakes are highest.',     boost: 3, cost: 0   },
  { id: 'offense',  name: 'Offensive Firepower',  glyph: '🔥', desc: 'Put up big numbers every single game.',            boost: 5, cost: 150 },
  { id: 'defense',  name: 'Defensive Wall',       glyph: '🛡️', desc: 'Opponents struggle to find open looks.',           boost: 4, cost: 0   },
  { id: 'star',     name: 'Star Power',           glyph: '⭐', desc: 'Your best player goes supernova all playoffs.',    boost: 5, cost: 200 },
  { id: 'dna',      name: 'Championship DNA',     glyph: '🏆', desc: 'Every round the team gets sharper and colder.',   boost: 3, cost: 0   },
  { id: 'depth',    name: 'Bench Depth',          glyph: '💪', desc: 'Everyone contributes — no weak links.',            boost: 2, cost: 0   },
  { id: 'underdog', name: 'Underdog Spirit',      glyph: '🐉', desc: 'Thrive when everyone counts you out.',             boost: 6, cost: 0   },
  { id: 'pace',     name: 'Fast Break Offense',   glyph: '⚡', desc: 'Win in transition before opponents settle.',       boost: 4, cost: 0   },
  { id: 'iq',       name: 'Basketball IQ',        glyph: '🧠', desc: 'Smart reads and crisp execution every possession.', boost: 4, cost: 100 },
  { id: 'paint',    name: 'Paint Domination',     glyph: '🏀', desc: 'Own the interior on both ends of the floor.',      boost: 3, cost: 0   },
];

/** Return 3 distinct random perks from the pool. */
export function drawPerks(): Perk[] {
  const shuffled = [...PERK_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}
