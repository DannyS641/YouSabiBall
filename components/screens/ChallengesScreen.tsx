'use client';

import { useGameStore } from '@/store/gameStore';
import {
  CHALLENGE_DEFS, SEASON_REWARDS, XP_PER_LEVEL, MAX_LEVEL,
  getDailyChallenges,
} from '@/lib/sim';
import { todayStr } from '@/lib/sim';

const CATEGORY_COLORS: Record<string, string> = {
  draft:   '#3E78D6',
  run:     '#E2622C',
  game:    '#1F9D6B',
  economy: '#E0A93B',
};

const CATEGORY_LABELS: Record<string, string> = {
  draft: 'DRAFT', run: 'RUN', game: 'GAME', economy: 'DAILY',
};

export default function ChallengesScreen() {
  const save             = useGameStore(s => s.save);
  const goHome           = useGameStore(s => s.goHome);
  const claimSeasonLevel = useGameStore(s => s.claimSeasonLevel);

  if (!save) return null;

  const today    = todayStr();
  const dailies  = getDailyChallenges(today);
  const doneSet  = new Set(
    (save.dailyChallenges ?? []).filter(d => d.date === today && d.completed).map(d => d.defId)
  );

  const sp        = save.seasonPass;
  const xpPct     = Math.min(100, Math.round((sp.xp / XP_PER_LEVEL) * 100));
  const claimed   = new Set(sp.claimed);

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 24px 60px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#FFF7ED', borderRadius: 20,
            padding: '4px 12px', marginBottom: 8,
          }}>
            <span style={{ fontSize: 12 }}>🏀</span>
            <span style={{ color: '#92400E', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em' }}>
              DAILY CHALLENGES
            </span>
          </div>
          <div style={{ color: '#111827', fontWeight: 800, fontSize: 26 }}>Challenges</div>
        </div>
        <button onClick={goHome} style={ghostBtn}>← Back</button>
      </div>

      {/* Daily Challenges */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ color: '#111827', fontWeight: 700, fontSize: 16 }}>Today's Challenges</div>
          <div style={{ color: '#9CA3AF', fontSize: 12 }}>
            {doneSet.size} / {dailies.length} complete
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {dailies.map(def => {
            const done = doneSet.has(def.id);
            const catColor = CATEGORY_COLORS[def.category] ?? '#9CA3AF';
            return (
              <div
                key={def.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px',
                  background: done ? '#F0FDF4' : '#F9FAFB',
                  border: `1px solid ${done ? '#BBF7D0' : '#E5E7EB'}`,
                  borderRadius: 12,
                }}
              >
                {/* Category badge */}
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: done ? '#BBF7D0' : catColor + '15',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {done ? (
                    <span style={{ fontSize: 18 }}>✓</span>
                  ) : (
                    <span style={{ color: catColor, fontSize: 10, fontWeight: 800, letterSpacing: '0.04em' }}>
                      {CATEGORY_LABELS[def.category]}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    color: done ? '#15803D' : '#111827',
                    fontWeight: 700, fontSize: 14,
                    textDecoration: done ? 'line-through' : 'none',
                  }}>
                    {def.name}
                  </div>
                  <div style={{ color: '#6B7280', fontSize: 12, marginTop: 2 }}>{def.desc}</div>
                </div>

                {/* Rewards */}
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <div style={{ color: '#92400E', fontSize: 12, fontWeight: 700 }}>
                    +{def.coins} 🪙
                  </div>
                  <div style={{ color: '#7A3FF2', fontSize: 11, fontWeight: 600, marginTop: 2 }}>
                    +{def.xp} XP
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Season Pass */}
      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>
              SEASON {sp.season}
            </div>
            <div style={{ color: '#111827', fontWeight: 700, fontSize: 16 }}>Season Pass</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#7A3FF2', fontWeight: 800, fontSize: 22 }}>Lvl {sp.level}</div>
            <div style={{ color: '#9CA3AF', fontSize: 11 }}>{sp.xp} / {XP_PER_LEVEL} XP</div>
          </div>
        </div>

        {/* XP Bar */}
        <div style={{ height: 8, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{
            height: '100%', width: `${xpPct}%`,
            background: 'linear-gradient(90deg, #7A3FF2, #A97CF8)',
            borderRadius: 4, transition: 'width 0.4s',
          }} />
        </div>

        {/* Reward track */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
          {SEASON_REWARDS.map(rw => {
            const reached  = sp.level >= rw.level;
            const isClaimed = claimed.has(rw.level);
            const canClaim  = reached && !isClaimed;
            return (
              <div
                key={rw.level}
                style={{
                  flexShrink: 0,
                  width: 90,
                  background: isClaimed ? '#F5F3FF' : reached ? '#FFF7ED' : '#F9FAFB',
                  border: `1px solid ${isClaimed ? '#DDD6FE' : reached ? '#FDE68A' : '#E5E7EB'}`,
                  borderRadius: 10,
                  padding: '10px 8px',
                  textAlign: 'center',
                }}
              >
                <div style={{
                  color: '#9CA3AF', fontSize: 9, fontWeight: 700,
                  letterSpacing: '0.08em', marginBottom: 6,
                }}>
                  LVL {rw.level}
                </div>
                <div style={{ fontSize: isClaimed ? 18 : 14, marginBottom: 4 }}>
                  {isClaimed ? '✓' : rw.badge ? '👑' : '🪙'}
                </div>
                <div style={{
                  color: isClaimed ? '#7A3FF2' : '#374151',
                  fontSize: 10, fontWeight: 700, lineHeight: 1.2,
                }}>
                  {rw.label}
                </div>
                {canClaim && (
                  <button
                    onClick={() => claimSeasonLevel(rw.level)}
                    style={{
                      marginTop: 8, width: '100%',
                      padding: '4px 0',
                      background: '#E2622C', border: 'none', borderRadius: 4,
                      color: '#fff', fontSize: 9, fontWeight: 800,
                      cursor: 'pointer', letterSpacing: '0.04em',
                    }}
                  >
                    CLAIM
                  </button>
                )}
                {!reached && (
                  <div style={{ color: '#D1D5DB', fontSize: 9, marginTop: 6 }}>
                    Lvl {rw.level} required
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* All challenges reference */}
      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ color: '#111827', fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
          All Challenges
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {CHALLENGE_DEFS.map(def => {
            const catColor = CATEGORY_COLORS[def.category] ?? '#9CA3AF';
            return (
              <div key={def.id} style={{
                padding: '10px 12px',
                background: '#F9FAFB', borderRadius: 8,
                border: '1px solid #F3F4F6',
                display: 'flex', alignItems: 'flex-start', gap: 10,
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                  background: catColor + '20',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ color: catColor, fontSize: 9, fontWeight: 800 }}>
                    {CATEGORY_LABELS[def.category]}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#374151', fontWeight: 700, fontSize: 12 }}>{def.name}</div>
                  <div style={{ color: '#9CA3AF', fontSize: 10, marginTop: 1 }}>{def.desc}</div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <div style={{ color: '#9CA3AF', fontSize: 10 }}>+{def.xp} XP</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  background: '#FFFFFF', borderRadius: 14, padding: '20px 20px',
  border: '1px solid #E5E7EB',
};
const ghostBtn: React.CSSProperties = {
  padding: '8px 16px',
  background: 'transparent',
  border: '1px solid #E5E7EB', borderRadius: 8,
  color: '#374151', fontSize: 13, fontWeight: 600,
  cursor: 'pointer',
};
