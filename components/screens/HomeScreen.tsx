'use client';

import { useGameStore, getStreakData, fmtCoins, getWorldRank, getBadgesCount } from '@/store/gameStore';
import { BADGES, TIER_COLORS } from '@/lib/sim';
import type { Tier } from '@/lib/types';

export default function HomeScreen() {
  const userName    = useGameStore(s => s.userName);
  const save        = useGameStore(s => s.save);
  const difficulty  = useGameStore(s => s.difficulty);
  const leaderboard = useGameStore(s => s.leaderboard);
  const lastPull    = useGameStore(s => s.lastPull);
  const startRun    = useGameStore(s => s.startNewRun);
  const claimStreak = useGameStore(s => s.claimStreak);
  const enterLobby  = useGameStore(s => s.enterLobby);

  if (!save) return null;

  const { canClaim, nodes, rewardLabel, streakCount } = getStreakData(save);
  const { rank, total } = getWorldRank(leaderboard, userName);
  const { earned, total: badgeTotal } = getBadgesCount(save);
  const earnedSet = new Set(save.badges ?? []);

  const DIFF_LABEL: Record<string, string> = {
    'Rookie': 'Rookie', 'Pro': 'Pro', 'Hall of Fame': 'Hall of Fame',
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px 60px' }}>

      {/* Profile header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Avatar */}
          <div style={{
            width: 64, height: 64, borderRadius: 14,
            background: '#7A3FF2',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 900, fontSize: 26, flexShrink: 0,
          }}>
            {(userName[0] || '?').toUpperCase()}
          </div>
          <div>
            <div style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4 }}>
              {DIFF_LABEL[difficulty]} · GENERAL MANAGER
            </div>
            <div style={{ color: '#111827', fontWeight: 800, fontSize: 26 }}>{userName}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={enterLobby}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#EDE9FE', border: 'none', borderRadius: 12,
              padding: '12px 16px',
              color: '#7A3FF2', fontWeight: 800, fontSize: 14,
              cursor: 'pointer',
            }}
          >
            ⚡ Duel
          </button>
          <button
            onClick={startRun}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#E2622C', border: 'none', borderRadius: 12,
              padding: '12px 20px',
              color: '#fff', fontWeight: 800, fontSize: 15,
              letterSpacing: '0.02em', cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(226,98,44,0.3)',
            }}
          >
            <span>▶</span> New Run
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label="COINS" value={fmtCoins(save)} sub="" color="#92400E" bg="#FFFBEB" />
        <StatCard
          label="WORLD RANK"
          value={total > 0 ? `#${rank}` : '—'}
          sub={total > 0 ? `of ${total} GMs` : ''}
        />
        <StatCard
          label="TITLES"
          value={String(save.stats.titles)}
          sub={`${save.stats.runs} run${save.stats.runs !== 1 ? 's' : ''} · best ${
            save.stats.bestRound >= 4 ? 'Champion' :
            save.stats.bestRound === 3 ? 'Finals' :
            save.stats.bestRound === 2 ? 'Conf Finals' :
            save.stats.bestRound === 1 ? 'Conf Semis' : '—'
          }`}
        />
        <StatCard label="BADGES" value={`${earned}/${badgeTotal}`} sub="" />
      </div>

      {/* Daily Reward */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={sectionTitle}>Daily Reward</div>
            {streakCount > 0 && (
              <div style={{ color: '#6B7280', fontSize: 12, marginTop: 2 }}>
                {streakCount} day streak 🔥
              </div>
            )}
          </div>
        </div>

        {/* Calendar - horizontal scroll */}
        <div style={{ overflowX: 'auto', marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 6, paddingBottom: 4 }}>
            {nodes.map(node => (
              <div
                key={node.day}
                style={{
                  flexShrink: 0,
                  width: node.tag ? 48 : 40,
                  height: node.tag ? 48 : 40,
                  borderRadius: '50%',
                  background: node.bg,
                  border: `2px solid ${node.ring !== 'transparent' ? node.ring : 'transparent'}`,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  color: node.fg,
                  fontWeight: 700,
                }}
              >
                {node.tag ? (
                  <>
                    <div style={{ fontSize: 7, lineHeight: 1, letterSpacing: '0.04em' }}>{node.tag}</div>
                    <div style={{ fontSize: 11, lineHeight: 1, marginTop: 1 }}>{node.day}</div>
                  </>
                ) : (
                  <div style={{ fontSize: 12 }}>{node.day}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em' }}>
              TODAY'S REWARD
            </div>
            <div style={{ color: '#111827', fontWeight: 700, fontSize: 15, marginTop: 2 }}>
              {rewardLabel}
            </div>
          </div>
          <button
            onClick={claimStreak}
            disabled={!canClaim}
            style={{
              background: canClaim ? '#E2622C' : '#F3F4F6',
              border: 'none', borderRadius: 8,
              padding: '9px 18px',
              color: canClaim ? '#fff' : '#9CA3AF',
              fontWeight: 700, fontSize: 13,
              cursor: canClaim ? 'pointer' : 'default',
              letterSpacing: '0.04em',
            }}
          >
            {canClaim ? 'CLAIM' : 'CLAIMED ✓'}
          </button>
        </div>
      </div>

      {/* Achievements */}
      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={sectionTitle}>Achievements</div>
          <div style={{ color: '#9CA3AF', fontSize: 13, fontWeight: 600 }}>{earned} / {badgeTotal} unlocked</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {BADGES.map(badge => {
            const isEarned = earnedSet.has(badge.id);
            const color = isEarned ? (TIER_COLORS[badge.tier] ?? '#6B7280') : '#D1D5DB';
            return (
              <div
                key={badge.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px',
                  background: isEarned ? '#FAFAFA' : '#F9FAFB',
                  borderRadius: 10,
                  border: `1px solid ${isEarned ? '#E5E7EB' : '#F3F4F6'}`,
                  opacity: isEarned ? 1 : 0.55,
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: isEarned ? color + '22' : '#F3F4F6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: isEarned ? 20 : 16,
                }}>
                  {isEarned ? badge.glyph : '✕'}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: '#111827', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {badge.name}
                  </div>
                  <div style={{ color: '#9CA3AF', fontSize: 10, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {badge.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color = '#111827', bg = '#FFFFFF' }: {
  label: string; value: string; sub: string; color?: string; bg?: string;
}) {
  return (
    <div style={{ background: bg, borderRadius: 12, padding: '16px 18px', border: '1px solid #E5E7EB' }}>
      <div style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ color, fontWeight: 800, fontSize: 26, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: '#6B7280', fontSize: 12, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

const card: React.CSSProperties = {
  background: '#FFFFFF', borderRadius: 14, padding: '20px 20px',
  border: '1px solid #E5E7EB',
};
const sectionTitle: React.CSSProperties = {
  color: '#111827', fontWeight: 700, fontSize: 16,
};
