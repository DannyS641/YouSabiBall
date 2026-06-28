'use client';

import { useGameStore, getLeaderboardRows } from '@/store/gameStore';

const FINISH_LABELS = ['—', 'Conf Semis', 'Conf Finals', 'Finals', 'Champion'];

export default function LeaderboardScreen() {
  const leaderboard = useGameStore(s => s.leaderboard);
  const userName    = useGameStore(s => s.userName);
  const goHome      = useGameStore(s => s.goHome);

  const rows = getLeaderboardRows(leaderboard, userName);

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 24px 60px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#F5F3FF', borderRadius: 20,
            padding: '4px 12px', marginBottom: 8,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#7A3FF2' }} />
            <span style={{ color: '#7A3FF2', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em' }}>
              WORLDWIDE
            </span>
          </div>
          <div style={{ color: '#111827', fontWeight: 800, fontSize: 26 }}>Leaderboard</div>
        </div>
        <button onClick={goHome} style={ghostBtn}>
          ← Back
        </button>
      </div>

      {/* Table */}
      <div style={{
        background: '#FFFFFF', borderRadius: 16,
        border: '1px solid #E5E7EB', overflow: 'hidden',
      }}>
        {/* Column headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '44px 1fr 90px 80px 70px 90px',
          gap: 0,
          padding: '10px 20px',
          background: '#F9FAFB',
          borderBottom: '1px solid #E5E7EB',
          color: '#9CA3AF', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
        }}>
          <div>#</div>
          <div>GM</div>
          <div style={{ textAlign: 'right' }}>BEST</div>
          <div style={{ textAlign: 'center' }}>🏆</div>
          <div style={{ textAlign: 'right' }}>GP</div>
          <div style={{ textAlign: 'right' }}>POINTS</div>
        </div>

        {/* Rows */}
        {rows.map((row, idx) => (
          <div
            key={row.name}
            style={{
              display: 'grid',
              gridTemplateColumns: '44px 1fr 90px 80px 70px 90px',
              gap: 0, alignItems: 'center',
              padding: '14px 20px',
              background: row.isYou ? '#F5F3FF' : idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
              borderBottom: idx < rows.length - 1 ? '1px solid #F3F4F6' : 'none',
              borderLeft: row.isYou ? '3px solid #7A3FF2' : '3px solid transparent',
            }}
          >
            {/* Rank */}
            <div style={{
              fontWeight: 800, fontSize: 14,
              color: row.rank === 1 ? '#E0A93B' : row.rank === 2 ? '#9CA3AF' : row.rank === 3 ? '#C77B3A' : '#D1D5DB',
            }}>
              {row.rank <= 3 ? ['🥇', '🥈', '🥉'][row.rank - 1] : row.rank}
            </div>

            {/* Name */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: row.isYou ? '#7A3FF2' : '#E5E7EB',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: row.isYou ? '#fff' : '#9CA3AF',
                  fontWeight: 800, fontSize: 11, flexShrink: 0,
                }}>
                  {(row.name[0] || '?').toUpperCase()}
                </div>
                <div>
                  <div style={{
                    color: row.isYou ? '#4C1D95' : '#111827',
                    fontWeight: row.isYou ? 800 : 600, fontSize: 14,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    maxWidth: 200,
                  }}>
                    {row.name}
                    {row.isYou && (
                      <span style={{
                        color: '#7A3FF2', fontSize: 9, marginLeft: 6,
                        fontWeight: 800, letterSpacing: '0.04em',
                      }}>
                        YOU
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Best finish */}
            <div style={{
              textAlign: 'right',
              color: '#6B7280', fontSize: 12,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {row.finish}
            </div>

            {/* Titles */}
            <div style={{ textAlign: 'center' }}>
              {row.titles > 0 ? (
                <span style={{ color: '#E0A93B', fontWeight: 800, fontSize: 14 }}>
                  {row.titles}
                </span>
              ) : (
                <span style={{ color: '#E5E7EB', fontWeight: 700, fontSize: 14 }}>—</span>
              )}
            </div>

            {/* Games played */}
            <div style={{
              textAlign: 'right',
              color: '#9CA3AF', fontWeight: 600, fontSize: 13,
            }}>
              {row.games}
            </div>

            {/* Points */}
            <div style={{
              textAlign: 'right',
              color: row.isYou ? '#7A3FF2' : '#374151',
              fontWeight: 700, fontSize: 14,
            }}>
              {row.points}
            </div>
          </div>
        ))}

        {rows.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>
            No entries yet. Complete a run to appear on the board.
          </div>
        )}
      </div>
    </div>
  );
}

const ghostBtn: React.CSSProperties = {
  padding: '8px 16px',
  background: 'transparent',
  border: '1px solid #E5E7EB', borderRadius: 8,
  color: '#374151', fontSize: 13, fontWeight: 600,
  cursor: 'pointer',
};
