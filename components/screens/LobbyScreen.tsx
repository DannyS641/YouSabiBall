'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { createRoom, joinRoom } from '@/app/actions/rooms';

export default function LobbyScreen() {
  const userName   = useGameStore(s => s.userName);
  const authUser   = useGameStore(s => s.authUser);
  const goHome     = useGameStore(s => s.goHome);
  const setMpRoom  = useGameStore(s => s.setMpRoom);
  const startRun   = useGameStore(s => s.startNewRun);

  const [tab,     setTab]     = useState<'create' | 'join'>('create');
  const [codeIn,  setCodeIn]  = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [myCode,  setMyCode]  = useState<string | null>(null);

  async function handleCreate() {
    if (!authUser) { setError('Sign in to create a room'); return; }
    setLoading(true); setError(null);
    const res = await createRoom(userName);
    setLoading(false);
    if (!res.ok || !res.room) { setError(res.error); return; }
    setMyCode(res.room.id);
    setMpRoom(res.room.id, 'host', null);
    startRun(); // start draft flow — roster submits to room when done
  }

  async function handleJoin() {
    if (!authUser) { setError('Sign in to join a room'); return; }
    if (!codeIn.trim()) return;
    setLoading(true); setError(null);
    const res = await joinRoom(codeIn.trim(), userName);
    setLoading(false);
    if (!res.ok || !res.room) { setError(res.error); return; }
    setMpRoom(res.room.id, 'guest', res.room.host_name);
    startRun(); // start draft flow
  }

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', padding: '28px 24px 60px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#EDE9FE', borderRadius: 20,
            padding: '4px 12px', marginBottom: 8,
          }}>
            <span style={{ fontSize: 12 }}>⚡</span>
            <span style={{ color: '#7A3FF2', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em' }}>
              MULTIPLAYER
            </span>
          </div>
          <div style={{ color: '#111827', fontWeight: 800, fontSize: 26 }}>Draft Duel</div>
        </div>
        <button onClick={goHome} style={ghostBtn}>← Back</button>
      </div>

      {/* Guest warning */}
      {!authUser && (
        <div style={{
          background: '#FFFBEB', border: '1px solid #FDE68A',
          borderRadius: 12, padding: '12px 16px', marginBottom: 20,
          color: '#92400E', fontSize: 13,
        }}>
          You need to <strong>sign in</strong> to create or join multiplayer rooms.
        </div>
      )}

      {/* Tab */}
      <div style={{
        display: 'flex', background: '#F3F4F6',
        borderRadius: 10, padding: 4, marginBottom: 24,
      }}>
        {(['create', 'join'] as const).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(null); }}
            style={{
              flex: 1, padding: '9px 0',
              background: tab === t ? '#FFFFFF' : 'transparent',
              border: 'none', borderRadius: 8, cursor: 'pointer',
              color: tab === t ? '#111827' : '#9CA3AF',
              fontWeight: 700, fontSize: 13,
              boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {t === 'create' ? 'Create Room' : 'Join Room'}
          </button>
        ))}
      </div>

      {tab === 'create' && (
        <div style={card}>
          <div style={{ color: '#111827', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
            Create a room
          </div>
          <p style={{ color: '#6B7280', fontSize: 13, lineHeight: 1.5, margin: '0 0 20px' }}>
            Draft your team, then share your room code with a friend. Once they join and draft,
            your teams will face off in a simulated game.
          </p>

          {myCode && (
            <div style={{
              background: '#F5F3FF', border: '1px solid #DDD6FE',
              borderRadius: 10, padding: '14px 16px', marginBottom: 16,
              textAlign: 'center',
            }}>
              <div style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6 }}>
                ROOM CODE
              </div>
              <div style={{ color: '#7A3FF2', fontWeight: 900, fontSize: 32, letterSpacing: '0.3em' }}>
                {myCode}
              </div>
              <div style={{ color: '#6B7280', fontSize: 12, marginTop: 6 }}>
                Share this with your opponent
              </div>
            </div>
          )}

          {error && <div style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{error}</div>}

          <button
            onClick={handleCreate}
            disabled={loading || !authUser}
            style={{
              ...primaryBtn,
              background: loading || !authUser ? '#E5E7EB' : '#7A3FF2',
              color:      loading || !authUser ? '#9CA3AF' : '#fff',
              cursor:     loading || !authUser ? 'default' : 'pointer',
            }}
          >
            {loading ? 'Creating…' : 'Create Room + Draft'}
          </button>
        </div>
      )}

      {tab === 'join' && (
        <div style={card}>
          <div style={{ color: '#111827', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
            Join a room
          </div>
          <p style={{ color: '#6B7280', fontSize: 13, lineHeight: 1.5, margin: '0 0 20px' }}>
            Enter the 6-character room code your opponent shared with you.
          </p>

          <input
            type="text"
            value={codeIn}
            onChange={e => setCodeIn(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            placeholder="ABCD12"
            maxLength={6}
            style={{
              display: 'block', width: '100%', padding: '12px 16px',
              background: '#F9FAFB', border: '1.5px solid #E5E7EB',
              borderRadius: 10, color: '#111827',
              fontSize: 22, fontWeight: 800, letterSpacing: '0.3em',
              textAlign: 'center', outline: 'none', boxSizing: 'border-box',
              marginBottom: 16,
            }}
          />

          {error && <div style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{error}</div>}

          <button
            onClick={handleJoin}
            disabled={loading || !codeIn.trim() || !authUser}
            style={{
              ...primaryBtn,
              background: loading || !codeIn.trim() || !authUser ? '#E5E7EB' : '#16181D',
              color:      loading || !codeIn.trim() || !authUser ? '#9CA3AF' : '#fff',
              cursor:     loading || !codeIn.trim() || !authUser ? 'default' : 'pointer',
            }}
          >
            {loading ? 'Joining…' : 'Join + Draft'}
          </button>
        </div>
      )}

      {/* How it works */}
      <div style={{ marginTop: 24 }}>
        <div style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 12 }}>
          HOW IT WORKS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { step: '1', label: 'Create or join a room' },
            { step: '2', label: 'Spin your draft — build your best 5-man roster' },
            { step: '3', label: 'Submit your lineup to the room' },
            { step: '4', label: 'When your opponent submits too, the game is simulated — live!' },
          ].map(s => (
            <div key={s.step} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                background: '#EDE9FE',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#7A3FF2', fontWeight: 800, fontSize: 12,
              }}>
                {s.step}
              </div>
              <div style={{ color: '#374151', fontSize: 13 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  background: '#FFFFFF', borderRadius: 14, padding: '20px 20px',
  border: '1px solid #E5E7EB',
};
const primaryBtn: React.CSSProperties = {
  display: 'block', width: '100%',
  padding: '13px 0', border: 'none', borderRadius: 10,
  fontSize: 14, fontWeight: 800, letterSpacing: '0.04em',
};
const ghostBtn: React.CSSProperties = {
  padding: '8px 16px', background: 'transparent',
  border: '1px solid #E5E7EB', borderRadius: 8,
  color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
