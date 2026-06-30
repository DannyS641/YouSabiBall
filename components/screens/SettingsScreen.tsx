'use client';

import { useState } from 'react';
import { useGameStore, fmtCoins } from '@/store/gameStore';
import { useBreakpoint } from '@/hooks/useBreakpoint';

type Difficulty = 'Rookie' | 'Pro' | 'Hall of Fame';

const DIFF_INFO: Record<Difficulty, { desc: string; color: string }> = {
  'Rookie':       { desc: 'Weaker opponents · ×0.7 coin rewards',        color: '#22C55E' },
  'Pro':          { desc: 'Standard field · ×1.0 coin rewards',           color: '#F59E0B' },
  'Hall of Fame': { desc: 'Toughest field · ×1.45 coin rewards',          color: '#E2622C' },
};

export default function SettingsScreen() {
  const userName      = useGameStore(s => s.userName);
  const save          = useGameStore(s => s.save);
  const difficulty    = useGameStore(s => s.difficulty) as Difficulty;
  const setDifficulty = useGameStore(s => s.setDifficulty);
  const goHome        = useGameStore(s => s.goHome);
  const authUser      = useGameStore(s => s.authUser);

  const { isMobile } = useBreakpoint();
  const [copyDone, setCopyDone] = useState(false);

  function copyProfile() {
    const text = `${userName} | OVR best: ${save?.stats.topOvr ?? 0} | Titles: ${save?.stats.titles ?? 0} | Runs: ${save?.stats.runs ?? 0}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    }).catch(() => {});
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: isMobile ? '20px 16px 80px' : '28px 24px 80px' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4 }}>
          PREFERENCES
        </div>
        <div style={{ color: '#111827', fontWeight: 800, fontSize: isMobile ? 22 : 26 }}>Settings</div>
      </div>

      {/* Profile card */}
      <div style={card}>
        <div style={sectionLabel}>PROFILE</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg, #7A3FF2, #4C1D95)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 900, fontSize: 22, flexShrink: 0,
          }}>
            {(userName[0] || '?').toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#111827', fontWeight: 800, fontSize: 18, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userName}
            </div>
            <div style={{ color: '#6B7280', fontSize: 12, marginTop: 2 }}>
              {authUser ? authUser.email : 'Guest account'}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'RUNS',   value: String(save?.stats.runs ?? 0) },
            { label: 'TITLES', value: String(save?.stats.titles ?? 0) },
            { label: 'COINS',  value: fmtCoins(save) },
          ].map(s => (
            <div key={s.label} style={{ background: '#F9FAFB', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ color: '#9CA3AF', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>{s.label}</div>
              <div style={{ color: '#111827', fontWeight: 800, fontSize: 18 }}>{s.value}</div>
            </div>
          ))}
        </div>

        <button onClick={copyProfile} style={{
          width: '100%', padding: '10px 0',
          background: copyDone ? '#F0FDF4' : '#F9FAFB',
          border: `1px solid ${copyDone ? '#86EFAC' : '#E5E7EB'}`,
          borderRadius: 10,
          color: copyDone ? '#16A34A' : '#374151',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          {copyDone ? '✓ Copied!' : '📋 Copy profile card'}
        </button>
      </div>

      {/* Default difficulty */}
      <div style={{ ...card, marginTop: 14 }}>
        <div style={sectionLabel}>DEFAULT DIFFICULTY</div>
        <div style={{ color: '#6B7280', fontSize: 12, marginBottom: 14 }}>
          Applied when you enter the playoffs. You can always change it on the team screen.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(Object.keys(DIFF_INFO) as Difficulty[]).map(d => {
            const info   = DIFF_INFO[d];
            const active = difficulty === d;
            return (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px',
                  background: active ? `${info.color}10` : '#F9FAFB',
                  border: `2px solid ${active ? info.color : '#E5E7EB'}`,
                  borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{
                  width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                  background: active ? info.color : '#E5E7EB',
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#111827', fontWeight: 700, fontSize: 14 }}>{d}</div>
                  <div style={{ color: '#9CA3AF', fontSize: 11, marginTop: 1 }}>{info.desc}</div>
                </div>
                {active && (
                  <div style={{ color: info.color, fontWeight: 800, fontSize: 11, flexShrink: 0 }}>ACTIVE</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* How to Play */}
      <div style={{ ...card, marginTop: 14 }}>
        <div style={sectionLabel}>HOW TO PLAY</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { step: '1', icon: '🎰', title: 'Draft your squad',    desc: 'Spin the wheel 5 times to fill PG, SG, SF, PF, and C. Your first re-roll each draft is free.' },
            { step: '2', icon: '⚙️', title: 'Set up your run',     desc: 'Pick a difficulty (Rookie → Hall of Fame) for different coin multipliers, then choose a coaching perk.' },
            { step: '3', icon: '🏆', title: 'Win the playoffs',    desc: 'Beat 4 opponents across First Round → Conf Semis → Conf Finals → NBA Finals. Watch live or sim.' },
            { step: '4', icon: '💰', title: 'Earn & upgrade',      desc: 'Every run earns coins. Buy Draft Tokens for better pulls, open packs to grow your vault.' },
          ].map(s => (
            <div key={s.step} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: '#F3F4F6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16,
              }}>
                {s.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#111827', fontWeight: 700, fontSize: 13 }}>{s.title}</div>
                <div style={{ color: '#6B7280', fontSize: 12, marginTop: 2, lineHeight: 1.4 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* About */}
      <div style={{ ...card, marginTop: 14 }}>
        <div style={sectionLabel}>ABOUT</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            { label: 'Game',    value: 'YOU SABI BALL' },
            { label: 'Version', value: '1.0.0' },
            { label: 'Stack',   value: 'Next.js · Zustand · Supabase' },
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F3F4F6' }}>
              <span style={{ color: '#6B7280', fontSize: 13 }}>{r.label}</span>
              <span style={{ color: '#111827', fontWeight: 600, fontSize: 13 }}>{r.value}</span>
            </div>
          ))}
        </div>
      </div>

      <button onClick={goHome} style={{
        marginTop: 24, width: '100%', padding: '13px 0',
        background: 'transparent', border: '1px solid #E5E7EB', borderRadius: 12,
        color: '#6B7280', fontSize: 14, fontWeight: 600, cursor: 'pointer',
      }}>
        ← Back to Home
      </button>
    </div>
  );
}

const card: React.CSSProperties = {
  background: '#FFFFFF', borderRadius: 14,
  padding: '18px 18px', border: '1px solid #E5E7EB',
};
const sectionLabel: React.CSSProperties = {
  color: '#9CA3AF', fontSize: 10, fontWeight: 700,
  letterSpacing: '0.08em', marginBottom: 12,
};
