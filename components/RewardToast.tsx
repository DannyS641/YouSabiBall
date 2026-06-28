'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { TIER_COLORS } from '@/lib/sim';

export default function RewardToast() {
  const claimToast = useGameStore(s => s.claimToast);
  const badgeToast = useGameStore(s => s.badgeToast);
  const closeToast = useGameStore(s => s.closeToast);

  const visible = !!(claimToast || badgeToast.length);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(closeToast, 5000);
    return () => clearTimeout(t);
  }, [visible, closeToast]);

  if (!visible) return null;

  return (
    <div
      onClick={closeToast}
      style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        zIndex: 100, display: 'flex', flexDirection: 'column', gap: 8,
        alignItems: 'center', cursor: 'pointer',
        animation: 'slideUp 0.3s ease',
        minWidth: 280, maxWidth: 360,
      }}
    >
      {/* Streak / coin reward */}
      {claimToast && (
        <div style={{
          background: '#1E2128',
          border: '2px solid #E2622C',
          borderRadius: 12, padding: '14px 18px',
          width: '100%',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🔥</span>
            <div>
              <div style={{ color: '#F4F5F7', fontWeight: 700, fontSize: 14 }}>
                Daily Streak Claimed!
              </div>
              <div style={{ color: '#E0A93B', fontWeight: 800, fontSize: 13, marginTop: 2 }}>
                +{claimToast.coins} 🪙 — {claimToast.label}
              </div>
            </div>
          </div>

          {/* Pack pull */}
          {claimToast.pull && (
            <div style={{
              marginTop: 10,
              background: '#272B33',
              border: `2px solid ${TIER_COLORS[claimToast.pull.tier as keyof typeof TIER_COLORS] ?? '#3A3F4A'}`,
              borderRadius: 8, padding: '10px 12px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 6,
                background: TIER_COLORS[claimToast.pull.tier as keyof typeof TIER_COLORS] ?? '#3A3F4A',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 900, fontSize: 11,
              }}>
                🃏
              </div>
              <div>
                <div style={{ color: '#F4F5F7', fontWeight: 700, fontSize: 12 }}>
                  {claimToast.pull.name}
                </div>
                <div style={{ color: '#9CA1AC', fontSize: 10 }}>
                  {claimToast.pull.team} · OVR {claimToast.pull.ovr} ·{' '}
                  <span style={{ color: TIER_COLORS[claimToast.pull.tier as keyof typeof TIER_COLORS] ?? '#9CA1AC', fontWeight: 700 }}>
                    {claimToast.pull.tier}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Badge unlocks */}
      {badgeToast.map(badge => (
        <div
          key={badge.id}
          style={{
            background: '#1E2128',
            border: `2px solid ${badge.color}`,
            borderRadius: 12, padding: '12px 16px',
            width: '100%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}
        >
          <span style={{ fontSize: 24 }}>{badge.glyph}</span>
          <div>
            <div style={{ color: '#9CA1AC', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}>
              BADGE UNLOCKED
            </div>
            <div style={{ color: '#F4F5F7', fontWeight: 700, fontSize: 13 }}>{badge.name}</div>
          </div>
        </div>
      ))}

      <div style={{ color: '#4B5563', fontSize: 10 }}>tap to dismiss</div>
    </div>
  );
}
