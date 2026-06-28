'use client';

import { useGameStore, fmt } from '@/store/gameStore';
import BracketTree from '@/components/BracketTree';

export default function BracketScreen() {
  const bracket        = useGameStore(s => s.bracket);
  const simStep        = useGameStore(s => s.simStep);
  const champion       = useGameStore(s => s.champion);
  const mvp            = useGameStore(s => s.mvp);
  const pointsEarned   = useGameStore(s => s.pointsEarned);
  const coinsEarned    = useGameStore(s => s.coinsEarned);
  const runLabel       = useGameStore(s => s.runLabel);
  const simNext        = useGameStore(s => s.simNext);
  const simAll         = useGameStore(s => s.simAll);
  const playRound      = useGameStore(s => s.playRound);
  const startNewRun    = useGameStore(s => s.startNewRun);
  const showHighlightCard = useGameStore(s => s.showHighlightCard);

  const done = simStep >= 4;

  let humanConf: string | null = null;
  let humanSeed: number | null = null;
  if (bracket) {
    const human = bracket.teams.find(t => t.isHuman);
    if (human) { humanConf = human.conf ?? null; humanSeed = human.seed ?? null; }
  }

  return (
    <div style={{
      height: 'calc(100vh - 60px)',
      display: 'flex', flexDirection: 'column',
      padding: '20px 24px 20px',
      overflow: 'hidden',
    }}>

      {/* ── Header row ── */}
      <div style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <div>
          {humanConf && humanSeed && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#F5F3FF', borderRadius: 20,
              padding: '4px 12px', marginBottom: 6,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#7A3FF2' }} />
              <span style={{ color: '#7A3FF2', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em' }}>
                PRO · YOU ARE THE {humanConf.toUpperCase()} {humanSeed} SEED
              </span>
            </div>
          )}
          <div style={{ color: '#111827', fontWeight: 800, fontSize: 24 }}>NBA Playoffs</div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {!done ? (
            <>
              <button onClick={simAll}   style={ghostBtn}>Sim to Finals</button>
              <button onClick={simNext}  style={ghostBtn}>Quick sim</button>
              <button onClick={playRound} style={primaryBtn}>▶ Watch my game</button>
            </>
          ) : (
            <>
              <button onClick={showHighlightCard} style={ghostBtn}>Highlight Card</button>
              <button onClick={startNewRun} style={primaryBtn}>New Run</button>
            </>
          )}
        </div>
      </div>

      {/* ── Champion banner ── */}
      {done && champion?.isHuman && (
        <div style={{
          flexShrink: 0,
          background: 'linear-gradient(135deg, #7A3FF2 0%, #4C1D95 100%)',
          borderRadius: 14, padding: '18px 24px', marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 18,
        }}>
          <div style={{ fontSize: 40 }}>🏆</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#DDD6FE', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 2 }}>
              YOU ARE NBA CHAMPION
            </div>
            <div style={{ color: '#fff', fontWeight: 900, fontSize: 24 }}>{champion.name}</div>
            {mvp && <div style={{ color: '#C4B5FD', fontSize: 12, marginTop: 2 }}>Finals MVP: {mvp}</div>}
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <EarnStat label="POINTS" value={`+${fmt(pointsEarned)}`} color="#DDD6FE" />
            <EarnStat label="COINS"  value={`+${fmt(coinsEarned)}`}  color="#FDE68A" />
          </div>
        </div>
      )}

      {/* ── Non-champion result ── */}
      {done && !champion?.isHuman && runLabel && (
        <div style={{
          flexShrink: 0,
          background: '#fff', borderRadius: 14, padding: '14px 20px', marginBottom: 14,
          border: '1px solid #E5E7EB',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 2 }}>
              RUN COMPLETE
            </div>
            <div style={{ color: '#111827', fontWeight: 700, fontSize: 15 }}>{runLabel}</div>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <EarnStat label="POINTS" value={`+${fmt(pointsEarned)}`} color="#7A3FF2" />
            <EarnStat label="COINS"  value={`+${fmt(coinsEarned)}`}  color="#92400E" />
          </div>
        </div>
      )}

      {/* ── Bracket card – fills remaining space ── */}
      {bracket && (
        <div style={{
          flex: 1, minHeight: 0,
          background: '#FFFFFF', borderRadius: 16,
          padding: '20px 20px 16px',
          border: '1px solid #E5E7EB',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
        }}>
          <BracketTree bracket={bracket} />
        </div>
      )}
    </div>
  );
}

function EarnStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>
        {label}
      </div>
      <div style={{ color, fontWeight: 800, fontSize: 18, marginTop: 2 }}>{value}</div>
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  padding: '9px 16px',
  background: '#16181D', border: 'none', borderRadius: 10,
  color: '#fff', fontSize: 13, fontWeight: 800,
  letterSpacing: '0.04em', cursor: 'pointer', whiteSpace: 'nowrap',
};
const ghostBtn: React.CSSProperties = {
  padding: '9px 14px',
  background: 'transparent',
  border: '1px solid #E5E7EB', borderRadius: 10,
  color: '#374151', fontSize: 13, fontWeight: 600,
  cursor: 'pointer', whiteSpace: 'nowrap',
};
