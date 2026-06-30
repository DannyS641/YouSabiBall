'use client';

import { useGameStore, TIER_COLORS } from '@/store/gameStore';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { tierFor } from '@/lib/sim';

export default function CollectionScreen() {
  const save     = useGameStore(s => s.save);
  const { isMobile } = useBreakpoint();

  if (!save) return null;

  const pulls      = save.bestPulls ?? [];
  const totalPulls = save.stats.pulls;
  const bestOvr    = save.stats.bestPull;
  const topTier    = bestOvr >= 98 ? 'Legend' : bestOvr >= 90 ? 'Diamond' : bestOvr >= 87 ? 'Gold' : bestOvr >= 84 ? 'Silver' : 'Bronze';

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: isMobile ? '20px 14px 80px' : '28px 24px 80px' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4 }}>
          MY VAULT
        </div>
        <div style={{ color: '#111827', fontWeight: 800, fontSize: isMobile ? 22 : 26 }}>Best Pulls</div>
      </div>

      {/* Summary strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 10, marginBottom: 24,
      }}>
        <StatTile label="TOTAL PULLS" value={String(totalPulls)} />
        <StatTile
          label="BEST OVR"
          value={bestOvr ? String(bestOvr) : '—'}
          color={bestOvr ? (TIER_COLORS[topTier as keyof typeof TIER_COLORS] ?? '#111827') : '#9CA3AF'}
        />
        <StatTile label="VAULT SIZE" value={`${pulls.length}/10`} />
      </div>

      {/* Pull cards */}
      {pulls.length === 0 ? (
        <div style={{
          background: '#FFFFFF', borderRadius: 14, border: '1px solid #E5E7EB',
          padding: '48px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <div style={{ color: '#374151', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Vault is empty</div>
          <div style={{ color: '#9CA3AF', fontSize: 13 }}>Your best drafted players will appear here</div>
        </div>
      ) : (
        <>
          {/* Top pull — hero card */}
          {pulls[0] && (() => {
            const card  = pulls[0];
            const tier  = tierFor(card.ovr);
            const color = TIER_COLORS[tier] ?? '#E5E7EB';
            return (
              <div style={{
                background: `linear-gradient(145deg, ${color}22, ${color}08)`,
                border: `2px solid ${color}`,
                borderRadius: 16, padding: isMobile ? '20px 18px' : '24px 28px',
                marginBottom: 16,
                display: 'flex', alignItems: 'center', gap: 20,
                boxShadow: `0 0 0 4px ${color}18`,
              }}>
                <div style={{
                  width: isMobile ? 64 : 80, height: isMobile ? 64 : 80,
                  borderRadius: isMobile ? 14 : 18,
                  background: color, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 900, fontSize: isMobile ? 28 : 36,
                }}>
                  {card.ovr}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color, fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', marginBottom: 4 }}>
                    #1 ALL-TIME · {tier.toUpperCase()}
                  </div>
                  <div style={{ color: '#111827', fontWeight: 900, fontSize: isMobile ? 20 : 24, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {card.name}
                  </div>
                  <div style={{ color: '#6B7280', fontSize: 13, marginTop: 3 }}>
                    {card.pos} · {card.team}
                  </div>
                </div>
                <div style={{ fontSize: isMobile ? 32 : 40, flexShrink: 0 }}>👑</div>
              </div>
            );
          })()}

          {/* Rest of vault */}
          {pulls.length > 1 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
              gap: 10,
            }}>
              {pulls.slice(1).map((card, i) => {
                const tier  = tierFor(card.ovr);
                const color = TIER_COLORS[tier] ?? '#E5E7EB';
                return (
                  <div
                    key={card.name + i}
                    style={{
                      background: '#FFFFFF', borderRadius: 12,
                      border: `2px solid ${color}`,
                      padding: '14px 12px',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}
                  >
                    <div style={{
                      width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                      background: color + '20',
                      border: `1.5px solid ${color}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color, fontWeight: 900, fontSize: 18,
                    }}>
                      {card.ovr}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#111827', fontWeight: 700, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {card.name.split(' ').slice(-1)[0]}
                      </div>
                      <div style={{ color: '#9CA3AF', fontSize: 10, marginTop: 1 }}>
                        {card.pos} · {tier}
                      </div>
                    </div>
                    <div style={{ color: '#D1D5DB', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                      #{i + 2}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Hint */}
      <div style={{ marginTop: 20, color: '#9CA3AF', fontSize: 12, textAlign: 'center' }}>
        Vault tracks your top 10 unique players across all runs · updates every spin
      </div>
    </div>
  );
}

function StatTile({ label, value, color = '#111827' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '14px 10px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
      <div style={{ color: '#9CA3AF', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 5 }}>{label}</div>
      <div style={{ color, fontWeight: 800, fontSize: 20, lineHeight: 1 }}>{value}</div>
    </div>
  );
}
