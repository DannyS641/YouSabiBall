'use client';

import { useGameStore, TIER_COLORS, fmt } from '@/store/gameStore';

export default function HighlightCard() {
  const showHighlight  = useGameStore(s => s.showHighlight);
  const live           = useGameStore(s => s.live);
  const userName       = useGameStore(s => s.userName);
  const champion       = useGameStore(s => s.champion);
  const mvp            = useGameStore(s => s.mvp);
  const runLabel       = useGameStore(s => s.runLabel);
  const pointsEarned   = useGameStore(s => s.pointsEarned);
  const coinsEarned    = useGameStore(s => s.coinsEarned);
  const shareCopied    = useGameStore(s => s.shareCopied);
  const closeHL        = useGameStore(s => s.closeHighlightCard);
  const setShareCopied = useGameStore(s => s.setShareCopied);

  if (!showHighlight) return null;

  const pog = live?.pog;
  const isChamp = !!champion?.isHuman;
  const accentColor = isChamp ? '#E0A93B' : '#7A3FF2';
  const tierColor  = pog ? (TIER_COLORS[pog.tier] ?? '#7A3FF2') : '#7A3FF2';

  function handleShare() {
    const text = isChamp
      ? `🏆 I just won the NBA Championship in YOU SABI BALL as ${userName}! Finals MVP: ${mvp} — ${runLabel}`
      : `🏀 I went ${runLabel} in YOU SABI BALL. Earned +${fmt(pointsEarned)} pts & +${fmt(coinsEarned)} 🪙`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ text }).catch(() => { /* user cancelled */ });
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => setShareCopied(true));
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={closeHL}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#1E2128',
          border: `2px solid ${accentColor}`,
          borderRadius: 18, padding: '28px 24px',
          width: '100%', maxWidth: 360,
          boxShadow: `0 0 40px ${accentColor}44`,
          textAlign: 'center',
        }}
      >
        {/* Trophy or round result */}
        <div style={{ fontSize: 44, marginBottom: 8 }}>
          {isChamp ? '🏆' : '🏀'}
        </div>
        <div style={{ color: accentColor, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', marginBottom: 4 }}>
          {isChamp ? 'NBA CHAMPION' : 'RUN COMPLETE'}
        </div>
        <div style={{ color: '#F4F5F7', fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
          {isChamp ? champion?.name : userName}
        </div>
        <div style={{ color: '#9CA1AC', fontSize: 13, marginBottom: 20 }}>
          {runLabel}
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginBottom: 20 }}>
          <Stat label="POINTS" value={`+${fmt(pointsEarned)}`} color="#7A3FF2" />
          <Stat label="COINS"  value={`+${fmt(coinsEarned)}`}  color="#E0A93B" />
        </div>

        {/* POG card (if available from last played game) */}
        {pog && (
          <div style={{
            background: '#272B33',
            border: `2px solid ${tierColor}`,
            borderRadius: 12, padding: '14px 16px', marginBottom: 20,
            textAlign: 'left',
          }}>
            <div style={{ color: '#9CA1AC', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>
              PLAYER OF THE GAME
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: tierColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 900, fontSize: 14,
                flexShrink: 0,
              }}>
                {pog.pos}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#F4F5F7', fontWeight: 700, fontSize: 14 }}>{pog.name}</div>
                <div style={{ color: '#9CA1AC', fontSize: 11 }}>{pog.team} vs {pog.oppName}</div>
              </div>
              <div>
                <div style={{ color: tierColor, fontWeight: 900, fontSize: 20, lineHeight: 1 }}>{pog.pts}</div>
                <div style={{ color: '#6B7280', fontSize: 9 }}>PTS</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
              <MiniStat label="AST" value={pog.ast} />
              <MiniStat label="REB" value={pog.reb} />
              <MiniStat label="OVR" value={pog.ovr} />
              <MiniStat label="FINAL" value={`${pog.scoreA}–${pog.scoreB}`} />
            </div>
          </div>
        )}

        {/* Champ MVP */}
        {isChamp && mvp && !pog && (
          <div style={{
            background: '#272B33', borderRadius: 10, padding: '12px 14px',
            marginBottom: 20, textAlign: 'left',
          }}>
            <div style={{ color: '#9CA1AC', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}>FINALS MVP</div>
            <div style={{ color: '#F4F5F7', fontWeight: 700, fontSize: 14, marginTop: 4 }}>{mvp}</div>
          </div>
        )}

        {/* Share / close buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={handleShare}
            style={{
              width: '100%', padding: '12px 0',
              background: accentColor, border: 'none', borderRadius: 10,
              color: '#fff', fontSize: 14, fontWeight: 800,
              letterSpacing: '0.06em', cursor: 'pointer',
            }}
          >
            {shareCopied ? '✓ COPIED!' : '📤 SHARE'}
          </button>
          <button
            onClick={closeHL}
            style={{
              width: '100%', padding: '12px 0',
              background: 'transparent',
              border: '2px solid #3A3F4A', borderRadius: 10,
              color: '#9CA1AC', fontSize: 13, fontWeight: 700,
              letterSpacing: '0.06em', cursor: 'pointer',
            }}
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ color: '#6B7280', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ color, fontWeight: 900, fontSize: 22, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ color: '#6B7280', fontSize: 9, fontWeight: 700 }}>{label}</div>
      <div style={{ color: '#D1D5DB', fontWeight: 700, fontSize: 13 }}>{value}</div>
    </div>
  );
}
