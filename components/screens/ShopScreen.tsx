'use client';

import { useState, useEffect } from 'react';
import { useGameStore, TIER_COLORS, fmtCoins } from '@/store/gameStore';
import { DRAFT_TOKENS, PACKS, tierFor } from '@/lib/sim';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import type { Card } from '@/lib/types';

export default function ShopScreen() {
  const save       = useGameStore(s => s.save);
  const draftToken = useGameStore(s => s.draftToken);
  const packResult = useGameStore(s => s.packResult);
  const buyToken   = useGameStore(s => s.buyDraftToken);
  const openPack   = useGameStore(s => s.openPack);
  const closePack  = useGameStore(s => s.closePack);

  const { isMobile } = useBreakpoint();

  if (!save) return null;
  const coins = save.coins;

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: isMobile ? '20px 14px 80px' : '28px 24px 80px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4 }}>
            HARDWOOD SHOP
          </div>
          <div style={{ color: '#111827', fontWeight: 800, fontSize: isMobile ? 22 : 26 }}>Shop</div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: '#FFFBEB', border: '1px solid #FDE68A',
          borderRadius: 20, padding: '6px 14px',
        }}>
          <span style={{ fontSize: 16 }}>🪙</span>
          <span style={{ color: '#92400E', fontWeight: 800, fontSize: 15 }}>{fmtCoins(save)}</span>
        </div>
      </div>

      {/* Active token banner */}
      {draftToken !== 'standard' && (
        <div style={{
          background: draftToken === 'diamond' ? '#EFF6FF' : '#FFFBEB',
          border: `2px solid ${draftToken === 'diamond' ? '#4FB0E0' : '#E0A93B'}`,
          borderRadius: 12, padding: '12px 16px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 22 }}>{DRAFT_TOKENS[draftToken].glyph}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#111827', fontWeight: 700, fontSize: 14 }}>
              {DRAFT_TOKENS[draftToken].label} equipped
            </div>
            <div style={{ color: '#6B7280', fontSize: 12, marginTop: 1 }}>
              Active for your next draft · auto-consumed when playoffs start
            </div>
          </div>
          <div style={{
            background: '#16181D', color: '#fff',
            fontSize: 10, fontWeight: 800, letterSpacing: '0.06em',
            borderRadius: 6, padding: '3px 8px',
          }}>ACTIVE</div>
        </div>
      )}

      {/* ── Draft Tokens ── */}
      <div style={{ marginBottom: 28 }}>
        <SectionHeader
          title="Draft Tokens"
          subtitle="Boost your next run's draft pool — consumed when you enter playoffs"
        />
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
          {(['gold', 'diamond'] as const).map(tier => {
            const token    = DRAFT_TOKENS[tier];
            const equipped = draftToken === tier;
            const canBuy   = coins >= token.cost && !equipped;
            const isActive = draftToken !== 'standard' && draftToken !== tier;
            return (
              <div
                key={tier}
                style={{
                  background: '#FFFFFF', borderRadius: 14,
                  border: `2px solid ${equipped ? token.color : '#E5E7EB'}`,
                  padding: '18px 18px 14px',
                  boxShadow: equipped ? `0 0 0 4px ${token.color}22` : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                    background: token.color + '18',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24,
                  }}>
                    {token.glyph}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#111827', fontWeight: 800, fontSize: 15 }}>{token.label}</div>
                    <div style={{ color: '#6B7280', fontSize: 12, marginTop: 2, lineHeight: 1.4 }}>{token.desc}</div>
                  </div>
                </div>

                {/* Tier pills */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                  <TierPill label={`OVR ${token.minOvr}+`} color={token.color} />
                  <TierPill label="1-run" color="#9CA3AF" />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 15 }}>🪙</span>
                    <span style={{ color: '#111827', fontWeight: 800, fontSize: 17 }}>{token.cost.toLocaleString()}</span>
                  </div>
                  <button
                    onClick={() => buyToken(tier)}
                    disabled={!canBuy}
                    style={{
                      background: equipped ? token.color : canBuy ? '#16181D' : '#F3F4F6',
                      border: 'none', borderRadius: 9,
                      padding: '9px 18px',
                      color: equipped ? '#fff' : canBuy ? '#fff' : '#9CA3AF',
                      fontWeight: 800, fontSize: 13,
                      letterSpacing: '0.04em',
                      cursor: canBuy ? 'pointer' : 'default',
                    }}
                  >
                    {equipped ? '✓ Equipped' : isActive ? 'Swap' : coins < token.cost ? 'Need coins' : 'Equip'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Packs ── */}
      <div>
        <SectionHeader
          title="Player Packs"
          subtitle="Reveal random players — adds to your pull count for badge tracking"
        />
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
          {(['basic', 'gold'] as const).map(packType => {
            const pack   = PACKS[packType];
            const canBuy = coins >= pack.cost;
            return (
              <div
                key={packType}
                style={{
                  background: '#FFFFFF', borderRadius: 14,
                  border: '1px solid #E5E7EB',
                  padding: '18px 18px 14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                    background: pack.color + '22',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24,
                  }}>
                    {pack.glyph}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#111827', fontWeight: 800, fontSize: 15 }}>{pack.label}</div>
                    <div style={{ color: '#6B7280', fontSize: 12, marginTop: 2 }}>{pack.desc}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                  <TierPill label={`${pack.count} cards`} color={pack.color} />
                  {pack.minOvr > 0 && <TierPill label={`OVR ${pack.minOvr}+`} color={pack.color} />}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 15 }}>🪙</span>
                    <span style={{ color: '#111827', fontWeight: 800, fontSize: 17 }}>{pack.cost}</span>
                  </div>
                  <button
                    onClick={() => openPack(packType)}
                    disabled={!canBuy}
                    style={{
                      background: canBuy ? '#E2622C' : '#F3F4F6',
                      border: 'none', borderRadius: 9,
                      padding: '9px 18px',
                      color: canBuy ? '#fff' : '#9CA3AF',
                      fontWeight: 800, fontSize: 13,
                      letterSpacing: '0.04em',
                      cursor: canBuy ? 'pointer' : 'default',
                    }}
                  >
                    {canBuy ? 'Open' : 'Need coins'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Pack opening modal ── */}
      {packResult && (
        <PackModal cards={packResult} onClose={closePack} />
      )}
    </div>
  );
}

// ─── Pack opening modal ───────────────────────────────────────────────────────

function PackModal({ cards, onClose }: { cards: Card[]; onClose: () => void }) {
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (revealed >= cards.length) return;
    const t = setTimeout(() => setRevealed(r => r + 1), revealed === 0 ? 400 : 550);
    return () => clearTimeout(t);
  }, [revealed, cards.length]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={revealed >= cards.length ? onClose : undefined}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 420,
          background: '#16181D', borderRadius: 20,
          padding: '28px 24px 24px',
          border: '1px solid #374151',
        }}
      >
        <div style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textAlign: 'center', marginBottom: 6 }}>
          PACK REVEAL
        </div>
        <div style={{ color: '#F4F5F7', fontWeight: 800, fontSize: 20, textAlign: 'center', marginBottom: 24 }}>
          {revealed < cards.length ? 'Revealing…' : 'Pack opened!'}
        </div>

        {/* Cards */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 24 }}>
          {cards.map((card, i) => {
            const isRevealed = i < revealed;
            const tier  = tierFor(card.ovr);
            const color = TIER_COLORS[tier] ?? '#9CA3AF';
            return (
              <div
                key={i}
                style={{
                  flex: 1, maxWidth: 110,
                  borderRadius: 14,
                  border: `2px solid ${isRevealed ? color : '#374151'}`,
                  background: isRevealed ? color + '18' : '#1E2128',
                  padding: '18px 10px',
                  textAlign: 'center',
                  opacity: isRevealed ? 1 : 0.35,
                  transform: isRevealed ? 'scale(1)' : 'scale(0.92)',
                  transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
                  boxShadow: isRevealed ? `0 0 18px ${color}44` : 'none',
                }}
              >
                {isRevealed ? (
                  <>
                    <div style={{ color, fontWeight: 900, fontSize: 28, lineHeight: 1 }}>{card.ovr}</div>
                    <div style={{ color, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', marginTop: 4 }}>
                      {tier.toUpperCase()}
                    </div>
                    <div style={{ color: '#F4F5F7', fontWeight: 700, fontSize: 11, marginTop: 8, lineHeight: 1.3 }}>
                      {card.name.split(' ').slice(-1)[0]}
                    </div>
                    <div style={{ color: '#9CA3AF', fontSize: 10, marginTop: 3 }}>{card.pos}</div>
                  </>
                ) : (
                  <div style={{ color: '#374151', fontSize: 28 }}>?</div>
                )}
              </div>
            );
          })}
        </div>

        {revealed >= cards.length ? (
          <button
            onClick={onClose}
            style={{
              width: '100%', padding: '13px 0',
              background: '#E2622C', border: 'none', borderRadius: 10,
              color: '#fff', fontWeight: 800, fontSize: 14,
              letterSpacing: '0.04em', cursor: 'pointer',
            }}
          >
            Done
          </button>
        ) : (
          <div style={{ textAlign: 'center', color: '#6B7280', fontSize: 12 }}>
            {cards.length - revealed} card{cards.length - revealed !== 1 ? 's' : ''} remaining…
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ color: '#111827', fontWeight: 700, fontSize: 16 }}>{title}</div>
      <div style={{ color: '#9CA3AF', fontSize: 12, marginTop: 2 }}>{subtitle}</div>
    </div>
  );
}

function TierPill({ label, color }: { label: string; color: string }) {
  return (
    <div style={{
      background: color + '18',
      border: `1px solid ${color}44`,
      borderRadius: 20, padding: '2px 8px',
      color, fontWeight: 700, fontSize: 10,
      letterSpacing: '0.06em',
    }}>
      {label}
    </div>
  );
}
