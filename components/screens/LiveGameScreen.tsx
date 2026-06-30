'use client';

import { useEffect, useRef } from 'react';
import { useGameStore, TIER_COLORS } from '@/store/gameStore';
import { useBreakpoint } from '@/hooks/useBreakpoint';

const TICK_MS = 120;

export default function LiveGameScreen() {
  const live       = useGameStore(s => s.live);
  const tickGame   = useGameStore(s => s.tickGame);
  const skipGame   = useGameStore(s => s.skipGame);
  const continueAG = useGameStore(s => s.continueAfterGame);
  const showHL     = useGameStore(s => s.showHighlightCard);

  const { isMobile } = useBreakpoint();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!live || live.done) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }
    timerRef.current = setInterval(tickGame, TICK_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [live?.done, tickGame]);

  if (!live) return null;

  const progress = live.total > 0 ? (live.idx / live.total) * 100 : 0;
  const youWon   = live.done && live.targetA > live.targetB;

  return (
    <div style={{
      height: 'calc(100dvh - 60px)',
      display: 'flex', flexDirection: 'column',
      padding: isMobile ? '12px 12px' : '16px 24px',
      overflow: 'hidden',
      gap: isMobile ? 8 : 14,
    }}>

      {/* ── Score bar ── */}
      <div style={{
        flexShrink: 0,
        background: '#16181D', borderRadius: 14,
        padding: isMobile ? '10px 16px' : '16px 28px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 10 }}>
          <span style={{ color: '#6B7280', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em' }}>
            {live.roundName.toUpperCase()}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>

          {/* Team A */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {live.aName}
            </div>
            <div style={{ fontWeight: 900, fontSize: isMobile ? 40 : 52, lineHeight: 1, color: live.done ? (youWon ? live.aColor : '#4B5563') : live.aColor, transition: 'color 0.3s' }}>
              {live.done ? live.targetA : live.scoreA}
            </div>
            {live.done && youWon && (
              <div style={{ color: live.aColor, fontSize: 11, fontWeight: 800, marginTop: 4, letterSpacing: '0.06em' }}>WIN</div>
            )}
          </div>

          {/* Progress / vs */}
          <div style={{ flex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            {!live.done ? (
              <>
                <div style={{ color: '#4B5563', fontSize: 13, fontWeight: 700 }}>vs</div>
                <div style={{ width: '100%', height: 6, background: '#2A2D35', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${progress}%`,
                    background: live.ballSide === 'A' ? live.aColor : live.bColor,
                    transition: 'width 0.12s linear, background 0.2s',
                  }} />
                </div>
                <div style={{ color: '#4B5563', fontSize: 10 }}>{live.idx}/{live.total} plays</div>
              </>
            ) : (
              <div style={{ color: '#9CA3AF', fontSize: 14, fontWeight: 700 }}>FINAL</div>
            )}
          </div>

          {/* Team B */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {live.bName}
            </div>
            <div style={{ fontWeight: 900, fontSize: isMobile ? 40 : 52, lineHeight: 1, color: live.done ? (!youWon ? live.bColor : '#4B5563') : live.bColor, transition: 'color 0.3s' }}>
              {live.done ? live.targetB : live.scoreB}
            </div>
            {live.done && !youWon && (
              <div style={{ color: live.bColor, fontSize: 11, fontWeight: 800, marginTop: 4, letterSpacing: '0.06em' }}>WIN</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Court + PBP ── */}
      <div style={{
        flex: 1, minHeight: 0,
        display: isMobile ? 'flex' : 'grid',
        flexDirection: isMobile ? 'column' : undefined,
        gridTemplateColumns: isMobile ? undefined : '1fr 300px',
        gap: isMobile ? 8 : 14,
      }}>

        {/* Court — fixed 2:1 ratio on mobile so SVG never letterboxes */}
        <div style={{
          position: 'relative',
          background: '#E8D5B0', borderRadius: 14, overflow: 'hidden',
          border: '2px solid #C8AA78',
          aspectRatio: isMobile ? '2 / 1' : undefined,
          flexShrink: isMobile ? 0 : undefined,
        }}>
          <CourtSVG />
          {live.aDots.map((dot, i) => (
            <div key={`a${i}`} style={{
              position: 'absolute', left: `${dot.l}%`, top: `${dot.t}%`,
              transform: 'translate(-50%,-50%)',
              width: isMobile ? 26 : 34, height: isMobile ? 26 : 34, borderRadius: '50%',
              background: dot.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: isMobile ? 7 : 9, fontWeight: 700,
              boxShadow: live.ballSide === 'A' ? `0 0 14px ${dot.color}88` : '0 1px 3px rgba(0,0,0,0.2)',
              transition: 'box-shadow 0.2s', zIndex: 2,
            }}>
              {dot.label}
            </div>
          ))}
          {live.bDots.map((dot, i) => (
            <div key={`b${i}`} style={{
              position: 'absolute', left: `${dot.l}%`, top: `${dot.t}%`,
              transform: 'translate(-50%,-50%)',
              width: isMobile ? 20 : 28, height: isMobile ? 20 : 28, borderRadius: '50%',
              background: dot.color,
              boxShadow: live.ballSide === 'B' ? `0 0 14px ${dot.color}88` : '0 1px 3px rgba(0,0,0,0.15)',
              transition: 'box-shadow 0.2s', zIndex: 2,
            }} />
          ))}
          <div style={{
            position: 'absolute',
            left: live.ballSide === 'A' ? '22%' : live.ballSide === 'B' ? '78%' : '50%',
            top: '50%', transform: 'translate(-50%,-50%)',
            fontSize: isMobile ? 16 : 22, zIndex: 3, transition: 'left 0.3s ease',
          }}>🏀</div>
        </div>

        {/* Play-by-play */}
        <div style={{
          background: '#FFFFFF', borderRadius: 14,
          border: '1px solid #E5E7EB',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          flex: isMobile ? 1 : undefined,
          minHeight: isMobile ? 100 : undefined,
        }}>
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid #F3F4F6',
            color: '#9CA3AF', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
            flexShrink: 0,
          }}>
            PLAY-BY-PLAY
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {live.pbp.length === 0 && (
              <div style={{ padding: '24px 16px', color: '#D1D5DB', fontSize: 13, textAlign: 'center' }}>
                Tip-off…
              </div>
            )}
            {live.pbp.slice(0, 12).map((entry, i) => (
              <div key={i} style={{
                padding: '8px 14px',
                borderBottom: '1px solid #F9FAFB',
                opacity: Math.max(0.2, 1 - i * 0.07),
                display: 'flex', alignItems: 'flex-start', gap: 10,
              }}>
                <div style={{ width: 3, flexShrink: 0, alignSelf: 'stretch', background: entry.color, borderRadius: 2 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#374151', fontSize: 12, lineHeight: 1.4 }}>{entry.txt}</div>
                  <div style={{ color: '#9CA3AF', fontSize: 10, marginTop: 2 }}>{entry.tag}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Game-over result ── */}
      {live.done && (
        <div style={{
          flexShrink: 0,
          background: youWon ? '#F5F3FF' : '#F9FAFB',
          border: `2px solid ${youWon ? '#7A3FF2' : '#E5E7EB'}`,
          borderRadius: 14, padding: isMobile ? '12px 14px' : '16px 20px',
        }}>
          {/* Winner row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: isMobile ? 24 : 32 }}>{youWon ? '🏆' : '💔'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#111827', fontWeight: 800, fontSize: isMobile ? 14 : 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{live.winnerName} wins!</div>
              <div style={{ color: '#6B7280', fontSize: 12, marginTop: 1 }}>{live.targetA} – {live.targetB}</div>
            </div>
            {/* POG inline on desktop, stacked on mobile */}
            {live.pog && !isMobile && (
              <div style={{
                background: '#FFFFFF', borderRadius: 10, padding: '10px 14px',
                border: `2px solid ${TIER_COLORS[live.pog.tier] ?? '#E5E7EB'}`,
                display: 'flex', alignItems: 'center', gap: 10, minWidth: 170, flexShrink: 0,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: TIER_COLORS[live.pog.tier] ?? '#E5E7EB',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 900, fontSize: 11,
                }}>
                  {live.pog.pos}
                </div>
                <div>
                  <div style={{ color: '#6B7280', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em' }}>PLAYER OF THE GAME</div>
                  <div style={{ color: '#111827', fontWeight: 700, fontSize: 13, marginTop: 1 }}>{live.pog.name}</div>
                  <div style={{ color: '#9CA3AF', fontSize: 11 }}>{live.pog.pts}pts · {live.pog.ast}ast · {live.pog.reb}reb</div>
                </div>
              </div>
            )}
          </div>
          {/* POG stacked below on mobile */}
          {live.pog && isMobile && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              marginTop: 10, paddingTop: 10, borderTop: `1px solid ${TIER_COLORS[live.pog.tier] ?? '#E5E7EB'}44`,
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 6, flexShrink: 0,
                background: TIER_COLORS[live.pog.tier] ?? '#E5E7EB',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 900, fontSize: 10,
              }}>
                {live.pog.pos}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#6B7280', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em' }}>PLAYER OF THE GAME</div>
                <div style={{ color: '#111827', fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{live.pog.name}</div>
              </div>
              <div style={{ color: '#9CA3AF', fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0 }}>
                {live.pog.pts}pts · {live.pog.ast}ast
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Controls ── */}
      <div style={{ flexShrink: 0, display: 'flex', gap: 10 }}>
        {live.done ? (
          <>
            <button onClick={showHL} style={{ ...ghostBtn, flex: 1 }}>Highlight Card</button>
            <button onClick={continueAG} style={{ ...primaryBtn, flex: 2 }}>Continue →</button>
          </>
        ) : (
          <button onClick={skipGame} style={ghostBtn}>Skip to final</button>
        )}
      </div>
    </div>
  );
}

function CourtSVG() {
  return (
    <svg
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      viewBox="0 0 200 100"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect x="1" y="1" width="198" height="98" fill="none" stroke="#C4A46A" strokeWidth="0.6" />
      <line x1="100" y1="1" x2="100" y2="99" stroke="#C4A46A" strokeWidth="0.6" />
      <circle cx="100" cy="50" r="10" fill="none" stroke="#C4A46A" strokeWidth="0.6" />
      <rect x="1" y="33" width="18" height="34" fill="none" stroke="#C4A46A" strokeWidth="0.6" />
      <rect x="181" y="33" width="18" height="34" fill="none" stroke="#C4A46A" strokeWidth="0.6" />
      <circle cx="19" cy="50" r="9" fill="none" stroke="#C4A46A" strokeWidth="0.5" />
      <circle cx="181" cy="50" r="9" fill="none" stroke="#C4A46A" strokeWidth="0.5" />
      <path d="M 1 18 Q 46 50 1 82" fill="none" stroke="#C4A46A" strokeWidth="0.6" />
      <path d="M 199 18 Q 154 50 199 82" fill="none" stroke="#C4A46A" strokeWidth="0.6" />
      <circle cx="5" cy="50" r="2" fill="none" stroke="#E2622C" strokeWidth="1" />
      <circle cx="195" cy="50" r="2" fill="none" stroke="#E2622C" strokeWidth="1" />
    </svg>
  );
}

const primaryBtn: React.CSSProperties = {
  padding: '12px 20px',
  background: '#16181D', border: 'none', borderRadius: 10,
  color: '#fff', fontSize: 14, fontWeight: 800,
  letterSpacing: '0.04em', cursor: 'pointer',
};
const ghostBtn: React.CSSProperties = {
  padding: '12px 16px',
  background: 'transparent', border: '1px solid #E5E7EB', borderRadius: 10,
  color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer',
};
