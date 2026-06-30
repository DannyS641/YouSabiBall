'use client';

import { useGameStore, POS_COLORS, POS_SPOT_HALF, TIER_COLORS } from '@/store/gameStore';
import TipBanner from '@/components/TipBanner';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { POSITIONS } from '@/lib/types';
import { tierFor, getTeamProfile } from '@/lib/sim';
import type { Perk } from '@/lib/sim';

type Difficulty = 'Rookie' | 'Pro' | 'Hall of Fame';
const DIFF_INFO: Record<Difficulty, { label: string; hint: string; color: string; mult: string }> = {
  'Rookie':       { label: 'Rookie',       hint: 'Weaker opponents',  color: '#22C55E', mult: '×0.7'  },
  'Pro':          { label: 'Pro',           hint: 'Standard',          color: '#F59E0B', mult: '×1.0'  },
  'Hall of Fame': { label: 'Hall of Fame',  hint: 'Toughest field',    color: '#E2622C', mult: '×1.45' },
};

export default function CourtScreen() {
  const roster        = useGameStore(s => s.roster);
  const userName      = useGameStore(s => s.userName);
  const save          = useGameStore(s => s.save);
  const teamNickname  = useGameStore(s => s.teamNickname);
  const difficulty    = useGameStore(s => s.difficulty) as Difficulty;
  const setDifficulty = useGameStore(s => s.setDifficulty);
  const tradePosition = useGameStore(s => s.tradePosition);
  const pendingPerks  = useGameStore(s => s.pendingPerks);
  const openPerkModal = useGameStore(s => s.openPerkModal);
  const choosePerk    = useGameStore(s => s.choosePerk);
  const redraft       = useGameStore(s => s.startNewRun);
  const { isMobile } = useBreakpoint();

  const players = POSITIONS.map(pos => ({ pos, card: roster[pos] })).filter(x => x.card);
  const profile = getTeamProfile(roster);
  const dotSize = isMobile ? 36 : 50;

  return (
    <>
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '16px 14px 60px' : '28px 24px 60px' }}>

      <TipBanner
        id="court"
        icon="⚙️"
        text="Set your difficulty and pick a coaching perk before entering the playoffs. You can also swap players in the Trade Market."
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: '#E2622C', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {userName.toUpperCase()}'S STARTING FIVE
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ color: '#111827', fontWeight: 800, fontSize: isMobile ? 20 : 26 }}>On the floor</div>
            {teamNickname && (
              <div style={{ color: '#7A3FF2', fontSize: isMobile ? 11 : 13, fontWeight: 700, letterSpacing: '0.02em' }}>
                {teamNickname}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={openPerkModal}
          style={{
            background: '#16181D', border: 'none', borderRadius: 10,
            padding: isMobile ? '10px 14px' : '11px 20px',
            color: '#fff', fontWeight: 700, fontSize: isMobile ? 13 : 14,
            cursor: 'pointer', flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          {isMobile ? 'Playoffs →' : 'Enter the playoffs →'}
        </button>
      </div>

      {/* Main layout — stacked on mobile, side-by-side on desktop */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 320px',
        gap: isMobile ? 14 : 20,
      }}>

        {/* Court */}
        <div style={{
          position: 'relative',
          background: '#E8D5B0',
          borderRadius: 14, overflow: 'hidden',
          border: '2px solid #C8AA78',
          minHeight: isMobile ? 260 : 380,
        }}>
          <HalfCourtSVG />
          {players.map(({ pos, card }) => {
            if (!card) return null;
            const spot  = POS_SPOT_HALF[pos];
            const color = POS_COLORS[pos];
            const tier  = tierFor(card.ovr);
            const lname = card.name.split(' ').slice(-1)[0];
            return (
              <div
                key={pos}
                style={{
                  position: 'absolute',
                  left: `${spot.left}%`, top: `${spot.top}%`,
                  transform: 'translate(-50%, -50%)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  zIndex: 2,
                }}
              >
                <div style={{
                  background: color, color: '#fff',
                  fontSize: isMobile ? 7 : 9, fontWeight: 800, padding: '1px 4px',
                  borderRadius: 3, marginBottom: 2, letterSpacing: '0.04em',
                }}>
                  {pos}
                </div>
                <div style={{
                  width: dotSize, height: dotSize, borderRadius: '50%',
                  background: '#fff',
                  border: `${isMobile ? 2 : 3}px solid ${TIER_COLORS[tier] ?? color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, fontSize: isMobile ? 12 : 16, color: '#111827',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}>
                  {card.ovr}
                </div>
                <div style={{
                  marginTop: 2,
                  background: 'rgba(0,0,0,0.65)', borderRadius: 4,
                  padding: '1px 4px', color: '#fff', fontSize: isMobile ? 7 : 9, fontWeight: 700,
                  whiteSpace: 'nowrap', maxWidth: isMobile ? 48 : 80,
                  overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {lname}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: 12, flexWrap: isMobile ? 'wrap' : undefined }}>
          {/* Team Overall */}
          <div style={{
            background: '#16181D', borderRadius: 12,
            padding: isMobile ? '14px 16px' : '20px',
            textAlign: 'center', flex: isMobile ? '1 1 120px' : undefined,
          }}>
            <div style={{ color: '#fff', fontWeight: 900, fontSize: isMobile ? 38 : 52, lineHeight: 1 }}>
              {profile.overall}
            </div>
            <div style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginTop: 4 }}>
              TEAM OVERALL
            </div>
          </div>

          {/* Position group stats */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #E5E7EB', flex: isMobile ? '1 1 160px' : undefined }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, textAlign: 'center' }}>
              <div>
                <div style={{ color: '#111827', fontWeight: 800, fontSize: isMobile ? 18 : 22 }}>{profile.backcourt || '—'}</div>
                <div style={{ color: '#9CA3AF', fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', marginTop: 2 }}>BACKCOURT</div>
              </div>
              <div>
                <div style={{ color: '#111827', fontWeight: 800, fontSize: isMobile ? 18 : 22 }}>{profile.wing || '—'}</div>
                <div style={{ color: '#9CA3AF', fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', marginTop: 2 }}>WING</div>
              </div>
              <div>
                <div style={{ color: '#111827', fontWeight: 800, fontSize: isMobile ? 18 : 22 }}>{profile.frontcourt || '—'}</div>
                <div style={{ color: '#9CA3AF', fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', marginTop: 2 }}>FRONTCOURT</div>
              </div>
            </div>
          </div>

          {/* How they play — desktop only or full width on mobile below */}
          {!isMobile && (
            <div style={{ background: '#fff', borderRadius: 12, padding: '16px', border: '1px solid #E5E7EB' }}>
              <div style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 10 }}>
                HOW THEY PLAY
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {profile.tags.map(tag => (
                  <span key={tag} style={{ background: '#EDE9FE', color: '#7A3FF2', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>
                    {tag}
                  </span>
                ))}
              </div>
              <div style={{ color: '#6B7280', fontSize: 12, lineHeight: 1.5 }}>{profile.description}</div>
            </div>
          )}

          {/* Difficulty picker */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '12px 14px', border: '1px solid #E5E7EB', flex: isMobile ? '1 1 100%' : undefined }}>
            <div style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8 }}>
              DIFFICULTY
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(Object.keys(DIFF_INFO) as Difficulty[]).map(d => {
                const info = DIFF_INFO[d];
                const active = difficulty === d;
                return (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    style={{
                      flex: 1, padding: isMobile ? '6px 2px' : '7px 4px',
                      borderRadius: 8, border: active ? `2px solid ${info.color}` : '2px solid #E5E7EB',
                      background: active ? `${info.color}12` : 'transparent',
                      cursor: 'pointer', textAlign: 'center',
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: isMobile ? 9 : 10, color: active ? info.color : '#6B7280', marginBottom: 2 }}>
                      {info.label}
                    </div>
                    <div style={{ fontSize: isMobile ? 8 : 9, color: active ? info.color : '#9CA3AF', fontWeight: 600 }}>
                      {info.mult}
                    </div>
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 7, fontSize: 10, color: DIFF_INFO[difficulty].color, fontWeight: 600, textAlign: 'center' }}>
              {DIFF_INFO[difficulty].hint} · {DIFF_INFO[difficulty].mult} coin rewards
            </div>
          </div>

          {/* Trade Market */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '12px 14px', border: '1px solid #E5E7EB', flex: isMobile ? '1 1 100%' : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>TRADE MARKET</div>
              <div style={{ color: '#6B7280', fontSize: 10, fontWeight: 600 }}>80🪙 per trade</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {POSITIONS.map(pos => {
                const card = roster[pos];
                if (!card) return null;
                const canAfford = (save?.coins ?? 0) >= 80;
                return (
                  <div key={pos} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                      background: POS_COLORS[pos], display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 9,
                    }}>{pos}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#111827', fontWeight: 600, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {card.name}
                      </div>
                      <div style={{ color: TIER_COLORS[tierFor(card.ovr)] ?? '#6B7280', fontSize: 10, fontWeight: 700 }}>
                        OVR {card.ovr}
                      </div>
                    </div>
                    <button
                      onClick={() => tradePosition(pos)}
                      disabled={!canAfford}
                      style={{
                        background: canAfford ? '#F3F4F6' : 'transparent',
                        border: '1px solid #E5E7EB', borderRadius: 6,
                        padding: '3px 8px', fontSize: 10, fontWeight: 700,
                        color: canAfford ? '#374151' : '#D1D5DB',
                        cursor: canAfford ? 'pointer' : 'default',
                        whiteSpace: 'nowrap', flexShrink: 0,
                      }}
                    >
                      Swap
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <button onClick={redraft} style={{
            background: 'transparent', border: '1px solid #E5E7EB',
            borderRadius: 10, padding: isMobile ? '8px 14px' : '10px',
            color: '#6B7280', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            flex: isMobile ? '1 1 100%' : undefined,
          }}>
            Re-draft squad
          </button>
        </div>

        {/* How they play — mobile: full width below the row */}
        {isMobile && (
          <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #E5E7EB' }}>
            <div style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8 }}>
              HOW THEY PLAY
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {profile.tags.map(tag => (
                <span key={tag} style={{ background: '#EDE9FE', color: '#7A3FF2', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20 }}>
                  {tag}
                </span>
              ))}
            </div>
            <div style={{ color: '#6B7280', fontSize: 12, lineHeight: 1.5 }}>{profile.description}</div>
          </div>
        )}
      </div>
    </div>

    {/* Perk selection modal */}
    {pendingPerks.length > 0 && (
      <PerkModal
        perks={pendingPerks}
        coins={save?.coins ?? 0}
        isMobile={isMobile}
        onChoose={choosePerk}
      />
    )}
    </>
  );
}

// ─── Perk Modal ───────────────────────────────────────────────────────────────

function PerkModal({
  perks, coins, isMobile, onChoose,
}: {
  perks: Perk[]; coins: number; isMobile: boolean;
  onChoose: (perk: Perk | null) => void;
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.72)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 520,
        background: '#16181D', borderRadius: 20,
        padding: isMobile ? '24px 18px 20px' : '28px 28px 24px',
        border: '1px solid #374151',
        maxHeight: 'calc(100dvh - 40px)', overflowY: 'auto',
      }}>
        <div style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', marginBottom: 6, textAlign: 'center' }}>
          CHOOSE YOUR COACHING PERK
        </div>
        <div style={{ color: '#F4F5F7', fontWeight: 800, fontSize: isMobile ? 18 : 21, textAlign: 'center', marginBottom: 6 }}>
          Pick one for this run
        </div>
        <div style={{ color: '#6B7280', fontSize: 12, textAlign: 'center', marginBottom: 22 }}>
          Boosts your team rating for the entire playoff run
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
          {perks.map(perk => {
            const canAfford = coins >= perk.cost;
            return (
              <div
                key={perk.id}
                style={{
                  background: '#1E2128', borderRadius: 12,
                  border: '1px solid #374151',
                  padding: isMobile ? '14px 14px' : '16px 18px',
                  display: 'flex', alignItems: 'center', gap: 14,
                }}
              >
                <div style={{
                  fontSize: isMobile ? 28 : 32, flexShrink: 0,
                  width: 48, textAlign: 'center',
                }}>
                  {perk.glyph}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#F4F5F7', fontWeight: 700, fontSize: isMobile ? 13 : 14 }}>{perk.name}</div>
                  <div style={{ color: '#9CA3AF', fontSize: 12, marginTop: 2, lineHeight: 1.4 }}>{perk.desc}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <span style={{
                      background: '#7A3FF222', border: '1px solid #7A3FF244',
                      borderRadius: 20, padding: '2px 8px',
                      color: '#A78BFA', fontSize: 10, fontWeight: 700,
                    }}>
                      +{perk.boost} team rating
                    </span>
                    {perk.cost > 0 && (
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: 3,
                        color: canAfford ? '#FDE68A' : '#6B7280', fontSize: 11, fontWeight: 700,
                      }}>
                        🪙 {perk.cost}
                        {!canAfford && <span style={{ color: '#6B7280', fontSize: 10, marginLeft: 2 }}>(need more)</span>}
                      </span>
                    )}
                    {perk.cost === 0 && (
                      <span style={{ color: '#1F9D6B', fontSize: 10, fontWeight: 700 }}>FREE</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => canAfford && onChoose(perk)}
                  disabled={!canAfford}
                  style={{
                    background: canAfford ? '#7A3FF2' : '#2A2D35',
                    border: 'none', borderRadius: 9,
                    padding: '9px 16px',
                    color: canAfford ? '#fff' : '#4B5563',
                    fontWeight: 800, fontSize: 13,
                    cursor: canAfford ? 'pointer' : 'default',
                    flexShrink: 0, whiteSpace: 'nowrap',
                  }}
                >
                  Pick
                </button>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => onChoose(null)}
          style={{
            width: '100%', padding: '11px 0',
            background: 'transparent', border: '1px solid #374151',
            borderRadius: 10, color: '#6B7280',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Skip — enter without a perk
        </button>
      </div>
    </div>
  );
}

function HalfCourtSVG() {
  return (
    <svg
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      viewBox="0 0 100 70"
      preserveAspectRatio="none"
    >
      {/* Paint / lane */}
      <rect x="37" y="0" width="26" height="28" fill="none" stroke="#C4A46A" strokeWidth="0.8" />
      {/* Basket backboard */}
      <rect x="44" y="1" width="12" height="1.5" fill="#C4A46A" />
      {/* Free throw circle */}
      <circle cx="50" cy="28" r="9" fill="none" stroke="#C4A46A" strokeWidth="0.7" />
      {/* Three-point arc */}
      <path d="M 12 0 Q 50 54 88 0" fill="none" stroke="#C4A46A" strokeWidth="0.8" />
      {/* Half-court line */}
      <line x1="0" y1="70" x2="100" y2="70" stroke="#C4A46A" strokeWidth="0.8" />
      {/* Center circle (half) */}
      <path d="M 38 70 Q 50 58 62 70" fill="none" stroke="#C4A46A" strokeWidth="0.7" />
      {/* Basket ring */}
      <circle cx="50" cy="5" r="2.5" fill="none" stroke="#E2622C" strokeWidth="1.2" />
      {/* Restricted area */}
      <path d="M 44 0 Q 50 12 56 0" fill="none" stroke="#C4A46A" strokeWidth="0.6" />
    </svg>
  );
}
