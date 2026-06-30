'use client';

import { useGameStore, fmt } from '@/store/gameStore';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import type { RunRecord } from '@/lib/types';

const ROUND_COLORS = ['#9CA3AF', '#3E78D6', '#1F9D6B', '#E2622C', '#7A3FF2'];
const ROUND_LABELS = ['Early Exit', 'Conf Semis', 'Conf Finals', 'NBA Finals', 'Champion'];
const DIFF_COLORS: Record<string, string> = {
  'Rookie': '#6B7280',
  'Pro': '#3E78D6',
  'Hall of Fame': '#E0A93B',
};

export default function HistoryScreen() {
  const save   = useGameStore(s => s.save);
  const goHome = useGameStore(s => s.goHome);
  const { isMobile } = useBreakpoint();

  const runs: RunRecord[] = save?.recentRuns ?? [];

  const bestRun  = runs.length > 0 ? runs.reduce((a, b) => (b.round > a.round || (b.round === a.round && b.points > a.points) ? b : a)) : null;
  const totalPts = runs.reduce((s, r) => s + r.points, 0);
  const titles   = runs.filter(r => r.champion).length;

  return (
    <div style={{ maxWidth: 740, margin: '0 auto', padding: isMobile ? '16px 14px 80px' : '28px 24px 80px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#EDE9FE', borderRadius: 20,
            padding: '4px 12px', marginBottom: 8,
          }}>
            <span style={{ fontSize: 11 }}>📋</span>
            <span style={{ color: '#7A3FF2', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em' }}>RUN HISTORY</span>
          </div>
          <div style={{ color: '#111827', fontWeight: 800, fontSize: isMobile ? 22 : 26 }}>Past Runs</div>
        </div>
        <button onClick={goHome} style={ghostBtn}>← Back</button>
      </div>

      {/* Summary strip */}
      {runs.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10, marginBottom: 16,
        }}>
          <SumCard label="RUNS" value={String(runs.length)} />
          <SumCard label="TITLES" value={String(titles)} color="#7A3FF2" />
          <SumCard label="TOTAL PTS" value={fmt(totalPts)} color="#E2622C" />
        </div>
      )}

      {/* Runs list */}
      {runs.length === 0 ? (
        <div style={{
          background: '#FFFFFF', borderRadius: 16, padding: '60px 24px',
          border: '1px dashed #E5E7EB', textAlign: 'center',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏀</div>
          <div style={{ color: '#374151', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No runs yet</div>
          <div style={{ color: '#9CA3AF', fontSize: 13 }}>Complete your first playoff run to see it here.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Best run highlight */}
          {bestRun && (
            <div style={{
              background: bestRun.champion
                ? 'linear-gradient(135deg, #7A3FF2 0%, #4C1D95 100%)'
                : '#F5F3FF',
              borderRadius: 14, padding: isMobile ? '14px' : '18px 20px',
              border: bestRun.champion ? 'none' : '1px solid #DDD6FE',
              marginBottom: 4,
            }}>
              <div style={{
                color: bestRun.champion ? 'rgba(255,255,255,0.7)' : '#7A3FF2',
                fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', marginBottom: 6,
              }}>
                BEST RUN
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: isMobile ? 28 : 36 }}>{bestRun.champion ? '🏆' : '⭐'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: bestRun.champion ? '#FFFFFF' : '#111827', fontWeight: 800, fontSize: isMobile ? 15 : 18 }}>
                    {bestRun.champion ? 'NBA Champion' : bestRun.label}
                  </div>
                  <div style={{ color: bestRun.champion ? 'rgba(255,255,255,0.6)' : '#6B7280', fontSize: 12, marginTop: 2 }}>
                    {bestRun.difficulty} · {formatDate(bestRun.date)}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ color: bestRun.champion ? '#DDD6FE' : '#7A3FF2', fontWeight: 800, fontSize: isMobile ? 15 : 18 }}>
                    +{fmt(bestRun.points)} pts
                  </div>
                  <div style={{ color: bestRun.champion ? 'rgba(255,255,255,0.5)' : '#9CA3AF', fontSize: 11, marginTop: 1 }}>
                    +{bestRun.coins} 🪙
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* All runs */}
          <div style={{
            background: '#FFFFFF', borderRadius: 14,
            border: '1px solid #E5E7EB', overflow: 'hidden',
          }}>
            {/* Column headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr 90px 70px' : '90px 1fr 100px 80px',
              padding: isMobile ? '9px 14px' : '9px 20px',
              background: '#F9FAFB', borderBottom: '1px solid #E5E7EB',
              color: '#9CA3AF', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
            }}>
              {!isMobile && <div>DATE</div>}
              <div>RESULT</div>
              <div style={{ textAlign: 'right' }}>PTS</div>
              <div style={{ textAlign: 'right' }}>COINS</div>
            </div>

            {runs.map((run, i) => {
              const roundColor = ROUND_COLORS[run.round] ?? '#9CA3AF';
              const isChamp = run.champion;
              return (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr 90px 70px' : '90px 1fr 100px 80px',
                    alignItems: 'center',
                    padding: isMobile ? '11px 14px' : '12px 20px',
                    background: isChamp ? '#F5F3FF' : i % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                    borderBottom: i < runs.length - 1 ? '1px solid #F3F4F6' : 'none',
                    borderLeft: `3px solid ${isChamp ? '#7A3FF2' : roundColor}`,
                  }}
                >
                  {!isMobile && (
                    <div style={{ color: '#9CA3AF', fontSize: 11 }}>{formatDate(run.date)}</div>
                  )}

                  {/* Result */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <div style={{
                      flexShrink: 0,
                      padding: '2px 7px',
                      background: (roundColor) + '18',
                      borderRadius: 4,
                      color: roundColor,
                      fontSize: 9, fontWeight: 800, letterSpacing: '0.06em',
                      whiteSpace: 'nowrap',
                    }}>
                      {isChamp ? '🏆' : ROUND_LABELS[run.round] ?? run.label}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        color: isChamp ? '#4C1D95' : '#374151',
                        fontWeight: isChamp ? 700 : 500,
                        fontSize: 12,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {isMobile ? `${run.difficulty} · ${formatDate(run.date)}` : run.difficulty}
                      </div>
                    </div>
                  </div>

                  {/* Points */}
                  <div style={{
                    textAlign: 'right',
                    color: isChamp ? '#7A3FF2' : '#374151',
                    fontWeight: 700, fontSize: 13,
                  }}>
                    +{fmt(run.points)}
                  </div>

                  {/* Coins */}
                  <div style={{ textAlign: 'right', color: '#92400E', fontSize: 12, fontWeight: 600 }}>
                    +{run.coins} 🪙
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SumCard({ label, value, color = '#111827' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '12px 14px', border: '1px solid #E5E7EB' }}>
      <div style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
      <div style={{ color, fontWeight: 800, fontSize: 20, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return iso; }
}

const ghostBtn: React.CSSProperties = {
  padding: '7px 14px', flexShrink: 0,
  background: 'transparent', border: '1px solid #E5E7EB', borderRadius: 8,
  color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
