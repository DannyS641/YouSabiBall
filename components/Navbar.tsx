'use client';

import { useState } from 'react';
import { useGameStore, fmtCoins, getStepPhase, getDailyChallengesLeft, getFriendsBadgeCount } from '@/store/gameStore';
import { supabase } from '@/supabase/client';
import { useBreakpoint } from '@/hooks/useBreakpoint';

export default function Navbar() {
  const phase              = useGameStore(s => s.phase);
  const userName           = useGameStore(s => s.userName);
  const save               = useGameStore(s => s.save);
  const authUser           = useGameStore(s => s.authUser);
  const pendingRequests    = useGameStore(s => s.pendingRequests);
  const incomingChallenges = useGameStore(s => s.incomingChallenges);
  const viewLb             = useGameStore(s => s.viewLeaderboard);
  const viewChallenges     = useGameStore(s => s.viewChallenges);
  const viewFriends        = useGameStore(s => s.viewFriends);
  const viewHistory        = useGameStore(s => s.viewHistory);
  const viewShop           = useGameStore(s => s.viewShop);
  const viewCollection     = useGameStore(s => s.viewCollection);
  const viewSettings       = useGameStore(s => s.viewSettings);
  const viewSeasonHub      = useGameStore(s => s.viewSeasonHub);
  const goHome             = useGameStore(s => s.goHome);
  const logout             = useGameStore(s => s.logout);

  const { isMobile } = useBreakpoint();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    logout();
    setMenuOpen(false);
  }

  const step           = getStepPhase(phase);
  const showSteps      = step > 0 && !isMobile;
  const challengesLeft = getDailyChallengesLeft(save);
  const friendsBadge   = getFriendsBadgeCount(pendingRequests, incomingChallenges);
  const totalBadge     = challengesLeft + friendsBadge;

  function NavBtn({ label, onClick, badge }: { label: string; onClick: () => void; badge?: number }) {
    return (
      <button
        onClick={() => { onClick(); setMenuOpen(false); }}
        style={{
          ...navBtn,
          position: 'relative',
          ...(isMobile ? { width: '100%', textAlign: 'left', padding: '12px 16px', borderRadius: 10, fontSize: 15 } : {}),
        }}
      >
        {label}
        {!!badge && badge > 0 && (
          <span style={{
            position: 'absolute',
            top: isMobile ? '50%' : -4,
            right: isMobile ? 16 : -4,
            transform: isMobile ? 'translateY(-50%)' : 'none',
            width: 16, height: 16, borderRadius: '50%',
            background: '#E2622C', color: '#fff',
            fontSize: 9, fontWeight: 800,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>{badge}</span>
        )}
      </button>
    );
  }

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        height: 60,
        background: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: 12,
      }}>
        {/* Logo */}
        <button
          onClick={() => { goHome(); setMenuOpen(false); }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
        >
          <div style={{
            width: 28, height: 28, background: '#16181D', borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 900, fontSize: 14,
            fontFamily: 'var(--font-mono, monospace)',
          }}>Y</div>
          <span style={{ fontWeight: 800, fontSize: isMobile ? 13 : 15, color: '#16181D', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
            YOU SABI BALL
          </span>
        </button>

        {/* Step indicator – desktop only */}
        {showSteps && (
          <div style={{ display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
            {(['1 · DRAFT', '2 · TEAM', '3 · PLAYOFFS'] as const).map((label, i) => {
              const s = i + 1;
              const active = step === s, done = step > s;
              return (
                <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    padding: '5px 14px',
                    background: active ? '#16181D' : 'transparent',
                    borderRadius: 20,
                    color: active ? '#fff' : done ? '#9CA3AF' : '#D1D5DB',
                    fontWeight: 700, fontSize: 12, letterSpacing: '0.06em', whiteSpace: 'nowrap',
                  }}>{label}</div>
                  {i < 2 && <div style={{ width: 16, height: 1, background: '#E5E7EB' }} />}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* Desktop right side */}
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {save && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: '#FFFBEB', border: '1px solid #FDE68A',
                borderRadius: 20, padding: '4px 10px',
              }}>
                <span style={{ fontSize: 13 }}>🪙</span>
                <span style={{ color: '#92400E', fontWeight: 700, fontSize: 12 }}>{fmtCoins(save)}</span>
              </div>
            )}
            {userName && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#7A3FF2' }} />
                <span style={{ color: '#374151', fontWeight: 600, fontSize: 12, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {userName}
                </span>
              </div>
            )}
            <NavBtn label="Home"        onClick={goHome} />
            <NavBtn label="Season"      onClick={viewSeasonHub} />
            <NavBtn label="Shop"        onClick={viewShop} />
            <NavBtn label="Vault"       onClick={viewCollection} />
            <NavBtn label="History"     onClick={viewHistory} />
            <NavBtn label="Challenges"  onClick={viewChallenges} badge={challengesLeft || undefined} />
            <NavBtn label="Friends"     onClick={viewFriends}    badge={friendsBadge   || undefined} />
            {phase !== 'leaderboard' && <NavBtn label="Leaderboard" onClick={viewLb} />}
            <NavBtn label="Settings"    onClick={viewSettings} />
            {authUser && (
              <button onClick={handleLogout} style={logoutBtn}>Log out</button>
            )}
          </div>
        )}

        {/* Mobile: coin + hamburger */}
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {save && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: '#FFFBEB', border: '1px solid #FDE68A',
                borderRadius: 20, padding: '3px 8px',
              }}>
                <span style={{ fontSize: 12 }}>🪙</span>
                <span style={{ color: '#92400E', fontWeight: 700, fontSize: 11 }}>{fmtCoins(save)}</span>
              </div>
            )}
            <button
              onClick={() => setMenuOpen(o => !o)}
              style={{
                position: 'relative',
                background: 'none', border: '1px solid #E5E7EB', borderRadius: 8,
                width: 36, height: 36,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                cursor: 'pointer', padding: 0, flexShrink: 0,
              }}
            >
              <div style={{ width: 16, height: 1.5, background: '#374151', borderRadius: 1 }} />
              <div style={{ width: 16, height: 1.5, background: '#374151', borderRadius: 1 }} />
              <div style={{ width: 16, height: 1.5, background: '#374151', borderRadius: 1 }} />
              {totalBadge > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  width: 16, height: 16, borderRadius: '50%',
                  background: '#E2622C', color: '#fff',
                  fontSize: 9, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{totalBadge}</span>
              )}
            </button>
          </div>
        )}
      </nav>

      {/* Mobile dropdown menu */}
      {isMobile && menuOpen && (
        <div style={{
          position: 'fixed', top: 60, left: 0, right: 0, zIndex: 49,
          background: '#FFFFFF', borderBottom: '1px solid #E5E7EB',
          padding: '8px 16px 16px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
        }}>
          {userName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0 14px', borderBottom: '1px solid #F3F4F6', marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#7A3FF2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14 }}>
                {(userName[0] || '?').toUpperCase()}
              </div>
              <div>
                <div style={{ color: '#111827', fontWeight: 700, fontSize: 14 }}>{userName}</div>
                <div style={{ color: '#9CA3AF', fontSize: 11 }}>General Manager</div>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <NavBtn label="🏠  Home"         onClick={goHome} />
            <NavBtn label="🏟️  Season"       onClick={viewSeasonHub} />
            <NavBtn label="🛒  Shop"         onClick={viewShop} />
            <NavBtn label="💎  Vault"        onClick={viewCollection} />
            <NavBtn label="📋  History"      onClick={viewHistory} />
            <NavBtn label="⚡  Challenges"   onClick={viewChallenges} badge={challengesLeft || undefined} />
            <NavBtn label="👥  Friends"      onClick={viewFriends}    badge={friendsBadge   || undefined} />
            <NavBtn label="🏆  Leaderboard"  onClick={viewLb} />
            <NavBtn label="⚙️  Settings"     onClick={viewSettings} />
            {authUser && (
              <button onClick={handleLogout} style={{ ...logoutBtn, width: '100%', textAlign: 'left', padding: '12px 16px', borderRadius: 10, fontSize: 15, marginTop: 4 }}>
                🚪  Log out
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const navBtn: React.CSSProperties = {
  background: 'none', border: '1px solid #E5E7EB', borderRadius: 8,
  padding: '5px 12px', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
const logoutBtn: React.CSSProperties = {
  background: 'none', border: '1px solid #FCA5A5', borderRadius: 8,
  padding: '5px 12px', color: '#DC2626', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
