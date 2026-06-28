'use client';

import { useGameStore, fmtCoins, getStepPhase, getDailyChallengesLeft, getFriendsBadgeCount } from '@/store/gameStore';

export default function Navbar() {
  const phase             = useGameStore(s => s.phase);
  const userName          = useGameStore(s => s.userName);
  const save              = useGameStore(s => s.save);
  const pendingRequests   = useGameStore(s => s.pendingRequests);
  const incomingChallenges = useGameStore(s => s.incomingChallenges);
  const viewLb            = useGameStore(s => s.viewLeaderboard);
  const viewChallenges    = useGameStore(s => s.viewChallenges);
  const viewFriends       = useGameStore(s => s.viewFriends);
  const goHome            = useGameStore(s => s.goHome);

  const step           = getStepPhase(phase);
  const showSteps      = step > 0;
  const challengesLeft = getDailyChallengesLeft(save);
  const friendsBadge   = getFriendsBadgeCount(pendingRequests, incomingChallenges);

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      height: 60,
      background: '#FFFFFF',
      borderBottom: '1px solid #E5E7EB',
      display: 'flex', alignItems: 'center',
      padding: '0 24px', gap: 16,
    }}>
      {/* Logo */}
      <button onClick={goHome} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
        <div style={{
          width: 28, height: 28, background: '#16181D', borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 900, fontSize: 14,
          fontFamily: 'var(--font-mono, monospace)',
        }}>
          H
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: '#16181D', letterSpacing: '0.02em' }}>HARDWOOD</span>
          <span style={{ fontSize: 11, color: '#9CA3AF', letterSpacing: '0.08em', fontWeight: 600 }}>
            DRAFT · COURT · GLORY
          </span>
        </div>
      </button>

      {/* Step indicator */}
      {showSteps && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, flex: 1, justifyContent: 'center' }}>
          {(['1 · DRAFT', '2 · TEAM', '3 · PLAYOFFS'] as const).map((label, i) => {
            const s = i + 1;
            const active = step === s;
            const done   = step > s;
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  padding: '5px 14px',
                  background: active ? '#16181D' : 'transparent',
                  borderRadius: 20,
                  color: active ? '#fff' : done ? '#9CA3AF' : '#D1D5DB',
                  fontWeight: 700, fontSize: 12, letterSpacing: '0.06em',
                  whiteSpace: 'nowrap',
                }}>
                  {label}
                </div>
                {i < 2 && (
                  <div style={{ width: 16, height: 1, background: '#E5E7EB' }} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Spacer when no steps */}
      {!showSteps && <div style={{ flex: 1 }} />}

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {/* Coin balance */}
        {save && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: 20, padding: '4px 12px',
          }}>
            <span style={{ fontSize: 14 }}>🪙</span>
            <span style={{ color: '#92400E', fontWeight: 700, fontSize: 13 }}>
              {fmtCoins(save)}
            </span>
          </div>
        )}

        {/* Profile dot */}
        {userName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7A3FF2' }} />
            <span style={{ color: '#374151', fontWeight: 600, fontSize: 13, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userName}
            </span>
          </div>
        )}

        <button onClick={goHome} style={navBtn}>Home</button>
        <button onClick={viewChallenges} style={{ ...navBtn, position: 'relative' }}>
          Challenges
          {challengesLeft > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -4,
              width: 14, height: 14, borderRadius: '50%',
              background: '#E2622C',
              color: '#fff', fontSize: 8, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {challengesLeft}
            </span>
          )}
        </button>
        <button onClick={viewFriends} style={{ ...navBtn, position: 'relative' }}>
          Friends
          {friendsBadge > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -4,
              width: 14, height: 14, borderRadius: '50%',
              background: '#7A3FF2',
              color: '#fff', fontSize: 8, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {friendsBadge}
            </span>
          )}
        </button>
        {phase !== 'leaderboard' && (
          <button onClick={viewLb} style={navBtn}>Leaderboard</button>
        )}
      </div>
    </nav>
  );
}

const navBtn: React.CSSProperties = {
  background: 'none',
  border: '1px solid #E5E7EB',
  borderRadius: 8, padding: '5px 12px',
  color: '#374151', fontSize: 13, fontWeight: 600,
  cursor: 'pointer',
};
