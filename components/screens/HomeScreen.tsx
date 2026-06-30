'use client';

import { useGameStore, getStreakData, fmtCoins, getWorldRank, getBadgesCount } from '@/store/gameStore';
import { BADGES, TIER_COLORS } from '@/lib/sim';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import type { Tier } from '@/lib/types';

export default function HomeScreen() {
  const userName    = useGameStore(s => s.userName);
  const save        = useGameStore(s => s.save);
  const difficulty  = useGameStore(s => s.difficulty);
  const leaderboard = useGameStore(s => s.leaderboard);
  const lastPull    = useGameStore(s => s.lastPull);
  const startRun      = useGameStore(s => s.startNewRun);
  const claimStreak   = useGameStore(s => s.claimStreak);
  const enterLobby    = useGameStore(s => s.enterLobby);
  const viewHistory   = useGameStore(s => s.viewHistory);
  const viewSettings  = useGameStore(s => s.viewSettings);

  const { isMobile, isTablet } = useBreakpoint();

  if (!save) return null;

  const { canClaim, nodes, rewardLabel, streakCount } = getStreakData(save);
  const { rank, total } = getWorldRank(leaderboard, userName);
  const { earned, total: badgeTotal } = getBadgesCount(save);
  const earnedSet = new Set(save.badges ?? []);

  const DIFF_LABEL: Record<string, string> = {
    'Rookie': 'Rookie', 'Pro': 'Pro', 'Hall of Fame': 'Hall of Fame',
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '20px 16px 60px' : '28px 24px 60px' }}>

      {/* Profile header */}
      <div style={{
        display: 'flex', alignItems: isMobile ? 'flex-start' : 'center',
        justifyContent: 'space-between', marginBottom: 20, gap: 12,
        flexWrap: isMobile ? 'wrap' : 'nowrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: isMobile ? 52 : 64, height: isMobile ? 52 : 64, borderRadius: 14,
            background: 'linear-gradient(135deg, #7A3FF2, #4C1D95)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 900, fontSize: isMobile ? 22 : 26, flexShrink: 0,
          }}>
            {(userName[0] || '?').toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 3, whiteSpace: 'nowrap' }}>
              {DIFF_LABEL[difficulty]} · GENERAL MANAGER
            </div>
            <div style={{ color: '#111827', fontWeight: 800, fontSize: isMobile ? 18 : 26, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            onClick={enterLobby}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#EDE9FE', border: 'none', borderRadius: 12,
              padding: isMobile ? '10px 12px' : '12px 16px',
              color: '#7A3FF2', fontWeight: 800, fontSize: isMobile ? 13 : 14,
              cursor: 'pointer',
            }}
          >
            ⚡ {isMobile ? 'Duel' : 'Duel'}
          </button>
          <button
            onClick={startRun}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#E2622C', border: 'none', borderRadius: 12,
              padding: isMobile ? '10px 14px' : '12px 20px',
              color: '#fff', fontWeight: 800, fontSize: isMobile ? 13 : 15,
              letterSpacing: '0.02em', cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(226,98,44,0.3)',
            }}
          >
            ▶ New Run
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: 10, marginBottom: 16,
      }}>
        <StatCard label="COINS" value={fmtCoins(save)} sub="" color="#92400E" bg="#FFFBEB" />
        <StatCard
          label="WORLD RANK"
          value={total > 0 ? `#${rank}` : '—'}
          sub={total > 0 ? `of ${total} GMs` : ''}
        />
        <StatCard
          label="RUNS"
          value={String(save.stats.runs)}
          sub={`best: ${
            save.stats.bestRound >= 4 ? 'Champion 🏆' :
            save.stats.bestRound === 3 ? 'Finals' :
            save.stats.bestRound === 2 ? 'Conf Finals' :
            save.stats.bestRound === 1 ? 'Conf Semis' : '—'
          }`}
          onClick={viewHistory}
        />
        <StatCard label="BADGES" value={`${earned}/${badgeTotal}`} sub={`${save.stats.titles} title${save.stats.titles !== 1 ? 's' : ''}`} />
      </div>

      {/* First-run welcome */}
      {save.stats.runs === 0 && (
        <div style={{
          background: '#F5F3FF', border: '1px solid #C4B5FD',
          borderRadius: 12, padding: '14px 16px',
          marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 24, flexShrink: 0 }}>👋</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#111827', fontWeight: 700, fontSize: 14 }}>Welcome to YOU SABI BALL!</div>
            <div style={{ color: '#6B7280', fontSize: 12, marginTop: 2 }}>
              Draft 5 players, enter the playoffs, and become NBA Champion.
            </div>
          </div>
          <button
            onClick={viewSettings}
            style={{
              background: 'none', border: '1px solid #C4B5FD', borderRadius: 8,
              padding: '6px 10px', color: '#7A3FF2', fontSize: 11, fontWeight: 700,
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            How to Play
          </button>
        </div>
      )}

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
      <div style={{ ...card, marginTop: 14, padding: isMobile ? '14px 12px' : '20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={sectionTitle}>Achievements</div>
          <div style={{ color: '#9CA3AF', fontSize: 13, fontWeight: 600 }}>{earned} / {badgeTotal}</div>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : isTablet ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)',
          gap: isMobile ? 6 : 8,
        }}>
          {BADGES.map(badge => {
            const isEarned = earnedSet.has(badge.id);
            const color = isEarned ? (TIER_COLORS[badge.tier] ?? '#6B7280') : '#D1D5DB';
            const iconSize = isMobile ? 28 : 36;
            return (
              <div
                key={badge.id}
                style={{
                  display: 'flex', alignItems: 'center',
                  gap: isMobile ? 7 : 10,
                  padding: isMobile ? '8px 8px' : '10px 12px',
                  background: isEarned ? '#FAFAFA' : '#F9FAFB',
                  borderRadius: 10,
                  border: `1px solid ${isEarned ? '#E5E7EB' : '#F3F4F6'}`,
                  opacity: isEarned ? 1 : 0.55,
                  overflow: 'hidden',   // ← prevents the card itself from overflowing its cell
                  minWidth: 0,
                }}
              >
                <div style={{
                  width: iconSize, height: iconSize, borderRadius: isMobile ? 6 : 8, flexShrink: 0,
                  background: isEarned ? color + '22' : '#F3F4F6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: isMobile ? (isEarned ? 15 : 11) : (isEarned ? 20 : 16),
                }}>
                  {isEarned ? badge.glyph : '✕'}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ color: '#111827', fontWeight: 700, fontSize: isMobile ? 11 : 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {badge.name}
                  </div>
                  <div style={{ color: '#9CA3AF', fontSize: isMobile ? 9 : 10, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

function StatCard({ label, value, sub, color = '#111827', bg = '#FFFFFF', onClick }: {
  label: string; value: string; sub: string; color?: string; bg?: string; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{ background: bg, borderRadius: 12, padding: '14px 16px', border: '1px solid #E5E7EB', cursor: onClick ? 'pointer' : undefined }}
    >
      <div style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 5 }}>
        {label}
      </div>
      <div style={{ color, fontWeight: 800, fontSize: 22, lineHeight: 1 }}>{value}</div>
      {sub && (
        <div style={{ color: '#6B7280', fontSize: 11, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sub}
        </div>
      )}
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
