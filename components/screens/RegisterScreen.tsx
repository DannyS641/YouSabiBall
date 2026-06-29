'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { signUp, signIn } from '@/app/actions/auth';

type Tab = 'signin' | 'signup' | 'guest';

const DIFFS = ['Rookie', 'Pro', 'Hall of Fame'] as const;
const DIFF_DESC: Record<string, string> = {
  'Rookie':       'Win bonus — easy to compete',
  'Pro':          'Balanced odds, standard rewards',
  'Hall of Fame': 'True test — max coins & points',
};

export default function RegisterScreen() {
  const nameInput   = useGameStore(s => s.nameInput);
  const profiles    = useGameStore(s => s.profiles);
  const difficulty  = useGameStore(s => s.difficulty);
  const setName     = useGameStore(s => s.setNameInput);
  const setDiff     = useGameStore(s => s.setDifficulty);
  const play        = useGameStore(s => s.play);
  const pickProfile = useGameStore(s => s.pickProfile);
  const setAuthUser = useGameStore(s => s.setAuthUser);

  const [tab,         setTab]         = useState<Tab>('signin');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  async function handleSignIn() {
    if (!email.trim() || !password) return;
    setLoading(true); setError(null);
    const result = await signIn(email.trim(), password);
    setLoading(false);
    if (!result.ok) { setError(result.error ?? 'Sign in failed'); return; }
    setAuthUser({ id: '', email: email.trim() });
    play(result.name ?? (email.split('@')[0]));
  }

  async function handleSignUp() {
    if (!email.trim() || !password) return;
    setLoading(true); setError(null);
    const result = await signUp(email.trim(), password, displayName.trim());
    setLoading(false);
    if (!result.ok) { setError(result.error ?? 'Sign up failed'); return; }
    setAuthUser({ id: '', email: email.trim() });
    play(result.name ?? (displayName.trim() || (email.split('@')[0])));
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#F4F5F7', padding: 24,
    }}>

      {/* Logo */}
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{
          fontFamily: 'var(--font-mono, monospace)', fontWeight: 900,
          fontSize: 28, letterSpacing: '0.08em', color: '#E2622C', lineHeight: 1,
        }}>
          YOU SABI BALL
        </div>
        <div style={{ color: '#9CA3AF', fontSize: 12, marginTop: 6, letterSpacing: '0.1em', fontWeight: 600 }}>
          DRAFT · COURT · GLORY
        </div>
      </div>

      {/* Card */}
      <div style={{
        background: '#FFFFFF', borderRadius: 16, padding: '28px 28px',
        width: '100%', maxWidth: 420,
        border: '1px solid #E5E7EB',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderRadius: 10, overflow: 'hidden', background: '#F3F4F6', padding: 4 }}>
          {(['signin', 'signup', 'guest'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null); }}
              style={{
                flex: 1, padding: '8px 0',
                background: tab === t ? '#FFFFFF' : 'transparent',
                border: 'none', cursor: 'pointer',
                color: tab === t ? '#111827' : '#6B7280',
                fontWeight: tab === t ? 700 : 600,
                fontSize: 12, letterSpacing: '0.06em',
                borderRadius: 8,
                boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {t === 'signin' ? 'SIGN IN' : t === 'signup' ? 'SIGN UP' : 'GUEST'}
            </button>
          ))}
        </div>

        {/* Auth form */}
        {(tab === 'signin' || tab === 'signup') && (
          <>
            {tab === 'signup' && (
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Display name (optional)"
                maxLength={20}
                style={inputStyle}
              />
            )}
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              style={{ ...inputStyle, marginTop: tab === 'signup' ? 10 : 0 }}
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (tab === 'signin' ? handleSignIn() : handleSignUp())}
              placeholder="Password"
              style={{ ...inputStyle, marginTop: 10 }}
            />

            {error && (
              <div style={{ color: '#DC2626', fontSize: 12, marginTop: 8, textAlign: 'center' }}>
                {error}
              </div>
            )}

            <DifficultyPicker difficulty={difficulty} setDiff={setDiff} />

            <button
              onClick={tab === 'signin' ? handleSignIn : handleSignUp}
              disabled={loading || !email.trim() || !password}
              style={{
                ...ctaBtn,
                background: loading || !email.trim() || !password ? '#E5E7EB' : '#E2622C',
                color:      loading || !email.trim() || !password ? '#9CA3AF' : '#fff',
                cursor:     loading || !email.trim() || !password ? 'default'  : 'pointer',
                marginTop: 20,
              }}
            >
              {loading ? 'Loading…' : tab === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
            </button>
          </>
        )}

        {/* Guest mode */}
        {tab === 'guest' && (
          <>
            <p style={{ color: '#6B7280', fontSize: 13, marginTop: 0, marginBottom: 16, lineHeight: 1.6 }}>
              Play offline — progress saved in this browser only.
              Sign up any time to unlock cloud saves and the global leaderboard.
            </p>
            <input
              type="text"
              value={nameInput}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && nameInput.trim() && play(nameInput)}
              placeholder="GM name…"
              maxLength={20}
              style={inputStyle}
            />

            <DifficultyPicker difficulty={difficulty} setDiff={setDiff} />

            <button
              onClick={() => play(nameInput)}
              disabled={!nameInput.trim()}
              style={{
                ...ctaBtn,
                background: nameInput.trim() ? '#7A3FF2' : '#E5E7EB',
                color:      nameInput.trim() ? '#fff'    : '#9CA3AF',
                cursor:     nameInput.trim() ? 'pointer' : 'default',
                marginTop: 20,
              }}
            >
              PLAY AS GUEST
            </button>

            {profiles.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 10, textAlign: 'center' }}>
                  RECENT
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                  {profiles.map(p => (
                    <button
                      key={p}
                      onClick={() => pickProfile(p)}
                      style={{
                        background: '#F3F4F6', border: '1px solid #E5E7EB',
                        borderRadius: 20, padding: '6px 14px',
                        color: '#374151', fontSize: 12, fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DifficultyPicker({
  difficulty, setDiff,
}: {
  difficulty: typeof DIFFS[number];
  setDiff:    (d: typeof DIFFS[number]) => void;
}) {
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ color: '#6B7280', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 10 }}>
        DIFFICULTY
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {DIFFS.map(d => (
          <button
            key={d}
            onClick={() => setDiff(d)}
            style={{
              textAlign: 'left', padding: '10px 14px',
              background:   difficulty === d ? '#F5F3FF' : '#F9FAFB',
              border:       `1.5px solid ${difficulty === d ? '#7A3FF2' : '#E5E7EB'}`,
              borderRadius: 8, cursor: 'pointer',
            }}
          >
            <div style={{ color: difficulty === d ? '#7A3FF2' : '#374151', fontWeight: 700, fontSize: 13 }}>
              {d}
            </div>
            <div style={{ color: '#9CA3AF', fontSize: 11, marginTop: 2 }}>
              {DIFF_DESC[d]}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  display: 'block', width: '100%', padding: '12px 14px',
  background: '#F9FAFB', border: '1.5px solid #E5E7EB',
  borderRadius: 8, color: '#111827',
  fontSize: 15, outline: 'none', boxSizing: 'border-box',
};

const ctaBtn: React.CSSProperties = {
  display: 'block', width: '100%',
  padding: '14px 0',
  border: 'none', borderRadius: 8,
  fontSize: 15, fontWeight: 800,
  letterSpacing: '0.06em',
  transition: 'background 0.15s',
};
