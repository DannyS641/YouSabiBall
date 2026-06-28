'use client';

import { useEffect, useState, useCallback } from 'react';
import { useGameStore, POS_COLORS, TIER_COLORS } from '@/store/gameStore';
import { supabase } from '@/supabase/client';
import { submitRoster, getRoom } from '@/app/actions/rooms';
import { tierFor } from '@/lib/sim';
import type { RoomRow } from '@/app/actions/rooms';
import { POSITIONS } from '@/lib/types';

export default function MultiplayerRoomScreen() {
  const roster     = useGameStore(s => s.roster);
  const userName   = useGameStore(s => s.userName);
  const mpRoomId   = useGameStore(s => s.mpRoomId);
  const mpRole     = useGameStore(s => s.mpRole);
  const mpOpponent = useGameStore(s => s.mpOpponent);
  const mpResult   = useGameStore(s => s.mpResult);
  const goHome     = useGameStore(s => s.goHome);
  const setMpResult = useGameStore(s => s.setMpResult);
  const enterLobby  = useGameStore(s => s.enterLobby);

  const [room,       setRoom]       = useState<RoomRow | null>(null);
  const [submitted,  setSubmitted]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const draftComplete = POSITIONS.every(p => roster[p]);

  // Load initial room state
  useEffect(() => {
    if (!mpRoomId) return;
    getRoom(mpRoomId).then(r => { if (r.ok && r.room) setRoom(r.room); });
  }, [mpRoomId]);

  // Subscribe to real-time room updates
  useEffect(() => {
    if (!mpRoomId) return;
    const channel = supabase
      .channel(`room:${mpRoomId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${mpRoomId}`,
      }, payload => {
        const updated = payload.new as RoomRow;
        setRoom(updated);
        if (updated.result) {
          setMpResult({
            winner:     updated.result.winner,
            hostScore:  updated.result.host_score,
            guestScore: updated.result.guest_score,
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [mpRoomId, setMpResult]);

  const handleSubmit = useCallback(async () => {
    if (!mpRoomId || !mpRole || !draftComplete) return;
    setSubmitting(true); setError(null);
    const res = await submitRoster(mpRoomId, roster, mpRole);
    setSubmitting(false);
    if (!res.ok) { setError(res.error); return; }
    setSubmitted(true);
    if (res.room) {
      setRoom(res.room);
      if (res.room.result) {
        setMpResult({
          winner:     res.room.result.winner,
          hostScore:  res.room.result.host_score,
          guestScore: res.room.result.guest_score,
        });
      }
    }
  }, [mpRoomId, mpRole, roster, draftComplete, setMpResult]);

  if (!mpRoomId) return null;

  const opponentName = mpRole === 'host' ? (room?.guest_name ?? 'Waiting…') : (room?.host_name ?? '?');
  const youName      = userName;
  const youScore     = mpResult ? (mpRole === 'host' ? mpResult.hostScore  : mpResult.guestScore) : null;
  const oppScore     = mpResult ? (mpRole === 'host' ? mpResult.guestScore : mpResult.hostScore)  : null;
  const youWon       = mpResult ? (mpRole === mpResult.winner) : null;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 24px 60px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#EDE9FE', borderRadius: 20,
            padding: '4px 12px', marginBottom: 8,
          }}>
            <span style={{ fontSize: 10 }}>⚡</span>
            <span style={{ color: '#7A3FF2', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em' }}>
              ROOM · {mpRoomId}
            </span>
          </div>
          <div style={{ color: '#111827', fontWeight: 800, fontSize: 22 }}>Draft Duel</div>
        </div>
        <button onClick={enterLobby} style={ghostBtn}>Leave</button>
      </div>

      {/* Players row */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto 1fr',
        gap: 12, alignItems: 'center', marginBottom: 20,
      }}>
        <PlayerCard
          name={youName}
          role={mpRole === 'host' ? 'HOST' : 'GUEST'}
          roster={roster}
          submitted={submitted}
          score={youScore}
          isYou
        />
        <div style={{ color: '#D1D5DB', fontWeight: 800, fontSize: 20, textAlign: 'center' }}>
          {mpResult ? (youWon ? '🏆' : '💔') : 'vs'}
        </div>
        <PlayerCard
          name={opponentName}
          role={mpRole === 'host' ? 'GUEST' : 'HOST'}
          roster={null}
          submitted={mpRole === 'host' ? !!room?.guest_roster : !!room?.host_roster}
          score={oppScore}
          isYou={false}
        />
      </div>

      {/* Result banner */}
      {mpResult && (
        <div style={{
          background: youWon ? '#F5F3FF' : '#FFF7F7',
          border: `2px solid ${youWon ? '#7A3FF2' : '#FECACA'}`,
          borderRadius: 14, padding: '20px 24px', marginBottom: 20,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>{youWon ? '🏆' : '💔'}</div>
          <div style={{ color: '#111827', fontWeight: 800, fontSize: 20 }}>
            {youWon ? 'You won!' : `${opponentName} wins`}
          </div>
          <div style={{ color: '#6B7280', fontSize: 14, marginTop: 4 }}>
            {youScore} – {oppScore}
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
            <button onClick={goHome} style={{ ...primaryBtn, flex: 1, maxWidth: 200 }}>
              Go Home
            </button>
            <button onClick={enterLobby} style={{ ...primaryBtn, flex: 1, maxWidth: 200, background: '#7A3FF2' }}>
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* Submit button */}
      {!mpResult && (
        <div style={{
          background: '#FFFFFF', borderRadius: 14, padding: '20px',
          border: '1px solid #E5E7EB',
        }}>
          {!draftComplete ? (
            <div style={{ color: '#6B7280', fontSize: 13, textAlign: 'center' }}>
              Complete your draft to submit your lineup.
              {' '}<a onClick={() => useGameStore.getState().startNewRun()} style={{ color: '#E2622C', cursor: 'pointer', fontWeight: 700 }}>
                Draft now →
              </a>
            </div>
          ) : submitted ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#15803D', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
                ✓ Lineup submitted!
              </div>
              <div style={{ color: '#9CA3AF', fontSize: 13 }}>
                Waiting for {opponentName} to submit their roster…
              </div>
            </div>
          ) : (
            <>
              {error && <div style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{error}</div>}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  ...primaryBtn, width: '100%',
                  background: submitting ? '#E5E7EB' : '#16181D',
                  color:      submitting ? '#9CA3AF' : '#fff',
                  cursor:     submitting ? 'default' : 'pointer',
                }}
              >
                {submitting ? 'Submitting…' : 'Lock In Lineup →'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function PlayerCard({
  name, role, roster, submitted, score, isYou,
}: {
  name:      string;
  role:      string;
  roster:    import('@/lib/types').Roster | null;
  submitted: boolean;
  score:     number | null;
  isYou:     boolean;
}) {
  return (
    <div style={{
      background: '#FFFFFF', borderRadius: 12,
      border: `1.5px solid ${isYou ? '#7A3FF2' : '#E5E7EB'}`,
      padding: '14px 16px',
      boxShadow: isYou ? '0 0 0 3px #EDE9FE' : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 7,
          background: isYou ? '#7A3FF2' : '#E5E7EB',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isYou ? '#fff' : '#9CA3AF', fontWeight: 800, fontSize: 12,
        }}>
          {(name[0] || '?').toUpperCase()}
        </div>
        <div>
          <div style={{ color: '#111827', fontWeight: 700, fontSize: 13 }}>{name}</div>
          <div style={{ color: '#9CA3AF', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em' }}>{role}</div>
        </div>
        {score !== null && (
          <div style={{ marginLeft: 'auto', color: '#111827', fontWeight: 900, fontSize: 22 }}>
            {score}
          </div>
        )}
      </div>

      {/* Roster pills */}
      {roster && POSITIONS.map(pos => {
        const card = roster[pos];
        return (
          <div key={pos} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '3px 0', borderTop: '1px solid #F9FAFB',
          }}>
            <span style={{ color: POS_COLORS[pos], fontSize: 9, fontWeight: 800, width: 22 }}>{pos}</span>
            {card ? (
              <>
                <span style={{ color: '#374151', fontSize: 11, flex: 1 }}>{card.name.split(' ').slice(-1)[0]}</span>
                <span style={{ color: TIER_COLORS[tierFor(card.ovr)], fontWeight: 700, fontSize: 11 }}>{card.ovr}</span>
              </>
            ) : (
              <span style={{ color: '#D1D5DB', fontSize: 11 }}>open</span>
            )}
          </div>
        );
      })}

      {!roster && (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          {submitted ? (
            <span style={{ color: '#15803D', fontSize: 12, fontWeight: 700 }}>✓ Locked in</span>
          ) : (
            <span style={{ color: '#9CA3AF', fontSize: 12 }}>Drafting…</span>
          )}
        </div>
      )}
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  padding: '12px 20px', border: 'none', borderRadius: 10,
  fontSize: 14, fontWeight: 800, letterSpacing: '0.04em', cursor: 'pointer',
  background: '#16181D', color: '#fff',
};
const ghostBtn: React.CSSProperties = {
  padding: '8px 14px', background: 'transparent',
  border: '1px solid #E5E7EB', borderRadius: 8,
  color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
