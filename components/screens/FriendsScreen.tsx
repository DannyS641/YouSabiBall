'use client';

import { useState, useEffect, useTransition } from 'react';
import { useGameStore, fmt } from '@/store/gameStore';
import {
  searchProfiles,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriendship,
  sendDirectChallenge,
} from '@/app/actions/social';
import type { SearchProfile } from '@/lib/types';

type Tab = 'friends' | 'challenges' | 'add';

export default function FriendsScreen() {
  const authUser           = useGameStore(s => s.authUser);
  const save               = useGameStore(s => s.save);
  const friends            = useGameStore(s => s.friends);
  const pendingRequests    = useGameStore(s => s.pendingRequests);
  const incomingChallenges = useGameStore(s => s.incomingChallenges);
  const outgoingChallenges = useGameStore(s => s.outgoingChallenges);
  const friendsLoading     = useGameStore(s => s.friendsLoading);
  const loadFriends        = useGameStore(s => s.loadFriends);
  const goHome             = useGameStore(s => s.goHome);
  const difficulty         = useGameStore(s => s.difficulty);
  const startChallenge     = useGameStore(s => s.startChallenge);

  const [tab, setTab] = useState<Tab>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [challengeFriendId, setChallengeFriendId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => { loadFriends(); }, [loadFriends]);

  const pendingIncoming   = incomingChallenges.filter(c => c.status === 'pending');
  const completedIncoming = incomingChallenges.filter(c => c.status === 'beaten');
  const completedOutgoing = outgoingChallenges.filter(c => c.status === 'beaten');
  const pendingOutgoing   = outgoingChallenges.filter(c => c.status === 'pending');
  const badgeCount        = pendingRequests.length + pendingIncoming.length;

  function flash(msg: string) {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 2500);
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const res = await searchProfiles(searchQuery);
    setSearchResults(res.profiles);
    setSearching(false);
  }

  async function handleAddFriend(profileId: string, name: string) {
    setPendingIds(s => new Set(s).add(profileId));
    const res = await sendFriendRequest(profileId);
    if (res.ok) flash(`Friend request sent to ${name}!`);
    else flash(res.error ?? 'Could not send request');
  }

  async function handleAccept(friendshipId: string, name: string) {
    startTransition(async () => {
      const res = await acceptFriendRequest(friendshipId);
      if (res.ok) { flash(`You and ${name} are now friends!`); loadFriends(); }
      else flash(res.error ?? 'Error accepting request');
    });
  }

  async function handleDecline(friendshipId: string) {
    startTransition(async () => {
      await declineFriendRequest(friendshipId);
      loadFriends();
    });
  }

  async function handleRemove(friendshipId: string, name: string) {
    startTransition(async () => {
      await removeFriendship(friendshipId);
      flash(`Removed ${name}`);
      loadFriends();
    });
  }

  async function handleChallenge(friendId: string) {
    if (!save) return;
    const myBestPoints = save.stats.points;
    startTransition(async () => {
      const res = await sendDirectChallenge(friendId, myBestPoints, difficulty);
      if (res.ok) { flash('Challenge sent!'); setChallengeFriendId(null); loadFriends(); }
      else flash(res.error ?? 'Error sending challenge');
    });
  }

  if (!authUser) {
    return (
      <div style={{ height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
        <div style={{ fontSize: 40 }}>🔒</div>
        <div style={{ color: '#111827', fontWeight: 700, fontSize: 20 }}>Sign in to use Friends</div>
        <div style={{ color: '#6B7280', fontSize: 14 }}>Friends and challenges require an account.</div>
        <button onClick={goHome} style={primaryBtn}>Back to Home</button>
      </div>
    );
  }

  return (
    <div style={{ height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column', padding: '20px 24px', overflow: 'hidden', gap: 16 }}>

      {/* Header */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ color: '#111827', fontWeight: 800, fontSize: 24 }}>Friends</div>
        {actionMsg && (
          <div style={{
            background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 8,
            padding: '6px 14px', color: '#166534', fontSize: 13, fontWeight: 600,
          }}>
            {actionMsg}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ flexShrink: 0, display: 'flex', gap: 4, background: '#F3F4F6', borderRadius: 10, padding: 4 }}>
        {([
          { key: 'friends',    label: 'Friends',    badge: 0 },
          { key: 'challenges', label: 'Challenges', badge: badgeCount },
          { key: 'add',        label: 'Add Friend', badge: 0 },
        ] as { key: Tab; label: string; badge: number }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: '7px 0',
              background: tab === t.key ? '#FFFFFF' : 'transparent',
              border: 'none', borderRadius: 8,
              color: tab === t.key ? '#111827' : '#6B7280',
              fontWeight: tab === t.key ? 700 : 600,
              fontSize: 13, cursor: 'pointer',
              boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              position: 'relative',
            }}
          >
            {t.label}
            {t.badge > 0 && (
              <span style={{
                position: 'absolute', top: 2, right: 8,
                width: 16, height: 16, borderRadius: '50%',
                background: '#E2622C', color: '#fff',
                fontSize: 9, fontWeight: 800,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>

        {/* ─── Friends tab ─────────────────────────────────────────── */}
        {tab === 'friends' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {friendsLoading && (
              <div style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: 32 }}>Loading…</div>
            )}
            {!friendsLoading && friends.length === 0 && (
              <div style={emptyCard}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>👥</div>
                <div style={{ color: '#374151', fontWeight: 700, fontSize: 16 }}>No friends yet</div>
                <div style={{ color: '#9CA3AF', fontSize: 13, marginTop: 4 }}>Use the Add Friend tab to find other GMs.</div>
              </div>
            )}
            {friends.map(f => (
              <div key={f.friendshipId} style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <Avatar name={f.name} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#111827', fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                    <div style={{ color: '#6B7280', fontSize: 12, marginTop: 2 }}>
                      {fmt(f.points)} pts · {f.titles} title{f.titles !== 1 ? 's' : ''} · {f.games} games
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setChallengeFriendId(challengeFriendId === f.id ? null : f.id)}
                      style={outlineBtn}
                    >
                      ⚡ Challenge
                    </button>
                    <button onClick={() => handleRemove(f.friendshipId, f.name)} style={dangerBtn}>
                      Remove
                    </button>
                  </div>
                </div>
                {challengeFriendId === f.id && (
                  <div style={{
                    marginTop: 12, padding: '12px 14px',
                    background: '#F5F3FF', borderRadius: 10, border: '1px solid #DDD6FE',
                  }}>
                    <div style={{ color: '#4C1D95', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                      Dare {f.name} to surpass your career score
                    </div>
                    <div style={{ color: '#6B7280', fontSize: 12, marginBottom: 10 }}>
                      They must reach <strong>{fmt(save?.stats.points ?? 0)} pts</strong> total on <strong>{difficulty}</strong>. Expires in 7 days.
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => handleChallenge(f.id)} disabled={isPending} style={primaryBtn}>
                        Send Challenge
                      </button>
                      <button onClick={() => setChallengeFriendId(null)} style={ghostBtn}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ─── Challenges tab ───────────────────────────────────────── */}
        {tab === 'challenges' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Pending friend requests */}
            {pendingRequests.length > 0 && (
              <Section label="Friend Requests">
                {pendingRequests.map(r => (
                  <div key={r.friendshipId} style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Avatar name={r.name} size={40} />
                      <div style={{ flex: 1, color: '#111827', fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                      <button onClick={() => handleAccept(r.friendshipId, r.name)} disabled={isPending} style={primaryBtn}>
                        Accept
                      </button>
                      <button onClick={() => handleDecline(r.friendshipId)} disabled={isPending} style={ghostBtn}>
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </Section>
            )}

            {/* Pending incoming challenges */}
            {pendingIncoming.length > 0 && (
              <Section label="Incoming Challenges">
                {pendingIncoming.map(c => (
                  <div key={c.id} style={{ ...card, border: '1.5px solid #FDE68A', background: '#FFFBEB' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ fontSize: 28 }}>⚡</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#111827', fontWeight: 700, fontSize: 14 }}>
                          {c.from} challenged you!
                        </div>
                        <div style={{ color: '#6B7280', fontSize: 13, marginTop: 3 }}>
                          Reach <strong>{fmt(c.targetPoints)} pts</strong> total on <strong>{c.difficulty}</strong>
                        </div>
                        <div style={{ color: '#9CA3AF', fontSize: 11, marginTop: 2 }}>
                          Your score: {fmt(save?.stats.points ?? 0)} pts · Expires {new Date(c.expiresAt).toLocaleDateString()}
                        </div>
                      </div>
                      <button onClick={() => startChallenge(c.id, c.targetPoints)} style={primaryBtn}>
                        Accept &amp; Play
                      </button>
                    </div>
                  </div>
                ))}
              </Section>
            )}

            {/* Pending outgoing challenges */}
            {pendingOutgoing.length > 0 && (
              <Section label="Sent Challenges">
                {pendingOutgoing.map(c => (
                  <div key={c.id} style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ fontSize: 24 }}>⏳</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#111827', fontWeight: 600, fontSize: 14 }}>You challenged {c.to}</div>
                        <div style={{ color: '#6B7280', fontSize: 13, marginTop: 2 }}>Target: {fmt(c.targetPoints)} pts on {c.difficulty}</div>
                        <div style={{ color: '#9CA3AF', fontSize: 11, marginTop: 2 }}>Exp. {new Date(c.expiresAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </Section>
            )}

            {/* Completed challenges */}
            {(completedIncoming.length > 0 || completedOutgoing.length > 0) && (
              <Section label="Completed">
                {completedIncoming.map(c => (
                  <div key={c.id} style={{ ...card, border: '1px solid #86EFAC', background: '#F0FDF4' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ fontSize: 24 }}>✅</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#166534', fontWeight: 700, fontSize: 14 }}>You beat {c.from}'s challenge!</div>
                        <div style={{ color: '#6B7280', fontSize: 12, marginTop: 2 }}>{fmt(c.targetPoints)} pts target · {c.difficulty}</div>
                      </div>
                    </div>
                  </div>
                ))}
                {completedOutgoing.map(c => (
                  <div key={c.id} style={{ ...card, border: '1px solid #86EFAC', background: '#F0FDF4' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ fontSize: 24 }}>🏅</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#166534', fontWeight: 700, fontSize: 14 }}>{c.to} beat your challenge!</div>
                        <div style={{ color: '#6B7280', fontSize: 12, marginTop: 2 }}>{fmt(c.targetPoints)} pts target · {c.difficulty}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </Section>
            )}

            {pendingRequests.length === 0 && pendingIncoming.length === 0 && pendingOutgoing.length === 0
              && completedIncoming.length === 0 && completedOutgoing.length === 0 && (
              <div style={emptyCard}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🏅</div>
                <div style={{ color: '#374151', fontWeight: 700, fontSize: 16 }}>No active challenges</div>
                <div style={{ color: '#9CA3AF', fontSize: 13, marginTop: 4 }}>Challenge a friend from the Friends tab.</div>
              </div>
            )}
          </div>
        )}

        {/* ─── Add Friend tab ───────────────────────────────────────── */}
        {tab === 'add' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search by display name…"
                style={{
                  flex: 1, padding: '10px 14px',
                  background: '#FFFFFF', border: '1.5px solid #E5E7EB', borderRadius: 10,
                  color: '#111827', fontSize: 14, outline: 'none',
                }}
              />
              <button onClick={handleSearch} disabled={searching} style={primaryBtn}>
                {searching ? '…' : 'Search'}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {searchResults.map(p => {
                  const alreadyFriend = friends.some(f => f.id === p.id);
                  const sent = pendingIds.has(p.id);
                  return (
                    <div key={p.id} style={card}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Avatar name={p.name} size={40} />
                        <div style={{ flex: 1, color: '#111827', fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                        {alreadyFriend ? (
                          <span style={{ color: '#6B7280', fontSize: 12 }}>Already friends</span>
                        ) : sent ? (
                          <span style={{ color: '#7A3FF2', fontSize: 12, fontWeight: 600 }}>Request sent ✓</span>
                        ) : (
                          <button onClick={() => handleAddFriend(p.id, p.name)} style={primaryBtn}>
                            + Add
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {searchResults.length === 0 && searchQuery && !searching && (
              <div style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: 24 }}>
                No players found for "{searchQuery}"
              </div>
            )}

            <div style={{ marginTop: 8, padding: '14px 16px', background: '#F9FAFB', borderRadius: 12, border: '1px solid #F3F4F6' }}>
              <div style={{ color: '#374151', fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Your display name</div>
              <div style={{ color: '#6B7280', fontSize: 12 }}>
                Other players search for you using the name you registered with. Your name appears as <strong style={{ color: '#111827' }}>{authUser.email.split('@')[0]}</strong> in searches.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ name, size }: { name: string; size: number }) {
  const letter = (name[0] || '?').toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.3,
      background: '#7A3FF2', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 800, fontSize: size * 0.38,
    }}>
      {letter}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  );
}

// ─── Style constants ──────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: '#FFFFFF', borderRadius: 12, padding: '14px 16px', border: '1px solid #E5E7EB',
};
const emptyCard: React.CSSProperties = {
  background: '#F9FAFB', borderRadius: 14, padding: '40px 24px',
  border: '1px dashed #E5E7EB', textAlign: 'center',
};
const primaryBtn: React.CSSProperties = {
  padding: '8px 16px', background: '#7A3FF2', border: 'none', borderRadius: 8,
  color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
};
const ghostBtn: React.CSSProperties = {
  padding: '8px 14px', background: 'transparent', border: '1px solid #E5E7EB', borderRadius: 8,
  color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
};
const outlineBtn: React.CSSProperties = {
  padding: '7px 13px', background: '#EDE9FE', border: '1px solid #DDD6FE', borderRadius: 8,
  color: '#7A3FF2', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
};
const dangerBtn: React.CSSProperties = {
  padding: '7px 13px', background: 'transparent', border: '1px solid #FCA5A5', borderRadius: 8,
  color: '#DC2626', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
};
