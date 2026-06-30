'use client';

import { useRef } from 'react';
import { useGameStore, POS_COLORS, TIER_COLORS, lastName } from '@/store/gameStore';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { POSITIONS } from '@/lib/types';
import { tierFor, DRAFT_TOKENS } from '@/lib/sim';

const REEL_ITEM_W = 92;

export default function DraftScreen() {
  const roster      = useGameStore(s => s.roster);
  const reelItems   = useGameStore(s => s.reelItems);
  const spinning    = useGameStore(s => s.spinning);
  const lastPick    = useGameStore(s => s.lastPick);
  const userName    = useGameStore(s => s.userName);
  const spin        = useGameStore(s => s.spin);
  const commitSpin  = useGameStore(s => s.commitSpin);
  const viewTeam    = useGameStore(s => s.viewTeam);
  const enterPlayoffs = useGameStore(s => s.enterPlayoffs);

  const { isMobile } = useBreakpoint();
  const draftToken = useGameStore(s => s.draftToken);
  const reelRef    = useRef<HTMLDivElement>(null);
  const complete   = POSITIONS.every(p => roster[p]);
  const open     = POSITIONS.filter(p => !roster[p]);
  const filled   = POSITIONS.filter(p => roster[p]);

  function handleSpin() {
    spin((items, winIdx) => {
      const el = reelRef.current;
      if (!el) { commitSpin(items[winIdx]); return; }
      const targetX = -(winIdx * REEL_ITEM_W) + el.clientWidth / 2 - REEL_ITEM_W / 2;
      el.style.transition = 'none';
      el.style.transform  = 'translateX(0)';
      void el.offsetWidth;
      el.style.transition = 'transform 2.4s cubic-bezier(0.17, 0.67, 0.12, 1)';
      el.style.transform  = `translateX(${targetX}px)`;
      setTimeout(() => commitSpin(items[winIdx]), 2500);
    });
  }

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: isMobile ? '20px 14px 60px' : '28px 24px 60px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4 }}>
            {userName.toUpperCase()}'S DRAFT
          </div>
          <div style={{ color: '#111827', fontWeight: 800, fontSize: 24 }}>
            Spin to fill your lineup
          </div>
        </div>
        <div style={{ color: '#9CA3AF', fontSize: 13, fontWeight: 600, textAlign: 'right', marginTop: 8 }}>
          {filled.length} / 5<br />
          <span style={{ fontSize: 11 }}>positions</span>
        </div>
      </div>

      {/* Active draft token banner */}
      {draftToken !== 'standard' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: draftToken === 'diamond' ? '#EFF6FF' : '#FFFBEB',
          border: `1.5px solid ${DRAFT_TOKENS[draftToken].color}`,
          borderRadius: 10, padding: '10px 14px', marginBottom: 16,
        }}>
          <span style={{ fontSize: 18 }}>{DRAFT_TOKENS[draftToken].glyph}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ color: '#111827', fontWeight: 700, fontSize: 13 }}>
              {DRAFT_TOKENS[draftToken].label} active
            </span>
            <span style={{ color: '#6B7280', fontSize: 12, marginLeft: 8 }}>
              Pulling OVR {DRAFT_TOKENS[draftToken].minOvr}+ only
            </span>
          </div>
        </div>
      )}

      {/* Position slots */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: isMobile ? 6 : 10, marginBottom: 16 }}>
        {POSITIONS.map(pos => {
          const card      = roster[pos];
          const posColor  = POS_COLORS[pos];
          const tierColor = card ? (TIER_COLORS[tierFor(card.ovr)] ?? '#E5E7EB') : 'transparent';
          return (
            <div
              key={pos}
              style={{
                background: '#FFFFFF', borderRadius: 10,
                border: `2px solid ${card ? tierColor : '#E5E7EB'}`,
                padding: isMobile ? '10px 4px' : '14px 12px',
                textAlign: 'center',
                transition: 'border-color 0.2s',
                minWidth: 0,
              }}
            >
              <div style={{
                color: posColor, fontWeight: 800,
                fontSize: isMobile ? 11 : 13,
                letterSpacing: '0.04em',
                marginBottom: isMobile ? 4 : 6,
              }}>
                {pos}
              </div>
              {card ? (
                <>
                  <div style={{
                    color: '#111827', fontWeight: 700,
                    fontSize: isMobile ? 9 : 12,
                    marginBottom: 2, lineHeight: 1.2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    maxWidth: '100%',
                  }}>
                    {lastName(card.name)}
                  </div>
                  <div style={{
                    color: TIER_COLORS[tierFor(card.ovr)] ?? '#6B7280',
                    fontWeight: 800, fontSize: isMobile ? 14 : 15,
                  }}>
                    {card.ovr}
                  </div>
                </>
              ) : (
                <div style={{ color: '#D1D5DB', fontSize: isMobile ? 10 : 12, marginTop: 2 }}>—</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Spin machine */}
      <div style={{
        background: '#FFFFFF', borderRadius: 14, overflow: 'hidden',
        border: '1px solid #E5E7EB', marginBottom: 20,
      }}>
        <div style={{ overflow: 'hidden', position: 'relative', height: 130 }}>
          {/* Fade overlays */}
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: 80,
            background: 'linear-gradient(to right, #fff, transparent)', zIndex: 2,
          }} />
          <div style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: 80,
            background: 'linear-gradient(to left, #fff, transparent)', zIndex: 2,
          }} />
          {/* Center marker */}
          <div style={{
            position: 'absolute', left: '50%', top: 0, bottom: 0, width: 3,
            background: '#E2622C', zIndex: 3, transform: 'translateX(-50%)',
            borderRadius: 2,
          }} />
          {/* Reel */}
          <div
            ref={reelRef}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              paddingLeft: 8, willChange: 'transform', height: '100%',
            }}
          >
            {reelItems.length > 0 ? (
              reelItems.map((card, i) => <ReelCard key={i} card={card} />)
            ) : (
              <div style={{
                position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#D1D5DB', fontSize: 13, letterSpacing: '0.06em', fontWeight: 600,
              }}>
                PRESS SPIN TO DRAFT
              </div>
            )}
          </div>
        </div>

        {/* Last pick */}
        {lastPick && (
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid #F3F4F6',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 18 }}>🎉</span>
            <div style={{ minWidth: 0 }}>
              <span style={{ color: '#111827', fontWeight: 700, fontSize: 14 }}>{lastPick.name}</span>
              <span style={{ color: '#6B7280', fontSize: 12, marginLeft: 8, whiteSpace: 'nowrap' }}>
                {lastPick.pos} · {lastPick.team} · OVR {lastPick.ovr}
              </span>
            </div>
          </div>
        )}

        {/* Spin button */}
        {!complete && (
          <div style={{ padding: '0 16px 16px' }}>
            <button
              onClick={handleSpin}
              disabled={spinning}
              style={{
                width: '100%', padding: '14px 0',
                background: spinning ? '#F3F4F6' : '#E2622C',
                border: 'none', borderRadius: 10,
                color: spinning ? '#9CA3AF' : '#fff',
                fontSize: 15, fontWeight: 800,
                letterSpacing: '0.06em', cursor: spinning ? 'default' : 'pointer',
              }}
            >
              {spinning ? 'SPINNING…' : `SPIN TO DRAFT${open[0] ? ` (${open[0]})` : ''}`}
            </button>
          </div>
        )}
      </div>

      {/* Complete actions */}
      {complete && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={viewTeam} style={{ ...secondaryBtn, flex: 1 }}>
            VIEW TEAM
          </button>
          <button onClick={enterPlayoffs} style={{ ...primaryBtn, flex: 2 }}>
            ENTER PLAYOFFS →
          </button>
        </div>
      )}
    </div>
  );
}

