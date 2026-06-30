'use client';

import { useEffect, useState } from 'react';
import { useGameStore, fmt } from '@/store/gameStore';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import BracketTree from '@/components/BracketTree';
import type { Upgrade } from '@/lib/sim';

type Difficulty = 'Rookie' | 'Pro' | 'Hall of Fame';
const DIFF_COLORS: Record<Difficulty, string> = {
  'Rookie':       '#22C55E',
  'Pro':          '#F59E0B',
  'Hall of Fame': '#E2622C',
};

export default function BracketScreen() {
  const bracket           = useGameStore(s => s.bracket);
  const simStep           = useGameStore(s => s.simStep);
  const champion          = useGameStore(s => s.champion);
  const mvp               = useGameStore(s => s.mvp);
  const pointsEarned      = useGameStore(s => s.pointsEarned);
  const coinsEarned       = useGameStore(s => s.coinsEarned);
  const runLabel          = useGameStore(s => s.runLabel);
  const simNext           = useGameStore(s => s.simNext);
  const simAll            = useGameStore(s => s.simAll);
  const playRound         = useGameStore(s => s.playRound);
  const startNewRun       = useGameStore(s => s.startNewRun);
  const showHighlightCard = useGameStore(s => s.showHighlightCard);
  const activePerk        = useGameStore(s => s.activePerk);
  const difficulty        = useGameStore(s => s.difficulty) as Difficulty;
  const pendingUpgrades   = useGameStore(s => s.pendingUpgrades);
  const activeUpgrades    = useGameStore(s => s.activeUpgrades);
  const chooseUpgrade     = useGameStore(s => s.chooseUpgrade);

  const [showChampionPopup, setShowChampionPopup] = useState(false);
  const { isMobile } = useBreakpoint();

  const done = simStep >= 4;

  // When run ends, show champion popup first; highlight card follows on dismiss
  useEffect(() => {
    if (done) setShowChampionPopup(true);
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  function dismissChampionPopup() {
    setShowChampionPopup(false);
    showHighlightCard();
  }

  // Derive Finals score
  const finalsResult = bracket?.finals?.result ?? null;
  const humanIsA     = bracket?.finals?.a?.isHuman ?? false;
  const finalsScoreH = finalsResult ? (humanIsA ? finalsResult.sa : finalsResult.sb) : null;
  const finalsScoreO = finalsResult ? (humanIsA ? finalsResult.sb : finalsResult.sa) : null;
  const opponentName = humanIsA ? bracket?.finals?.b?.name : bracket?.finals?.a?.name;

  let humanConf: string | null = null;
  let humanSeed: number | null = null;
  if (bracket) {
    const human = bracket.teams.find(t => t.isHuman);
    if (human) { humanConf = human.conf ?? null; humanSeed = human.seed ?? null; }
  }

  return (
    <>
      {/* ── Champion announcement popup ── */}
      {showChampionPopup && done && champion && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 300,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
          onClick={dismissChampionPopup}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 420, borderRadius: 20,
              background: champion.isHuman
                ? 'linear-gradient(145deg, #1a0533 0%, #2e0f5e 50%, #1a0533 100%)'
                : '#1E2128',
              border: `2px solid ${champion.isHuman ? '#E0A93B' : '#374151'}`,
              padding: '36px 28px 28px',
              boxShadow: champion.isHuman
                ? '0 0 60px #E0A93B44, 0 0 120px #7A3FF222'
                : '0 20px 60px rgba(0,0,0,0.5)',
              textAlign: 'center',
              animation: 'popIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
            }}
          >
            {/* Trophy */}
            <div style={{ fontSize: 72, lineHeight: 1, marginBottom: 16 }}>🏆</div>

            {/* "{Team} Wins" headline */}
            <div style={{
              color: '#FFFFFF', fontWeight: 900,
              fontSize: 28, lineHeight: 1.1, marginBottom: 8,
            }}>
              {champion.name} Wins
            </div>

            {/* Sub-line: score */}
            <div style={{ color: champion.isHuman ? '#DDD6FE' : '#9CA3AF', fontSize: 14, marginBottom: 20 }}>
              {opponentName && `def. ${opponentName}`}
              {finalsScoreH !== null && (
                <span style={{
                  fontWeight: 800, marginLeft: 8,
                  color: champion.isHuman ? '#E0A93B' : '#F87171',
                }}>
                  {champion.isHuman ? `${finalsScoreH}–${finalsScoreO}` : `${finalsScoreO}–${finalsScoreH}`}
                </span>
              )}
            </div>

            {/* MVP */}
            {mvp && (
              <div style={{
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 10, padding: '10px 14px', marginBottom: 20,
              }}>
                <div style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}>
                  FINALS MVP
                </div>
                <div style={{ color: '#F4F5F7', fontWeight: 700, fontSize: 16, marginTop: 4 }}>
                  {mvp}
                </div>
              </div>
            )}

            {/* Earnings (human champ only) */}
            {champion.isHuman && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 24 }}>
                <div>
                  <div style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>POINTS</div>
                  <div style={{ color: '#DDD6FE', fontWeight: 900, fontSize: 22 }}>+{fmt(pointsEarned)}</div>
                </div>
                <div>
                  <div style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>COINS</div>
                  <div style={{ color: '#FDE68A', fontWeight: 900, fontSize: 22 }}>+{fmt(coinsEarned)}</div>
                </div>
              </div>
            )}

            {/* CTA */}
            <button
              onClick={dismissChampionPopup}
              style={{
                width: '100%', padding: '14px 0',
                background: champion.isHuman ? '#E0A93B' : '#374151',
                border: 'none', borderRadius: 12,
                color: champion.isHuman ? '#1a0533' : '#F4F5F7',
                fontWeight: 900, fontSize: 15, letterSpacing: '0.06em',
                cursor: 'pointer',
              }}
            >
              {champion.isHuman ? 'VIEW HIGHLIGHT CARD →' : 'SEE HIGHLIGHT CARD →'}
            </button>
          </div>
        </div>
      )}

      {/* ── Main screen ── */}
      <div style={{
        height: 'calc(100vh - 60px)',
        display: 'flex', flexDirection: 'column',
        padding: isMobile ? '12px 12px' : '20px 24px',
        overflow: 'hidden',
        gap: isMobile ? 8 : 0,
      }}>

        {/* ── Header ── */}
        <div style={{ flexShrink: 0, marginBottom: isMobile ? 0 : 16 }}>
          {/* Top row: title + badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div>
              {humanConf && humanSeed && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: '#F5F3FF', borderRadius: 20,
                  padding: '3px 10px', marginBottom: 4,
                  maxWidth: '100%',
                }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#7A3FF2', flexShrink: 0 }} />
                  <span style={{
                    color: '#7A3FF2', fontSize: isMobile ? 10 : 11,
                    fontWeight: 800, letterSpacing: '0.06em',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {isMobile
                      ? `${humanConf.toUpperCase()} #${humanSeed}`
                      : `PRO · YOU ARE THE ${humanConf.toUpperCase()} ${humanSeed} SEED`}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ color: '#111827', fontWeight: 800, fontSize: isMobile ? 20 : 24 }}>NBA Playoffs</div>
            {/* Difficulty badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: `${DIFF_COLORS[difficulty]}18`,
              border: `1px solid ${DIFF_COLORS[difficulty]}44`,
              borderRadius: 20, padding: '3px 10px',
            }}>
              <span style={{ color: DIFF_COLORS[difficulty], fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap' }}>
                {difficulty === 'Hall of Fame' ? 'HOF' : difficulty.toUpperCase()}
              </span>
            </div>
            {activePerk && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: '#EDE9FE', borderRadius: 20, padding: '3px 10px',
                border: '1px solid #C4B5FD',
              }}>
                <span style={{ fontSize: 13 }}>{activePerk.glyph}</span>
                <span style={{ color: '#7A3FF2', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {activePerk.name}
                </span>
              </div>
            )}
          </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {!done ? (
                isMobile ? (
                  <>
                    <button onClick={simNext}   style={ghostBtn}>Sim</button>
                    <button onClick={playRound} style={primaryBtn}>▶ Watch</button>
                  </>
                ) : (
                  <>
                    <button onClick={simAll}    style={ghostBtn}>Sim to Finals</button>
                    <button onClick={simNext}   style={ghostBtn}>Quick sim</button>
                    <button onClick={playRound} style={primaryBtn}>▶ Watch my game</button>
                  </>
                )
              ) : (
                <>
                  <button onClick={showHighlightCard} style={ghostBtn}>{isMobile ? '★' : 'Highlight Card'}</button>
                  <button onClick={startNewRun}       style={primaryBtn}>New Run</button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Champion banner ── */}
        {done && champion?.isHuman && (
          <div style={{
            flexShrink: 0,
            background: 'linear-gradient(135deg, #7A3FF2 0%, #4C1D95 100%)',
            borderRadius: 12, padding: isMobile ? '12px 14px' : '18px 24px',
            marginBottom: isMobile ? 0 : 14,
            display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 18,
          }}>
            <div style={{ fontSize: isMobile ? 28 : 40 }}>🏆</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#DDD6FE', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 1 }}>
                NBA CHAMPION
              </div>
              <div style={{ color: '#fff', fontWeight: 900, fontSize: isMobile ? 16 : 24, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{champion.name}</div>
              {mvp && !isMobile && <div style={{ color: '#C4B5FD', fontSize: 12, marginTop: 2 }}>Finals MVP: {mvp}</div>}
            </div>
            <div style={{ display: 'flex', gap: isMobile ? 12 : 20, flexShrink: 0 }}>
              <EarnStat label="PTS" value={`+${fmt(pointsEarned)}`} color="#DDD6FE" />
              <EarnStat label="COINS" value={`+${fmt(coinsEarned)}`} color="#FDE68A" />
            </div>
          </div>
        )}

        {/* ── Non-champion result ── */}
        {done && !champion?.isHuman && runLabel && (
          <div style={{
            flexShrink: 0,
            background: '#fff', borderRadius: 12,
            padding: isMobile ? '10px 14px' : '14px 20px',
            marginBottom: isMobile ? 0 : 14,
            border: '1px solid #E5E7EB',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 1 }}>RUN COMPLETE</div>
              <div style={{ color: '#111827', fontWeight: 700, fontSize: isMobile ? 13 : 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{runLabel}</div>
            </div>
            <div style={{ display: 'flex', gap: isMobile ? 12 : 20, flexShrink: 0 }}>
              <EarnStat label="PTS"   value={`+${fmt(pointsEarned)}`} color="#7A3FF2" />
              <EarnStat label="COINS" value={`+${fmt(coinsEarned)}`}  color="#92400E" />
            </div>
          </div>
        )}

        {/* Active upgrades strip */}
        {activeUpgrades.length > 0 && !done && (
          <div style={{
            flexShrink: 0,
            display: 'flex', gap: 6, flexWrap: 'wrap',
          }}>
            {activeUpgrades.map(u => (
              <div key={u.id} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: '#F0FDF4', border: '1px solid #86EFAC',
                borderRadius: 20, padding: '3px 10px',
                fontSize: 11, fontWeight: 700, color: '#166534',
              }}>
                <span>{u.glyph}</span> {u.name} <span style={{ color: '#4ADE80' }}>+{u.boost}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Bracket card – fills remaining space ── */}
        {bracket && (
          <div style={{
            flex: 1, minHeight: 0,
            background: '#FFFFFF', borderRadius: 14,
            padding: isMobile ? '10px 8px' : '20px 20px 16px',
            border: '1px solid #E5E7EB',
            overflow: 'auto',
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',
          }}>
            <BracketTree bracket={bracket} />
          </div>
        )}
      </div>

      {/* Between-round upgrade modal */}
      {pendingUpgrades.length > 0 && (
        <UpgradeModal
          upgrades={pendingUpgrades}
          isMobile={isMobile}
          onChoose={chooseUpgrade}
        />
      )}
    </>
  );
}

// ─── Between-round upgrade modal ─────────────────────────────────────────────

function UpgradeModal({
  upgrades, isMobile, onChoose,
}: {
  upgrades: Upgrade[]; isMobile: boolean;
  onChoose: (u: Upgrade | null) => void;
}) {
  const ROUND_NAMES = ['Conference Semis', 'Conference Finals', 'NBA Finals'];
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.72)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 460,
        background: '#16181D', borderRadius: 20,
        padding: isMobile ? '22px 16px 18px' : '26px 26px 22px',
        border: '1px solid #374151',
        maxHeight: 'calc(100dvh - 40px)', overflowY: 'auto',
      }}>
        <div style={{ color: '#4ADE80', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textAlign: 'center', marginBottom: 4 }}>
          ✓ ROUND WON
        </div>
        <div style={{ color: '#F4F5F7', fontWeight: 800, fontSize: isMobile ? 17 : 19, textAlign: 'center', marginBottom: 4 }}>
          Pick a boost for the next round
        </div>
        <div style={{ color: '#6B7280', fontSize: 12, textAlign: 'center', marginBottom: 20 }}>
          Free · stacks with your coaching perk
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {upgrades.map(u => (
            <button
              key={u.id}
              onClick={() => onChoose(u)}
              style={{
                background: '#1E2128', border: '1px solid #374151',
                borderRadius: 12, padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
                cursor: 'pointer', textAlign: 'left', width: '100%',
              }}
            >
              <span style={{ fontSize: 26, flexShrink: 0 }}>{u.glyph}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#F4F5F7', fontWeight: 700, fontSize: 13 }}>{u.name}</div>
                <div style={{ color: '#9CA3AF', fontSize: 11, marginTop: 2 }}>{u.desc}</div>
              </div>
              <div style={{
                background: '#7A3FF222', border: '1px solid #7A3FF244',
                borderRadius: 20, padding: '3px 10px', flexShrink: 0,
                color: '#A78BFA', fontSize: 11, fontWeight: 700,
              }}>
                +{u.boost}
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={() => onChoose(null)}
          style={{
            width: '100%', padding: '10px 0',
            background: 'transparent', border: '1px solid #374151',
            borderRadius: 10, color: '#6B7280',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Skip boost
        </button>
      </div>
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
