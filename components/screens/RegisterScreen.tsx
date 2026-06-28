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
    if (!result.ok) { setError(result.error); return; }
    setAuthUser({ id: '', email: email.trim() });
    play(result.name ?? (email.split('@')[0]));
  }

  async function handleSignUp() {
    if (!email.trim() || !password) return;
    setLoading(true); setError(null);
    const result = await signUp(email.trim(), password, displayName.trim());
    setLoading(false);
    if (!result.ok) { setError(result.error); return; }
    setAuthUser({ id: '', email: email.trim() });
    play(result.name ?? (displayName.trim() || (email.split('@')[0])));
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#16181D', padding: 24,
    }}>

      {/* Logo */}
      <div style={{ marginBottom: 8, textAlign: 'center' }}>
        <div style={{
          fontFamily: 'var(--font-mono, monospace)', fontWeight: 900,
          fontSize: 42, letterSpacing: '0.12em', color: '#E2622C', lineHeight: 1,
        }}>
          HARDWOOD
        </div>
        <div style={{ color: '#6B7280', fontSize: 13, marginTop: 4, letterSpacing: '0.08em' }}>
          DRAFT · COURT · GLORY
        </div>
      </div>

      {/* Card */}
      <div style={{
        background: '#1E2128', borderRadius: 16, padding: '32px 28px',
        width: '100%', maxWidth: 420,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        marginTop: 32,
      }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderRadius: 8, overflow: 'hidden', background: '#272B33' }}>
          {(['signin', 'signup', 'guest'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null); }}
              style={{
                flex: 1, padding: '9px 0',
                background: tab === t ? '#E2622C' : 'transparent',
                border: 'none', cursor: 'pointer',
                color: tab === t ? '#fff' : '#6B7280',
                fontWeight: 700, fontSize: 12,
                letterSpacing: '0.06em',
                transition: 'background 0.15s',
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
              <div style={{ color: '#F87171', fontSize: 12, marginTop: 8, textAlign: 'center' }}>
                {error}
              </div>
            )}

            <DifficultyPicker difficulty={difficulty} setDiff={setDiff} />

            <button
              onClick={tab === 'signin' ? handleSignIn : handleSignUp}
              disabled={loading || !email.trim() || !password}
              style={{
                ...ctaBtn,
                background: loading || !email.trim() || !password ? '#3A3F4A' : '#E2622C',
                color:      loading || !email.trim() || !password ? '#6B7280' : '#fff',
                cursor:     loading || !email.trim() || !password ? 'default' : 'pointer',
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
            <p style={{ color: '#9CA1AC', fontSize: 13, marginTop: 0, marginBottom: 16, lineHeight: 1.5 }}>
              Play offline — your progress is saved in this browser only.
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
                background: nameInput.trim() ? '#7A3FF2' : '#3A3F4A',
                color:      nameInput.trim() ? '#fff'    : '#6B7280',
                cursor:     nameInput.trim() ? 'pointer' : 'default',
                marginTop: 20,
              }}
            >
              PLAY AS GUEST
            </button>

            {/* Returning guest profiles */}
            {profiles.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ color: '#6B7280', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 10, textAlign: 'center' }}>
                  RECENT
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                  {profiles.map(p => (
                    <button
                      key={p}
                      onClick={() => pickProfile(p)}
                      style={{
                        background: '#272B33', border: '1px solid #3A3F4A',
                        borderRadius: 20, padding: '6px 14px',
                        color: '#9CA1AC', fontSize: 12, fontWeight: 600,
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
      <div style={{ color: '#9CA1AC', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 10 }}>
        DIFFICULTY
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {DIFFS.map(d => (
          <button
            key={d}
            onClick={() => setDiff(d)}
            style={{
              textAlign: 'left', padding: '10px 14px',
              background:   difficulty === d ? '#2C2060' : '#272B33',
              border:       `1.5px solid ${difficulty === d ? '#7A3FF2' : '#3A3F4A'}`,
              borderRadius: 8, cursor: 'pointer',
            }}
          >
            <div style={{ color: difficulty === d ? '#A97CF8' : '#F4F5F7', fontWeight: 700, fontSize: 13 }}>
              {d}
            </div>
            <div style={{ color: '#6B7280', fontSize: 11, marginTop: 2 }}>
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
  background: '#272B33', border: '1.5px solid #3A3F4A',
  borderRadius: 8, color: '#F4F5F7',
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