function ReelCard({ card }: { card: import('@/lib/types').Card }) {
  const tier  = tierFor(card.ovr);
  const color = TIER_COLORS[tier] ?? '#E5E7EB';
  return (
    <div style={{
      width: REEL_ITEM_W - 8, flexShrink: 0,
      background: '#F9FAFB',
      border: `2px solid ${color}`,
      borderRadius: 10, padding: '10px 8px',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', textAlign: 'center',
    }}>
      <div style={{ fontWeight: 900, fontSize: 22, color, lineHeight: 1 }}>{card.ovr}</div>
      <div style={{ color: '#374151', fontSize: 10, fontWeight: 700, marginTop: 4, lineHeight: 1.2 }}>
        {lastName(card.name)}
      </div>
      <div style={{ color: '#9CA3AF', fontSize: 9, marginTop: 2 }}>{card.pos}</div>
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  padding: '13px 20px',
  background: '#16181D', border: 'none', borderRadius: 10,
  color: '#fff', fontSize: 14, fontWeight: 800,
  letterSpacing: '0.04em', cursor: 'pointer',
};
const secondaryBtn: React.CSSProperties = {
  padding: '13px 20px',
  background: 'transparent',
  border: '2px solid #E5E7EB', borderRadius: 10,
  color: '#374151', fontSize: 14, fontWeight: 700,
  letterSpacing: '0.04em', cursor: 'pointer',
};
