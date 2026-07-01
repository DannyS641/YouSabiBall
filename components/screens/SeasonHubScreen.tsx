'use client';

import { useState } from 'react';
import { useGameStore, POS_COLORS, TIER_COLORS, lastName } from '@/store/gameStore';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { PLAYERS } from '@/data/players';
import { tierFor } from '@/lib/sim';
import { playerSeasonCost } from '@/lib/sim';
import type { SeasonLength, StandingsRow, SeasonTeam, PlayInBracket, PlayInConf, PlayoffBracket, PlayoffRound, SeriesState, SeasonRosterPlayer, GameSlot } from '@/lib/sim';
import type { Position, Card } from '@/lib/types';

const TRADE_COST = 80;
const MAX_TRADES = 3;

const LENGTH_OPTIONS: { value: SeasonLength; label: string; games: number; desc: string }[] = [
  { value: 'short',    label: 'Short',    games: 14, desc: '7 weeks · quick run' },
  { value: 'standard', label: 'Standard', games: 28, desc: '14 weeks · balanced' },
  { value: 'full',     label: 'Full',     games: 82, desc: '41 weeks · instant sim' },
];

const CONF_OPTIONS: { value: 'East' | 'West'; label: string }[] = [
  { value: 'East', label: 'Eastern Conference' },
  { value: 'West', label: 'Western Conference' },
];

type Difficulty = 'Rookie' | 'Pro' | 'Hall of Fame';
const DIFF_INFO: Record<Difficulty, { desc: string; color: string }> = {
  'Rookie':       { desc: 'Weaker field · ×0.7 coin rewards',   color: '#22C55E' },
  'Pro':          { desc: 'Standard field · ×1.0 coin rewards',  color: '#F59E0B' },
  'Hall of Fame': { desc: 'Toughest field · ×1.45 coin rewards', color: '#E2622C' },
};

export default function SeasonHubScreen() {
  const seasonLength       = useGameStore(s => s.seasonLength);
  const seasonConference   = useGameStore(s => s.seasonConference);
  const seasonStatus       = useGameStore(s => s.seasonStatus);
  const seasonStandings    = useGameStore(s => s.seasonStandings);
  const seasonTeams        = useGameStore(s => s.seasonTeams);
  const seasonSchedule     = useGameStore(s => s.seasonSchedule);
  const seasonRosterFull   = useGameStore(s => s.seasonRosterFull);
  const seasonGameIndex    = useGameStore(s => s.seasonGameIndex);
  const seasonTrainingPoints = useGameStore(s => s.seasonTrainingPoints);
  const seasonBudget       = useGameStore(s => s.seasonBudget);
  const seasonTradesLeft   = useGameStore(s => s.seasonTradesLeft);
  const seasonTradeLog     = useGameStore(s => s.seasonTradeLog);
  const seasonTradeTarget  = useGameStore(s => s.seasonTradeTarget);
  const difficulty         = useGameStore(s => s.difficulty) as Difficulty;
  const save               = useGameStore(s => s.save);
  const userName           = useGameStore(s => s.userName);

  const setSeasonLength        = useGameStore(s => s.setSeasonLength);
  const setSeasonConference    = useGameStore(s => s.setSeasonConference);
  const setDifficulty          = useGameStore(s => s.setDifficulty);
  const startSeason            = useGameStore(s => s.startSeason);
  const buySeasonPlayer        = useGameStore(s => s.buySeasonPlayer);
  const removeSeasonPlayer     = useGameStore(s => s.removeSeasonPlayer);
  const lockRoster             = useGameStore(s => s.lockRoster);
  const simNextGame            = useGameStore(s => s.simNextGame);
  const simWeek                = useGameStore(s => s.simWeek);
  const simToTradeDeadline     = useGameStore(s => s.simToTradeDeadline);
  const simRestOfSeason        = useGameStore(s => s.simRestOfSeason);
  const spendTrainingPoint     = useGameStore(s => s.spendTrainingPoint);
  const openTradeModal         = useGameStore(s => s.openTradeModal);
  const closeTradeModal        = useGameStore(s => s.closeTradeModal);
  const executeTrade           = useGameStore(s => s.executeTrade);
  const skipTradeWindow        = useGameStore(s => s.skipTradeWindow);
  const simPlayIn              = useGameStore(s => s.simPlayIn);
  const advanceToPlayoffs      = useGameStore(s => s.advanceToPlayoffs);
  const simNextPlayoffRound    = useGameStore(s => s.simNextPlayoffRound);
  const completeSeasonRun      = useGameStore(s => s.completeSeasonRun);
  const playInBracket          = useGameStore(s => s.playInBracket);
  const playInSeeds            = useGameStore(s => s.playInSeeds);
  const playoffBracket         = useGameStore(s => s.playoffBracket);
  const goHome                 = useGameStore(s => s.goHome);

  const { isMobile } = useBreakpoint();
  const humanOvr = Math.max(save?.stats.topOvr ?? 82, 75);

  // ── Route to the correct sub-view ─────────────────────────────────────────
  if (seasonStatus === 'roster_build') {
    return (
      <RosterBuilderView
        roster={seasonRosterFull}
        budget={seasonBudget}
        teams={seasonTeams}
        userName={userName}
        isMobile={isMobile}
        onBuy={buySeasonPlayer}
        onRemove={removeSeasonPlayer}
        onLock={lockRoster}
        onBack={goHome}
      />
    );
  }

  if (seasonStatus === 'regular_season') {
    return (
      <RegularSeasonView
        roster={seasonRosterFull}
        teams={seasonTeams}
        standings={seasonStandings}
        schedule={seasonSchedule}
        gameIndex={seasonGameIndex}
        trainingPoints={seasonTrainingPoints}
        userName={userName}
        isMobile={isMobile}
        onNextGame={simNextGame}
        onSimWeek={simWeek}
        onSimToDeadline={simToTradeDeadline}
        onSimRest={simRestOfSeason}
        onSpendTraining={spendTrainingPoint}
      />
    );
  }

  if (seasonStatus === 'trade_window') {
    return (
      <TradeWindowView
        roster={seasonRosterFull.filter(p => p.isStarter).map(p => p.card)}
        tradesLeft={seasonTradesLeft}
        tradeLog={seasonTradeLog}
        tradeTarget={seasonTradeTarget}
        coins={save?.coins ?? 0}
        userName={userName}
        isMobile={isMobile}
        onOpenTrade={openTradeModal}
        onCloseTrade={closeTradeModal}
        onExecuteTrade={executeTrade}
        onSkip={skipTradeWindow}
      />
    );
  }

  if (seasonStatus === 'play_in' && playInBracket) {
    return (
      <PlayInView
        bracket={playInBracket}
        seasonTeams={seasonTeams}
        seasonStandings={seasonStandings}
        playInSeeds={playInSeeds}
        userName={userName}
        isMobile={isMobile}
        onSim={simPlayIn}
        onAdvance={advanceToPlayoffs}
        onBack={goHome}
      />
    );
  }

  if (seasonStatus === 'playoffs' && playoffBracket) {
    return (
      <PlayoffsView
        bracket={playoffBracket}
        userName={userName}
        isMobile={isMobile}
        onSimRound={simNextPlayoffRound}
        onBack={goHome}
      />
    );
  }

  if (seasonStatus === 'complete') {
    return (
      <SeasonCompleteView
        teams={seasonTeams}
        roster={seasonRosterFull}
        playoffBracket={playoffBracket}
        userName={userName}
        isMobile={isMobile}
        onFinish={() => { completeSeasonRun(); goHome(); }}
      />
    );
  }

  // ── Setup view ───────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: isMobile ? '20px 16px 80px' : '28px 24px 80px' }}>

      <div style={{ marginBottom: 28 }}>
        <div style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4 }}>
          NBA SEASON MODE
        </div>
        <div style={{ color: '#111827', fontWeight: 800, fontSize: isMobile ? 24 : 30, letterSpacing: '-0.02em', marginBottom: 6 }}>
          Build your season.
        </div>
        <div style={{ color: '#6B7280', fontSize: 13, lineHeight: 1.5 }}>
          Compete against all 30 NBA teams across a full regular season, then battle through Play-In and Playoffs to win the championship.
        </div>
      </div>

      {/* Your team card */}
      <div style={{ ...card, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: 'linear-gradient(135deg, #7A3FF2, #4C1D95)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 900, fontSize: 20, flexShrink: 0,
        }}>
          {(userName[0] || '?').toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 2 }}>YOUR FRANCHISE</div>
          <div style={{ color: '#111827', fontWeight: 800, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {userName}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em' }}>TEAM OVR</div>
          <div style={{ color: '#7A3FF2', fontWeight: 900, fontSize: 24, lineHeight: 1 }}>{humanOvr}</div>
        </div>
      </div>

      {/* Season length picker */}
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={sectionLabel}>SEASON LENGTH</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {LENGTH_OPTIONS.map(opt => {
            const active = seasonLength === opt.value;
            return (
              <button key={opt.value} onClick={() => setSeasonLength(opt.value)} style={{
                flex: 1, padding: isMobile ? '12px 6px' : '14px 10px',
                background: active ? '#F5F3FF' : '#F9FAFB',
                border: `2px solid ${active ? '#7A3FF2' : '#E5E7EB'}`,
                borderRadius: 12, cursor: 'pointer', textAlign: 'center',
              }}>
                <div style={{ color: active ? '#7A3FF2' : '#111827', fontWeight: 800, fontSize: isMobile ? 13 : 15 }}>{opt.label}</div>
                <div style={{ color: active ? '#7A3FF2' : '#9CA3AF', fontWeight: 700, fontSize: isMobile ? 18 : 22, lineHeight: 1, margin: '4px 0' }}>{opt.games}</div>
                <div style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 600 }}>{opt.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conference picker */}
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={sectionLabel}>YOUR CONFERENCE</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {CONF_OPTIONS.map(opt => {
            const active = seasonConference === opt.value;
            return (
              <button key={opt.value} onClick={() => setSeasonConference(opt.value)} style={{
                flex: 1, padding: '12px 10px',
                background: active ? '#EFF6FF' : '#F9FAFB',
                border: `2px solid ${active ? '#3B82F6' : '#E5E7EB'}`,
                borderRadius: 12, cursor: 'pointer', textAlign: 'center',
              }}>
                <div style={{ color: active ? '#1D4ED8' : '#374151', fontWeight: 700, fontSize: 14 }}>{opt.label}</div>
              </button>
            );
          })}
        </div>
        <div style={{ color: '#9CA3AF', fontSize: 11, marginTop: 8, lineHeight: 1.4 }}>
          Your team replaces the weakest franchise in the chosen conference.
        </div>
      </div>

      {/* Difficulty picker */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={sectionLabel}>DIFFICULTY</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(Object.keys(DIFF_INFO) as Difficulty[]).map(d => {
            const info = DIFF_INFO[d];
            const active = difficulty === d;
            return (
              <button key={d} onClick={() => setDifficulty(d)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px',
                background: active ? `${info.color}10` : '#F9FAFB',
                border: `2px solid ${active ? info.color : '#E5E7EB'}`,
                borderRadius: 10, cursor: 'pointer', textAlign: 'left',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: active ? info.color : '#E5E7EB', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span style={{ color: '#111827', fontWeight: 700, fontSize: 13 }}>{d}</span>
                  <span style={{ color: '#9CA3AF', fontSize: 11, marginLeft: 8 }}>{info.desc}</span>
                </div>
                {active && <span style={{ color: info.color, fontWeight: 800, fontSize: 10, flexShrink: 0 }}>ACTIVE</span>}
              </button>
            );
          })}
        </div>
      </div>

      <button onClick={startSeason} style={{
        width: '100%', padding: '16px 0',
        background: '#16181D', border: 'none', borderRadius: 14,
        color: '#fff', fontWeight: 900, fontSize: 16,
        letterSpacing: '0.04em', cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(16,24,40,0.18)',
      }}>
        Simulate {LENGTH_OPTIONS.find(o => o.value === seasonLength)?.games}-Game Season →
      </button>

      <button onClick={goHome} style={{
        marginTop: 12, width: '100%', padding: '11px 0',
        background: 'transparent', border: '1px solid #E5E7EB', borderRadius: 12,
        color: '#6B7280', fontSize: 13, fontWeight: 600, cursor: 'pointer',
      }}>
        ← Back to Home
      </button>
    </div>
  );
}

// ─── Standings View ────────────────────────────────────────────────────────────

function StandingsView({ standings, seasonTeams, userName, isMobile, onBack, onAdvance }: {
  standings: { east: StandingsRow[]; west: StandingsRow[] };
  seasonTeams: SeasonTeam[];
  userName: string;
  isMobile: boolean;
  onBack: () => void;
  onAdvance: () => void;
}) {
  const humanRow = standings.east.find(r => r.isHuman) ?? standings.west.find(r => r.isHuman);
  const coinsEarned = humanRow ? humanRow.wins * 5 : 0;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? '20px 14px 80px' : '28px 24px 80px' }}>

      <div style={{ marginBottom: 20 }}>
        <div style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4 }}>
          REGULAR SEASON COMPLETE
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ color: '#111827', fontWeight: 800, fontSize: isMobile ? 22 : 28, letterSpacing: '-0.02em' }}>
            Final Standings
          </div>
          <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 20, padding: '5px 12px', color: '#16A34A', fontWeight: 700, fontSize: 12 }}>
            +{coinsEarned} coins earned
          </div>
        </div>
      </div>

      {/* Human team result */}
      {humanRow && (
        <div style={{
          background: 'linear-gradient(135deg, #7A3FF2, #4C1D95)',
          borderRadius: 14, padding: isMobile ? '16px 18px' : '20px 24px',
          marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <div style={{
            width: 46, height: 46, borderRadius: 12,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 900, fontSize: 18, flexShrink: 0,
          }}>
            {(userName[0] || '?').toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 2 }}>
              {humanRow.conference.toUpperCase()} CONFERENCE
            </div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: isMobile ? 16 : 20 }}>{humanRow.name}</div>
          </div>
          <div style={{ display: 'flex', gap: isMobile ? 16 : 24, flexShrink: 0 }}>
            {[
              { label: 'WINS', value: String(humanRow.wins) },
              { label: 'LOSS', value: String(humanRow.losses) },
              { label: 'PCT',  value: humanRow.pct.toFixed(3).replace(/^0/, '') },
              { label: 'DIFF', value: (humanRow.diff >= 0 ? '+' : '') + humanRow.diff },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: 700, letterSpacing: '0.06em' }}>{s.label}</div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 18, lineHeight: 1, marginTop: 2 }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 16 }}>
        <StandingsTable title="Eastern Conference" rows={standings.east} userName={userName} isMobile={isMobile} />
        <StandingsTable title="Western Conference" rows={standings.west} userName={userName} isMobile={isMobile} />
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { color: '#22C55E', label: 'Clinched Playoff (1–6)' },
          { color: '#F59E0B', label: 'Play-In (7–10)' },
          { color: '#E5E7EB', label: 'Eliminated (11–15)' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color, flexShrink: 0 }} />
            <span style={{ color: '#6B7280', fontSize: 11 }}>{l.label}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={onBack} style={{
          flex: 1, minWidth: 120, padding: '13px 0',
          background: 'transparent', border: '1.5px solid #E5E7EB', borderRadius: 12,
          color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
          ← Home
        </button>
        <button onClick={onAdvance} style={{
          flex: 2, minWidth: 200, padding: '13px 0',
          background: '#16181D', border: 'none', borderRadius: 12,
          color: '#fff', fontWeight: 800, fontSize: 14,
          letterSpacing: '0.04em', cursor: 'pointer',
        }}>
          Enter Trade Window →
        </button>
      </div>
    </div>
  );
}

function StandingsTable({ title, rows, userName, isMobile }: {
  title: string; rows: StandingsRow[]; userName: string; isMobile: boolean;
}) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#111827', fontWeight: 800, fontSize: 13 }}>{title}</span>
        <div style={{ display: 'flex', gap: 10 }}>
          {['W', 'L', 'PCT', 'DIFF'].map(h => (
            <span key={h} style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', minWidth: h === 'PCT' ? 34 : h === 'DIFF' ? 30 : 16, textAlign: 'right', display: 'block' }}>{h}</span>
          ))}
        </div>
      </div>
      {rows.map((row, i) => {
        const isHuman   = row.isHuman || row.name === userName;
        const inPlayoff = i < 6;
        const inPlayIn  = i >= 6 && i < 10;
        return (
          <div key={row.slug} style={{
            display: 'flex', alignItems: 'center', padding: '7px 14px',
            background: isHuman ? '#F5F3FF' : inPlayoff ? '#F0FDF4' : inPlayIn ? '#FFFBEB' : '#fff',
            borderBottom: '1px solid #F9FAFB',
            borderLeft: isHuman ? '3px solid #7A3FF2' : inPlayoff ? '3px solid #22C55E' : inPlayIn ? '3px solid #F59E0B' : '3px solid transparent',
          }}>
            <div style={{ width: 20, flexShrink: 0, color: inPlayoff ? '#16A34A' : inPlayIn ? '#D97706' : '#9CA3AF', fontSize: 10, fontWeight: 800 }}>{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{
                color: isHuman ? '#7A3FF2' : '#111827',
                fontWeight: isHuman ? 800 : 600,
                fontSize: isMobile ? 12 : 13,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
              }}>
                {row.name}{isHuman ? ' ★' : ''}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
              {[
                { v: row.wins, w: 16, c: '#111827' },
                { v: row.losses, w: 16, c: '#6B7280' },
                { v: row.pct.toFixed(3).replace(/^0/, ''), w: 34, c: '#374151' },
                { v: (row.diff >= 0 ? '+' : '') + row.diff, w: 30, c: row.diff >= 0 ? '#16A34A' : '#DC2626' },
              ].map((col, ci) => (
                <span key={ci} style={{ fontSize: isMobile ? 11 : 12, fontWeight: 600, textAlign: 'right', minWidth: col.w, color: col.c as string }}>{col.v}</span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Trade Window View ────────────────────────────────────────────────────────

function TradeWindowView({
  roster, tradesLeft, tradeLog, tradeTarget, coins, userName,
  isMobile, onOpenTrade, onCloseTrade, onExecuteTrade, onSkip,
}: {
  roster: Card[];
  tradesLeft: number;
  tradeLog: { pos: string; offered: string; received: string }[];
  tradeTarget: Position | null;
  coins: number;
  userName: string;
  isMobile: boolean;
  onOpenTrade: (pos: Position) => void;
  onCloseTrade: () => void;
  onExecuteTrade: (pos: Position, target: Card) => void;
  onSkip: () => void;
}) {
  const currentOvr = roster.length
    ? Math.round(roster.reduce((s, c) => s + c.ovr, 0) / roster.length)
    : 0;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: isMobile ? '20px 16px 80px' : '28px 24px 80px' }}>

      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4 }}>
          MID-SEASON
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ color: '#111827', fontWeight: 800, fontSize: isMobile ? 22 : 28, letterSpacing: '-0.02em' }}>
            Trade Window
          </div>
          <div style={{
            background: tradesLeft > 0 ? '#F5F3FF' : '#F9FAFB',
            border: `1px solid ${tradesLeft > 0 ? '#C4B5FD' : '#E5E7EB'}`,
            borderRadius: 20, padding: '5px 12px',
            color: tradesLeft > 0 ? '#7A3FF2' : '#9CA3AF',
            fontWeight: 700, fontSize: 12,
          }}>
            {tradesLeft}/{MAX_TRADES} trades remaining
          </div>
        </div>
        <div style={{ color: '#6B7280', fontSize: 13, marginTop: 6 }}>
          Swap players to strengthen your lineup before the playoffs. Each trade costs {TRADE_COST} coins.
        </div>
      </div>

      {/* Team OVR */}
      <div style={{ ...card, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 46, height: 46, borderRadius: 12,
          background: 'linear-gradient(135deg, #7A3FF2, #4C1D95)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 900, fontSize: 18, flexShrink: 0,
        }}>
          {(userName[0] || '?').toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 2 }}>ROSTER OVR</div>
          <div style={{ color: '#111827', fontWeight: 800, fontSize: 22 }}>{currentOvr}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em' }}>COINS</div>
          <div style={{ color: '#92400E', fontWeight: 800, fontSize: 16 }}>🪙 {coins.toLocaleString()}</div>
        </div>
      </div>

      {/* Roster grid */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={sectionLabel}>YOUR STARTERS — tap to see trade options</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: isMobile ? 6 : 10 }}>
          {roster.map(card => {
            const color = POS_COLORS[card.pos as keyof typeof POS_COLORS] ?? '#6B7280';
            const tierColor = TIER_COLORS[tierFor(card.ovr)];
            const canAfford = coins >= TRADE_COST;
            const outOfTrades = tradesLeft <= 0;
            return (
              <button
                key={card.pos}
                onClick={() => onOpenTrade(card.pos as Position)}
                disabled={!canAfford || outOfTrades}
                style={{
                  background: '#F9FAFB',
                  border: `2px solid ${tierColor}`,
                  borderRadius: 10,
                  padding: isMobile ? '10px 4px' : '12px 8px',
                  textAlign: 'center',
                  cursor: !canAfford || outOfTrades ? 'default' : 'pointer',
                  opacity: !canAfford || outOfTrades ? 0.6 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                <div style={{ color, fontWeight: 800, fontSize: isMobile ? 10 : 11, letterSpacing: '0.04em', marginBottom: 4 }}>{card.pos}</div>
                <div style={{ color: '#111827', fontWeight: 700, fontSize: isMobile ? 9 : 11, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {lastName(card.name)}
                </div>
                <div style={{ color: tierColor, fontWeight: 900, fontSize: isMobile ? 15 : 17 }}>{card.ovr}</div>
                {canAfford && !outOfTrades && (
                  <div style={{ color: '#9CA3AF', fontSize: 8, marginTop: 3, fontWeight: 600 }}>TAP</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Trade log */}
      {tradeLog.length > 0 && (
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={sectionLabel}>COMPLETED TRADES</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tradeLog.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span style={{ color: POS_COLORS[t.pos as keyof typeof POS_COLORS] ?? '#9CA3AF', fontWeight: 700, fontSize: 10, flexShrink: 0, minWidth: 24 }}>{t.pos}</span>
                <span style={{ color: '#DC2626', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.offered}</span>
                <span style={{ color: '#9CA3AF', fontSize: 11, flexShrink: 0 }}>→</span>
                <span style={{ color: '#16A34A', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>{t.received}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={onSkip} style={{
        width: '100%', padding: '14px 0',
        background: '#16181D', border: 'none', borderRadius: 12,
        color: '#fff', fontWeight: 800, fontSize: 14,
        letterSpacing: '0.04em', cursor: 'pointer',
      }}>
        Continue to Play-In →
      </button>
      <div style={{ color: '#9CA3AF', fontSize: 11, textAlign: 'center', marginTop: 8 }}>
        Enters the Play-In Tournament
      </div>

      {/* Trade modal */}
      {tradeTarget && (
        <TradeModal
          pos={tradeTarget}
          currentCard={roster.find(c => c.pos === tradeTarget) ?? roster[0]}
          coins={coins}
          isMobile={isMobile}
          onExecute={(target) => onExecuteTrade(tradeTarget, target)}
          onClose={onCloseTrade}
        />
      )}
    </div>
  );
}

// ─── Trade Modal ──────────────────────────────────────────────────────────────

function TradeModal({ pos, currentCard, coins, isMobile, onExecute, onClose }: {
  pos: Position;
  currentCard: Card;
  coins: number;
  isMobile: boolean;
  onExecute: (target: Card) => void;
  onClose: () => void;
}) {
  // Generate 4 trade candidates once on mount
  const [candidates] = useState<Card[]>(() => {
    const pool = PLAYERS.filter(p => p.pos === pos && p.name !== currentCard.name);
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 4);
  });

  const canAfford = coins >= TRADE_COST;
  const color = POS_COLORS[pos] ?? '#6B7280';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'flex-end',
        justifyContent: 'center',
        padding: isMobile ? 0 : '20px',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 500,
          background: '#fff',
          borderRadius: isMobile ? '20px 20px 0 0' : 20,
          padding: isMobile ? '22px 18px 32px' : '26px 24px',
          maxHeight: isMobile ? '85dvh' : 'calc(100dvh - 40px)',
          overflowY: 'auto',
        }}
      >
        {/* Handle */}
        {isMobile && (
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E5E7EB', margin: '0 auto 18px' }} />
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ color, fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', marginBottom: 2 }}>{pos} TRADE OPTIONS</div>
            <div style={{ color: '#111827', fontWeight: 800, fontSize: 17 }}>Replace {lastName(currentCard.name)}</div>
          </div>
          <div style={{ color: '#9CA3AF', fontSize: 11 }}>Each trade: {TRADE_COST} 🪙</div>
        </div>

        {/* Current player */}
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ color: '#DC2626', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em' }}>CURRENT</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ color: '#111827', fontWeight: 700, fontSize: 13 }}>{currentCard.name}</span>
            <span style={{ color: '#6B7280', fontSize: 11, marginLeft: 8 }}>{currentCard.team}</span>
          </div>
          <div style={{ color: TIER_COLORS[tierFor(currentCard.ovr)], fontWeight: 900, fontSize: 18 }}>{currentCard.ovr}</div>
        </div>

        {/* Candidates */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {candidates.map(c => {
            const tierColor = TIER_COLORS[tierFor(c.ovr)];
            const ovrDiff   = c.ovr - currentCard.ovr;
            return (
              <button
                key={c.name}
                onClick={() => onExecute(c)}
                disabled={!canAfford}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px',
                  background: canAfford ? '#F9FAFB' : '#F9FAFB',
                  border: `1.5px solid ${canAfford ? '#E5E7EB' : '#F3F4F6'}`,
                  borderRadius: 12, cursor: canAfford ? 'pointer' : 'not-allowed',
                  textAlign: 'left', width: '100%',
                  opacity: canAfford ? 1 : 0.5,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#111827', fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                  <div style={{ color: '#9CA3AF', fontSize: 11, marginTop: 1 }}>{c.team}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ color: tierColor, fontWeight: 900, fontSize: 20 }}>{c.ovr}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: ovrDiff > 0 ? '#16A34A' : ovrDiff < 0 ? '#DC2626' : '#9CA3AF' }}>
                    {ovrDiff > 0 ? `+${ovrDiff}` : ovrDiff < 0 ? `${ovrDiff}` : '='}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {!canAfford && (
          <div style={{ color: '#DC2626', fontSize: 12, fontWeight: 600, textAlign: 'center', marginTop: 12 }}>
            Not enough coins ({TRADE_COST} 🪙 required)
          </div>
        )}

        <button onClick={onClose} style={{
          marginTop: 14, width: '100%', padding: '11px 0',
          background: 'transparent', border: '1px solid #E5E7EB', borderRadius: 10,
          color: '#6B7280', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Roster Builder View ─────────────────────────────────────────────────────

const POSITIONS_ORDER: Position[] = ['PG', 'SG', 'SF', 'PF', 'C'];

function RosterBuilderView({ roster, budget, teams, userName, isMobile, onBuy, onRemove, onLock, onBack }: {
  roster: SeasonRosterPlayer[];
  budget: number;
  teams: SeasonTeam[];
  userName: string;
  isMobile: boolean;
  onBuy: (pos: Position, isStarter: boolean, card: Card) => void;
  onRemove: (pos: Position, isStarter: boolean) => void;
  onLock: () => void;
  onBack: () => void;
}) {
  const [shopPos, setShopPos] = useState<{ pos: Position; isStarter: boolean } | null>(null);
  const humanOvr = Math.max(
    Math.round(roster.filter(p => p.isStarter).reduce((s, p) => s + p.card.ovr + p.trainingBoost, 0) / Math.max(roster.filter(p => p.isStarter).length, 1)),
    75
  );
  const filledStarters = POSITIONS_ORDER.filter(pos => roster.some(p => p.isStarter && p.card.pos === pos));
  const filledBench    = POSITIONS_ORDER.filter(pos => roster.some(p => !p.isStarter && p.card.pos === pos));
  const canLock = filledStarters.length === 5 && filledBench.length === 5;

  function RosterSlot({ pos, isStarter }: { pos: Position; isStarter: boolean }) {
    const player = roster.find(p => p.card.pos === pos && p.isStarter === isStarter);
    const color = POS_COLORS[pos as keyof typeof POS_COLORS] ?? '#6B7280';
    if (player) {
      const tierColor = TIER_COLORS[tierFor(player.card.ovr)];
      return (
        <div style={{ background: '#F9FAFB', border: `2px solid ${tierColor}`, borderRadius: 10, padding: isMobile ? '8px 6px' : '10px 10px', textAlign: 'center', position: 'relative' }}>
          <div style={{ color, fontWeight: 800, fontSize: 10, letterSpacing: '0.04em', marginBottom: 2 }}>{pos}</div>
          <div style={{ color: '#111827', fontWeight: 700, fontSize: isMobile ? 9 : 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{lastName(player.card.name)}</div>
          <div style={{ color: tierColor, fontWeight: 900, fontSize: isMobile ? 14 : 16, lineHeight: 1 }}>{player.card.ovr}</div>
          <div style={{ color: '#9CA3AF', fontSize: 9, marginTop: 1 }}>🪙 {playerSeasonCost(player.card.ovr)}</div>
          <button onClick={() => onRemove(pos, isStarter)} style={{ position: 'absolute', top: 3, right: 3, background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', fontSize: 10, lineHeight: 1, padding: 0 }}>✕</button>
        </div>
      );
    }
    return (
      <button
        onClick={() => setShopPos({ pos, isStarter })}
        style={{ background: '#F3F4F6', border: '2px dashed #D1D5DB', borderRadius: 10, padding: isMobile ? '8px 6px' : '10px 10px', textAlign: 'center', cursor: 'pointer', width: '100%' }}
      >
        <div style={{ color, fontWeight: 800, fontSize: 10, letterSpacing: '0.04em', marginBottom: 4 }}>{pos}</div>
        <div style={{ color: '#9CA3AF', fontSize: 16 }}>+</div>
        <div style={{ color: '#9CA3AF', fontSize: 9, marginTop: 2 }}>Buy</div>
      </button>
    );
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: isMobile ? '20px 14px 80px' : '28px 24px 80px' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4 }}>ROSTER BUILDER</div>
        <div style={{ color: '#111827', fontWeight: 800, fontSize: isMobile ? 22 : 28, letterSpacing: '-0.02em', marginBottom: 6 }}>Build your squad</div>
        <div style={{ color: '#6B7280', fontSize: 13 }}>Buy 5 starters + 5 bench players. Spend wisely — this roster locks in when you start.</div>
      </div>

      {/* Budget */}
      <div style={{ ...card, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 2 }}>SEASON BUDGET</div>
          <div style={{ color: budget < 50 ? '#DC2626' : '#92400E', fontWeight: 900, fontSize: 24 }}>🪙 {budget}</div>
          <div style={{ color: '#9CA3AF', fontSize: 11, marginTop: 2 }}>remaining</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em' }}>TEAM OVR</div>
          <div style={{ color: '#7A3FF2', fontWeight: 900, fontSize: 24 }}>{humanOvr || '—'}</div>
          <div style={{ color: '#9CA3AF', fontSize: 11 }}>{filledStarters.length}/5 starters</div>
        </div>
      </div>

      {/* Starters grid */}
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={sectionLabel}>STARTING 5</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: isMobile ? 6 : 10 }}>
          {POSITIONS_ORDER.map(pos => <RosterSlot key={`s-${pos}`} pos={pos} isStarter={true} />)}
        </div>
      </div>

      {/* Bench grid */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={sectionLabel}>BENCH (5)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: isMobile ? 6 : 10 }}>
          {POSITIONS_ORDER.map(pos => <RosterSlot key={`b-${pos}`} pos={pos} isStarter={false} />)}
        </div>
      </div>

      {/* Pricing guide */}
      <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '10px 14px', marginBottom: 20, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {[84, 87, 90, 93, 96, 99].map(ovr => (
          <div key={ovr} style={{ textAlign: 'center' }}>
            <div style={{ color: TIER_COLORS[tierFor(ovr)], fontWeight: 800, fontSize: 12 }}>{ovr}</div>
            <div style={{ color: '#6B7280', fontSize: 10 }}>🪙{playerSeasonCost(ovr)}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={{ flex: 1, padding: '13px 0', background: 'transparent', border: '1.5px solid #E5E7EB', borderRadius: 12, color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>← Home</button>
        <button
          onClick={onLock}
          disabled={!canLock}
          style={{ flex: 3, padding: '13px 0', background: canLock ? '#16181D' : '#F3F4F6', border: 'none', borderRadius: 12, color: canLock ? '#fff' : '#9CA3AF', fontWeight: 800, fontSize: 14, letterSpacing: '0.04em', cursor: canLock ? 'pointer' : 'default' }}
        >
          {canLock ? 'Lock Roster & Start Season →' : `Fill all 10 slots (${filledStarters.length + filledBench.length}/10)`}
        </button>
      </div>

      {/* Player shop modal */}
      {shopPos && (
        <PlayerShopModal
          pos={shopPos.pos}
          isStarter={shopPos.isStarter}
          budget={budget}
          currentCard={roster.find(p => p.card.pos === shopPos.pos && p.isStarter === shopPos.isStarter)?.card ?? null}
          isMobile={isMobile}
          onBuy={(card) => { onBuy(shopPos.pos, shopPos.isStarter, card); setShopPos(null); }}
          onClose={() => setShopPos(null)}
        />
      )}
    </div>
  );
}

function PlayerShopModal({ pos, isStarter, budget, currentCard, isMobile, onBuy, onClose }: {
  pos: Position; isStarter: boolean; budget: number; currentCard: Card | null; isMobile: boolean;
  onBuy: (card: Card) => void; onClose: () => void;
}) {
  const players = PLAYERS.filter(p => p.pos === pos).sort((a, b) => a.ovr - b.ovr);
  const color = POS_COLORS[pos as keyof typeof POS_COLORS] ?? '#6B7280';
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: isMobile ? 0 : 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 500, background: '#fff', borderRadius: isMobile ? '20px 20px 0 0' : 20, padding: isMobile ? '22px 18px 32px' : '26px 24px', maxHeight: isMobile ? '85dvh' : 'calc(100dvh - 40px)', overflowY: 'auto' }}>
        {isMobile && <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E5E7EB', margin: '0 auto 18px' }} />}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ color, fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', marginBottom: 2 }}>{pos} — {isStarter ? 'STARTER' : 'BENCH'}</div>
            <div style={{ color: '#111827', fontWeight: 800, fontSize: 17 }}>Pick a player</div>
          </div>
          <div style={{ color: '#92400E', fontWeight: 700, fontSize: 13 }}>🪙 {budget} left</div>
        </div>
        {currentCard && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '8px 12px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#DC2626', fontSize: 10, fontWeight: 700 }}>CURRENT</span>
            <span style={{ flex: 1, color: '#111827', fontWeight: 700, fontSize: 13 }}>{currentCard.name}</span>
            <span style={{ color: TIER_COLORS[tierFor(currentCard.ovr)], fontWeight: 900 }}>{currentCard.ovr}</span>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {players.map(p => {
            const cost = playerSeasonCost(p.ovr);
            const canAfford = cost <= budget || (currentCard?.name === p.name ? true : cost <= budget + (currentCard ? playerSeasonCost(currentCard.ovr) : 0));
            const tierColor = TIER_COLORS[tierFor(p.ovr)];
            return (
              <button key={p.name} onClick={() => canAfford && onBuy(p)} disabled={!canAfford}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#F9FAFB', border: `1.5px solid ${canAfford ? '#E5E7EB' : '#F3F4F6'}`, borderRadius: 12, cursor: canAfford ? 'pointer' : 'not-allowed', textAlign: 'left', width: '100%', opacity: canAfford ? 1 : 0.5 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#111827', fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ color: '#9CA3AF', fontSize: 11, marginTop: 1 }}>{p.team}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ color: tierColor, fontWeight: 900, fontSize: 18 }}>{p.ovr}</div>
                  <div style={{ color: canAfford ? '#16A34A' : '#DC2626', fontSize: 11, fontWeight: 700 }}>🪙 {cost}</div>
                </div>
              </button>
            );
          })}
        </div>
        <button onClick={onClose} style={{ marginTop: 14, width: '100%', padding: '11px 0', background: 'transparent', border: '1px solid #E5E7EB', borderRadius: 10, color: '#6B7280', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Regular Season View ──────────────────────────────────────────────────────

function RegularSeasonView({ roster, teams, standings, schedule, gameIndex, trainingPoints, userName, isMobile, onNextGame, onSimWeek, onSimToDeadline, onSimRest, onSpendTraining }: {
  roster: SeasonRosterPlayer[];
  teams: SeasonTeam[];
  standings: { east: StandingsRow[]; west: StandingsRow[] } | null;
  schedule: GameSlot[];
  gameIndex: number;
  trainingPoints: number;
  userName: string;
  isMobile: boolean;
  onNextGame: () => void;
  onSimWeek: () => void;
  onSimToDeadline: () => void;
  onSimRest: () => void;
  onSpendTraining: (idx: number) => void;
}) {
  const [showTraining, setShowTraining] = useState(false);
  const totalGames = schedule.length;
  const tradeDeadline = Math.floor(totalGames / 2);
  const pastDeadline = gameIndex >= tradeDeadline;
  const pct = totalGames > 0 ? Math.round((gameIndex / totalGames) * 100) : 0;
  const humanTeam = teams.find(t => t.isHuman);
  const humanRow = standings
    ? (standings.east.find(r => r.isHuman) ?? standings.west.find(r => r.isHuman))
    : null;
  const humanSeed = humanRow
    ? ((standings!.east.findIndex(r => r.isHuman) + 1) || (standings!.west.findIndex(r => r.isHuman) + 1))
    : null;

  const nextSlot = gameIndex < schedule.length ? schedule[gameIndex] : null;
  const nextHome = nextSlot ? teams.find(t => t.slug === nextSlot.homeSlug) : null;
  const nextAway = nextSlot ? teams.find(t => t.slug === nextSlot.awaySlug) : null;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: isMobile ? '20px 14px 80px' : '28px 24px 80px' }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4 }}>REGULAR SEASON</div>
        <div style={{ color: '#111827', fontWeight: 800, fontSize: isMobile ? 22 : 28, letterSpacing: '-0.02em' }}>
          {gameIndex === 0 ? 'Opening Night' : gameIndex < totalGames ? `Game ${gameIndex} of ${totalGames}` : 'Season Complete'}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ color: '#374151', fontWeight: 700, fontSize: 13 }}>{pct}% complete</div>
          <div style={{ display: 'flex', gap: 12 }}>
            {humanRow && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 700 }}>YOUR RECORD</div>
                <div style={{ color: '#111827', fontWeight: 800, fontSize: 14 }}>{humanRow.wins}–{humanRow.losses}</div>
              </div>
            )}
            {humanSeed && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 700 }}>SEED</div>
                <div style={{
                  color: humanSeed <= 6 ? '#16A34A' : humanSeed <= 10 ? '#D97706' : '#DC2626',
                  fontWeight: 800, fontSize: 14,
                }}># {humanSeed}</div>
              </div>
            )}
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 700 }}>TRAINING PTS</div>
              <div style={{ color: '#7A3FF2', fontWeight: 800, fontSize: 14 }}>⚡ {trainingPoints}</div>
            </div>
          </div>
        </div>
        <div style={{ background: '#F3F4F6', borderRadius: 4, height: 8, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: '#7A3FF2', borderRadius: 4, transition: 'width 0.3s' }} />
        </div>
        {!pastDeadline && (
          <div style={{ color: '#9CA3AF', fontSize: 10, marginTop: 6 }}>
            Trade deadline at game {tradeDeadline}
          </div>
        )}
      </div>

      {/* Next game preview */}
      {nextSlot && nextHome && nextAway && (
        <div style={{ ...card, marginBottom: 14 }}>
          <div style={sectionLabel}>NEXT GAME</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ color: nextHome.isHuman ? '#7A3FF2' : '#111827', fontWeight: nextHome.isHuman ? 800 : 600, fontSize: isMobile ? 14 : 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {nextHome.name}{nextHome.isHuman ? ' ★' : ''}
              </div>
              <div style={{ color: '#9CA3AF', fontSize: 11 }}>HOME · OVR {nextHome.ovr}</div>
            </div>
            <div style={{ color: '#D1D5DB', fontWeight: 700, fontSize: 18 }}>VS</div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ color: nextAway.isHuman ? '#7A3FF2' : '#111827', fontWeight: nextAway.isHuman ? 800 : 600, fontSize: isMobile ? 14 : 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {nextAway.name}{nextAway.isHuman ? ' ★' : ''}
              </div>
              <div style={{ color: '#9CA3AF', fontSize: 11 }}>AWAY · OVR {nextAway.ovr}</div>
            </div>
          </div>
        </div>
      )}

      {/* Sim controls */}
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={sectionLabel}>SIM CONTROLS</div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 8 }}>
          {[
            { label: 'Next Game', action: onNextGame, primary: true },
            { label: 'Sim Week', action: onSimWeek, primary: false },
            { label: pastDeadline ? 'Full Season' : 'To Trade Deadline', action: pastDeadline ? onSimRest : onSimToDeadline, primary: false },
            { label: 'Sim All Remaining', action: onSimRest, primary: false },
          ].map(btn => (
            <button key={btn.label} onClick={btn.action} style={{ padding: '10px 8px', background: btn.primary ? '#16181D' : '#F9FAFB', border: `1px solid ${btn.primary ? 'transparent' : '#E5E7EB'}`, borderRadius: 10, color: btn.primary ? '#fff' : '#374151', fontWeight: 700, fontSize: isMobile ? 11 : 12, cursor: 'pointer', textAlign: 'center' }}>
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Training button */}
      {trainingPoints > 0 && (
        <button onClick={() => setShowTraining(true)} style={{ ...card, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, cursor: 'pointer', background: '#F5F3FF', border: '1.5px solid #C4B5FD' }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ color: '#7A3FF2', fontWeight: 800, fontSize: 14 }}>⚡ Train Your Players</div>
            <div style={{ color: '#9CA3AF', fontSize: 12, marginTop: 2 }}>+1 OVR per point, max +5 per player per season</div>
          </div>
          <div style={{ background: '#7A3FF2', color: '#fff', borderRadius: 20, padding: '3px 10px', fontWeight: 800, fontSize: 12 }}>
            {trainingPoints} pts
          </div>
        </button>
      )}

      {/* Compact standings */}
      {standings && (
        <div style={{ ...card, marginBottom: 14 }}>
          <div style={sectionLabel}>STANDINGS SNAPSHOT — {humanRow?.conference.toUpperCase() ?? 'YOUR CONFERENCE'}</div>
          {(humanRow?.conference === 'East' ? standings.east : standings.west).slice(0, 10).map((row, i) => (
            <div key={row.slug} style={{ display: 'flex', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #F9FAFB', background: row.isHuman ? '#F5F3FF' : undefined, borderLeft: row.isHuman ? '2px solid #7A3FF2' : undefined, paddingLeft: row.isHuman ? 6 : 0 }}>
              <span style={{ color: i < 6 ? '#16A34A' : i < 10 ? '#D97706' : '#9CA3AF', fontSize: 10, fontWeight: 800, width: 18 }}>{i + 1}</span>
              <span style={{ flex: 1, color: row.isHuman ? '#7A3FF2' : '#374151', fontWeight: row.isHuman ? 800 : 600, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {row.name}{row.isHuman ? ' ★' : ''}
              </span>
              <span style={{ color: '#6B7280', fontSize: 11, minWidth: 40, textAlign: 'right' }}>{row.wins}–{row.losses}</span>
            </div>
          ))}
        </div>
      )}

      {/* Training modal */}
      {showTraining && (
        <TrainingModal
          roster={roster}
          trainingPoints={trainingPoints}
          isMobile={isMobile}
          onSpend={onSpendTraining}
          onClose={() => setShowTraining(false)}
        />
      )}
    </div>
  );
}

function TrainingModal({ roster, trainingPoints, isMobile, onSpend, onClose }: {
  roster: SeasonRosterPlayer[]; trainingPoints: number; isMobile: boolean;
  onSpend: (idx: number) => void; onClose: () => void;
}) {
  const allPlayers = [...roster].sort((a, b) => (a.isStarter ? 0 : 1) - (b.isStarter ? 0 : 1));
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: isMobile ? 0 : 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 500, background: '#fff', borderRadius: isMobile ? '20px 20px 0 0' : 20, padding: isMobile ? '22px 18px 32px' : '26px 24px', maxHeight: isMobile ? '85dvh' : 'calc(100dvh - 40px)', overflowY: 'auto' }}>
        {isMobile && <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E5E7EB', margin: '0 auto 18px' }} />}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ color: '#7A3FF2', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', marginBottom: 2 }}>TRAINING ROOM</div>
            <div style={{ color: '#111827', fontWeight: 800, fontSize: 17 }}>Boost a player</div>
          </div>
          <div style={{ color: '#7A3FF2', fontWeight: 800, fontSize: 14 }}>⚡ {trainingPoints} pts</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {allPlayers.map((player, idx) => {
            const realIdx = roster.indexOf(player);
            const capped = player.trainingBoost >= 5;
            const tierColor = TIER_COLORS[tierFor(player.card.ovr + player.trainingBoost)];
            const color = POS_COLORS[player.card.pos as keyof typeof POS_COLORS] ?? '#6B7280';
            return (
              <div key={realIdx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB' }}>
                <div style={{ color, fontWeight: 800, fontSize: 10, minWidth: 24 }}>{player.card.pos}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#111827', fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.card.name}</div>
                  <div style={{ color: '#9CA3AF', fontSize: 10 }}>{player.isStarter ? 'Starter' : 'Bench'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: tierColor, fontWeight: 900, fontSize: 16 }}>{player.card.ovr + player.trainingBoost}</div>
                    {player.trainingBoost > 0 && (
                      <div style={{ color: '#16A34A', fontSize: 9, fontWeight: 700 }}>+{player.trainingBoost}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {[0,1,2,3,4].map(i => (
                      <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i < player.trainingBoost ? '#7A3FF2' : '#E5E7EB' }} />
                    ))}
                  </div>
                  <button
                    onClick={() => trainingPoints > 0 && !capped && onSpend(realIdx)}
                    disabled={trainingPoints <= 0 || capped}
                    style={{ background: !capped && trainingPoints > 0 ? '#7A3FF2' : '#F3F4F6', border: 'none', borderRadius: 6, padding: '4px 8px', color: !capped && trainingPoints > 0 ? '#fff' : '#9CA3AF', fontSize: 10, fontWeight: 700, cursor: !capped && trainingPoints > 0 ? 'pointer' : 'default' }}
                  >
                    {capped ? 'MAX' : '+1 OVR'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={onClose} style={{ marginTop: 14, width: '100%', padding: '11px 0', background: 'transparent', border: '1px solid #E5E7EB', borderRadius: 10, color: '#6B7280', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Done</button>
      </div>
    </div>
  );
}

// ─── Season Complete View ─────────────────────────────────────────────────────

function SeasonCompleteView({ teams, roster, playoffBracket, userName, isMobile, onFinish }: {
  teams: SeasonTeam[];
  roster: SeasonRosterPlayer[];
  playoffBracket: PlayoffBracket | null;
  userName: string;
  isMobile: boolean;
  onFinish: () => void;
}) {
  const humanWon = !!playoffBracket?.champion?.isHuman;
  const champion = playoffBracket?.champion;
  const humanTeam = teams.find(t => t.isHuman);
  const starters = roster.filter(p => p.isStarter);

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: isMobile ? '40px 16px 80px' : '60px 24px 80px', textAlign: 'center' }}>
      <div style={{ fontSize: 56, marginBottom: 12 }}>{humanWon ? '🏆' : '🏀'}</div>
      <div style={{ color: '#111827', fontWeight: 900, fontSize: isMobile ? 26 : 34, letterSpacing: '-0.02em', marginBottom: 8 }}>
        {humanWon ? `${userName} are NBA Champions!` : 'Season Complete'}
      </div>
      <div style={{ color: '#6B7280', fontSize: 14, marginBottom: 28 }}>
        {humanWon
          ? `Your squad went all the way. +250 coins · +1 title earned.`
          : champion
            ? `${champion.name} won the championship this season.`
            : 'Thanks for playing — a new season awaits.'}
      </div>

      {humanTeam && (
        <div style={{ background: '#F9FAFB', borderRadius: 14, padding: '18px 20px', marginBottom: 20, textAlign: 'left' }}>
          <div style={sectionLabel}>YOUR FINAL RECORD</div>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
            {[
              { label: 'W', value: humanTeam.wins },
              { label: 'L', value: humanTeam.losses },
              { label: 'OVR', value: Math.round(starters.reduce((s, p) => s + p.card.ovr + p.trainingBoost, 0) / Math.max(starters.length, 1)) },
            ].map(stat => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em' }}>{stat.label}</div>
                <div style={{ color: '#111827', fontWeight: 900, fontSize: 28, lineHeight: 1 }}>{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={onFinish} style={{ padding: '16px 40px', background: '#16181D', border: 'none', borderRadius: 14, color: '#fff', fontWeight: 900, fontSize: 15, letterSpacing: '0.04em', cursor: 'pointer' }}>
        Back to Home
      </button>
    </div>
  );
}

// ─── Play-In View ─────────────────────────────────────────────────────────────

function PlayInView({
  bracket, seasonTeams, seasonStandings, playInSeeds, userName,
  isMobile, onSim, onAdvance, onBack,
}: {
  bracket: PlayInBracket;
  seasonTeams: SeasonTeam[];
  seasonStandings: { east: StandingsRow[]; west: StandingsRow[] } | null;
  playInSeeds: { east: SeasonTeam[]; west: SeasonTeam[] } | null;
  userName: string;
  isMobile: boolean;
  onSim: () => void;
  onAdvance: () => void;
  onBack: () => void;
}) {
  const simmed = bracket.east.seed7 !== null;

  // Find human in standings to determine status
  const humanRow = seasonStandings
    ? (seasonStandings.east.find(r => r.isHuman) ?? seasonStandings.west.find(r => r.isHuman))
    : null;
  const humanSeed = humanRow
    ? ((seasonStandings!.east.findIndex(r => r.isHuman) + 1) || (seasonStandings!.west.findIndex(r => r.isHuman) + 1))
    : 16;
  const humanStatus: 'clinched' | 'play_in' | 'eliminated' =
    humanSeed <= 6 ? 'clinched' : humanSeed <= 10 ? 'play_in' : 'eliminated';

  // After sim: find human team in play-in results
  const humanTeam = seasonTeams.find(t => t.isHuman);
  const humanInSeeds = simmed && playInSeeds
    ? [...playInSeeds.east, ...playInSeeds.west].some(t => t.isHuman)
    : false;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: isMobile ? '20px 14px 80px' : '28px 24px 80px' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4 }}>
          PLAY-IN TOURNAMENT
        </div>
        <div style={{ color: '#111827', fontWeight: 800, fontSize: isMobile ? 22 : 28, letterSpacing: '-0.02em', marginBottom: 6 }}>
          Seeds 7–10 Battle for Playoffs
        </div>
        <div style={{ color: '#6B7280', fontSize: 13, lineHeight: 1.5 }}>
          Seeds 7 &amp; 8 play — winner clinches. Loser plays winner of 9v10. Two spots remain.
        </div>
      </div>

      {/* Human status banner */}
      {humanStatus === 'clinched' && (
        <div style={{
          background: 'linear-gradient(135deg, #16A34A, #15803D)',
          borderRadius: 14, padding: '16px 20px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <span style={{ fontSize: 28 }}>✅</span>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>You&apos;re already in the Playoffs!</div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 }}>
              Seed #{humanSeed} — You clinched a top-6 spot. Sim the play-in to set the bracket.
            </div>
          </div>
        </div>
      )}
      {humanStatus === 'play_in' && !simmed && (
        <div style={{
          background: 'linear-gradient(135deg, #D97706, #B45309)',
          borderRadius: 14, padding: '16px 20px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <span style={{ fontSize: 28 }}>⚡</span>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>You&apos;re in the Play-In!</div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 }}>
              Seed #{humanSeed} — Sim the tournament to see if you advance.
            </div>
          </div>
        </div>
      )}
      {humanStatus === 'eliminated' && (
        <div style={{
          background: '#F9FAFB', border: '1px solid #E5E7EB',
          borderRadius: 14, padding: '16px 20px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <span style={{ fontSize: 28 }}>❌</span>
          <div>
            <div style={{ color: '#374151', fontWeight: 800, fontSize: 16 }}>Eliminated from Play-In</div>
            <div style={{ color: '#6B7280', fontSize: 12, marginTop: 2 }}>
              Seed #{humanSeed} — You missed the play-in. Sim to complete the bracket.
            </div>
          </div>
        </div>
      )}

      {/* Brackets */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 20 }}>
        <PlayInConfCard conf={bracket.east} confName="Eastern Conference" userName={userName} isMobile={isMobile} />
        <PlayInConfCard conf={bracket.west} confName="Western Conference" userName={userName} isMobile={isMobile} />
      </div>

      {/* Post-sim result for human in play-in */}
      {simmed && humanStatus === 'play_in' && (
        <div style={{
          background: humanInSeeds ? '#F0FDF4' : '#FEF2F2',
          border: `1px solid ${humanInSeeds ? '#86EFAC' : '#FECACA'}`,
          borderRadius: 14, padding: '16px 20px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <span style={{ fontSize: 28 }}>{humanInSeeds ? '🎉' : '💔'}</span>
          <div>
            <div style={{ color: '#111827', fontWeight: 800, fontSize: 16 }}>
              {humanInSeeds ? `${userName} advanced to the Playoffs!` : `${userName} was eliminated in the Play-In.`}
            </div>
            <div style={{ color: '#6B7280', fontSize: 12, marginTop: 2 }}>
              {humanInSeeds
                ? 'Your team earned a playoff seed. Time to compete for the title!'
                : 'Better luck next season. You can still watch the playoffs unfold.'}
            </div>
          </div>
        </div>
      )}

      {/* Playoff seeds preview after sim */}
      {simmed && playInSeeds && (
        <div style={{ ...card, marginBottom: 20 }}>
          <div style={sectionLabel}>PLAYOFF FIELD</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {(['east', 'west'] as const).map(conf => (
              <div key={conf}>
                <div style={{ color: '#374151', fontWeight: 700, fontSize: 12, marginBottom: 8 }}>
                  {conf === 'east' ? 'Eastern' : 'Western'} Conference
                </div>
                {playInSeeds[conf].map((team, i) => (
                  <div key={team.slug} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '5px 8px',
                    background: team.isHuman ? '#F5F3FF' : i < 6 ? '#F0FDF4' : '#FFFBEB',
                    borderRadius: 8, marginBottom: 4,
                    border: team.isHuman ? '1.5px solid #7A3FF2' : '1.5px solid transparent',
                  }}>
                    <span style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 800, minWidth: 16 }}>{i + 1}</span>
                    <span style={{
                      color: team.isHuman ? '#7A3FF2' : '#111827',
                      fontWeight: team.isHuman ? 800 : 600, fontSize: isMobile ? 11 : 12,
                      flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {team.name}{team.isHuman ? ' ★' : ''}
                    </span>
                    <span style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 700 }}>{team.ovr}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={onBack} style={{
          flex: 1, minWidth: 100, padding: '13px 0',
          background: 'transparent', border: '1.5px solid #E5E7EB', borderRadius: 12,
          color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
          ← Home
        </button>
        {!simmed ? (
          <button onClick={onSim} style={{
            flex: 3, minWidth: 200, padding: '13px 0',
            background: '#16181D', border: 'none', borderRadius: 12,
            color: '#fff', fontWeight: 800, fontSize: 14,
            letterSpacing: '0.04em', cursor: 'pointer',
          }}>
            Simulate Play-In Tournament →
          </button>
        ) : (
          <button onClick={onAdvance} style={{
            flex: 3, minWidth: 200, padding: '13px 0',
            background: humanInSeeds || humanStatus === 'clinched'
              ? 'linear-gradient(135deg, #7A3FF2, #4C1D95)'
              : '#16181D',
            border: 'none', borderRadius: 12,
            color: '#fff', fontWeight: 800, fontSize: 14,
            letterSpacing: '0.04em', cursor: 'pointer',
          }}>
            {humanInSeeds || humanStatus === 'clinched' ? 'Enter Playoffs →' : 'Watch the Playoffs →'}
          </button>
        )}
      </div>
    </div>
  );
}

function PlayInConfCard({ conf, confName, userName, isMobile }: {
  conf: PlayInConf;
  confName: string;
  userName: string;
  isMobile: boolean;
}) {
  const simmed = conf.seed7 !== null;

  function TeamChip({ team, isWinner = false }: { team: SeasonTeam | null; isWinner?: boolean }) {
    if (!team) return <span style={{ color: '#9CA3AF', fontSize: 11 }}>TBD</span>;
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        color: team.isHuman ? '#7A3FF2' : isWinner ? '#16A34A' : '#374151',
        fontWeight: team.isHuman ? 800 : isWinner ? 700 : 600,
        fontSize: isMobile ? 11 : 12,
      }}>
        {team.name}{team.isHuman ? ' ★' : ''}
      </span>
    );
  }

  function GameRow({ label, teamA, teamB, winner, note }: {
    label: string;
    teamA: SeasonTeam | null;
    teamB: SeasonTeam | null;
    winner: SeasonTeam | null;
    note: string;
  }) {
    return (
      <div style={{
        background: '#F9FAFB', borderRadius: 10,
        padding: '10px 12px', marginBottom: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ color: '#9CA3AF', fontSize: 9, fontWeight: 700, letterSpacing: '0.06em' }}>{label}</span>
          <span style={{ color: '#9CA3AF', fontSize: 9 }}>{note}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <TeamChip team={teamA} isWinner={!!winner && winner.slug === teamA?.slug} />
          <span style={{ color: '#D1D5DB', fontSize: 10 }}>vs</span>
          <TeamChip team={teamB} isWinner={!!winner && winner.slug === teamB?.slug} />
          {winner && (
            <span style={{ marginLeft: 'auto', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 6, padding: '2px 6px', color: '#16A34A', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
              W: {winner.name}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid #F3F4F6' }}>
        <span style={{ color: '#111827', fontWeight: 800, fontSize: 13 }}>{confName}</span>
        {simmed && (
          <span style={{ marginLeft: 8, background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 20, padding: '2px 8px', color: '#16A34A', fontSize: 9, fontWeight: 700 }}>
            COMPLETE
          </span>
        )}
      </div>
      <div style={{ padding: '12px 12px' }}>
        <GameRow
          label="GAME 1 — 7 VS 8"
          teamA={conf.game1.a}
          teamB={conf.game1.b}
          winner={conf.game1.winner}
          note="Winner → #7 seed"
        />
        <GameRow
          label="GAME 2 — 9 VS 10"
          teamA={conf.game2.a}
          teamB={conf.game2.b}
          winner={conf.game2.winner}
          note="Loser eliminated"
        />
        <GameRow
          label="GAME 3 — SURVIVOR"
          teamA={conf.game3.a}
          teamB={conf.game3.b}
          winner={conf.game3.winner}
          note="Winner → #8 seed"
        />
        {simmed && (
          <div style={{ background: '#F5F3FF', border: '1px solid #C4B5FD', borderRadius: 10, padding: '10px 12px', marginTop: 4 }}>
            <div style={{ color: '#7A3FF2', fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 6 }}>PLAYOFF SEEDS</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {[{ seed: 7, team: conf.seed7 }, { seed: 8, team: conf.seed8 }].map(({ seed, team }) => (
                <div key={seed} style={{ flex: 1, background: '#fff', borderRadius: 8, padding: '6px 8px', border: '1px solid #E5E7EB' }}>
                  <div style={{ color: '#9CA3AF', fontSize: 9, fontWeight: 700, marginBottom: 2 }}>SEED {seed}</div>
                  <div style={{ color: team?.isHuman ? '#7A3FF2' : '#111827', fontWeight: team?.isHuman ? 800 : 700, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {team?.name ?? 'TBD'}{team?.isHuman ? ' ★' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Playoffs View ────────────────────────────────────────────────────────────

const PLAYOFF_STAGE_NAMES = ['Quarterfinals', 'Semifinals', 'Conference Finals'];

type HumanFate =
  | { status: 'champion' }
  | { status: 'in_finals' }
  | { status: 'advancing'; stage: string }
  | { status: 'eliminated'; stage: string; opponent: string }
  | { status: 'not_qualified' };

function getHumanFate(bracket: PlayoffBracket): HumanFate {
  if (bracket.champion?.isHuman) return { status: 'champion' };

  if (bracket.finals) {
    const { teamA, teamB, winner } = bracket.finals;
    if (teamA.isHuman || teamB.isHuman) {
      if (winner && !winner.isHuman) {
        const opponent = teamA.isHuman ? teamB : teamA;
        return { status: 'eliminated', stage: 'the NBA Finals', opponent: opponent.name };
      }
      return { status: 'in_finals' };
    }
  }

  for (const rounds of [bracket.eastRounds, bracket.westRounds]) {
    for (let i = rounds.length - 1; i >= 0; i--) {
      const series = rounds[i].matchups.find(m => m.teamA.isHuman || m.teamB.isHuman);
      if (series) {
        if (series.winner?.isHuman) {
          return { status: 'advancing', stage: i < 2 ? PLAYOFF_STAGE_NAMES[i + 1] : 'the NBA Finals' };
        }
        if (series.winner && !series.winner.isHuman) {
          const opponent = series.teamA.isHuman ? series.teamB : series.teamA;
          return { status: 'eliminated', stage: PLAYOFF_STAGE_NAMES[i], opponent: opponent.name };
        }
        return { status: 'advancing', stage: PLAYOFF_STAGE_NAMES[i] };
      }
    }
  }
  return { status: 'not_qualified' };
}

function nextRoundButtonLabel(bracket: PlayoffBracket): string {
  const eastLast = bracket.eastRounds[bracket.eastRounds.length - 1];
  const resolved = eastLast.matchups.every(m => m.winner);
  if (!resolved) return `Simulate ${PLAYOFF_STAGE_NAMES[bracket.eastRounds.length - 1]} →`;
  if (bracket.eastRounds.length < 3) return `Simulate ${PLAYOFF_STAGE_NAMES[bracket.eastRounds.length]} →`;
  return 'Simulate The Finals →';
}

function PlayoffsView({ bracket, userName, isMobile, onSimRound, onBack }: {
  bracket: PlayoffBracket;
  userName: string;
  isMobile: boolean;
  onSimRound: () => void;
  onBack: () => void;
}) {
  const fate = getHumanFate(bracket);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: isMobile ? '20px 14px 80px' : '28px 24px 80px' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4 }}>
          NBA PLAYOFFS
        </div>
        <div style={{ color: '#111827', fontWeight: 800, fontSize: isMobile ? 22 : 28, letterSpacing: '-0.02em' }}>
          {bracket.champion ? 'A Champion Is Crowned' : 'Road to the Championship'}
        </div>
      </div>

      {/* Human fate banner */}
      {fate.status === 'eliminated' && (
        <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 14, padding: '14px 18px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>💔</span>
          <div>
            <div style={{ color: '#374151', fontWeight: 800, fontSize: 14 }}>Eliminated in {fate.stage}</div>
            <div style={{ color: '#6B7280', fontSize: 12, marginTop: 2 }}>Lost to {fate.opponent}.</div>
          </div>
        </div>
      )}
      {(fate.status === 'advancing' || fate.status === 'in_finals') && (
        <div style={{ background: '#F5F3FF', border: '1px solid #C4B5FD', borderRadius: 14, padding: '14px 18px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>🔥</span>
          <div>
            <div style={{ color: '#7A3FF2', fontWeight: 800, fontSize: 14 }}>Still alive!</div>
            <div style={{ color: '#6B7280', fontSize: 12, marginTop: 2 }}>
              {fate.status === 'in_finals' ? 'Battling for the championship in the NBA Finals.' : `Next up: ${fate.stage}.`}
            </div>
          </div>
        </div>
      )}

      {/* Conference brackets */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 20 }}>
        <ConferenceBracket title="Eastern Conference" rounds={bracket.eastRounds} />
        <ConferenceBracket title="Western Conference" rounds={bracket.westRounds} />
      </div>

      {/* Finals */}
      {bracket.finals && <FinalsCard finals={bracket.finals} />}

      {/* Champion banner */}
      {bracket.champion && (
        <div style={{
          background: bracket.champion.isHuman ? 'linear-gradient(135deg, #F59E0B, #D97706)' : '#F9FAFB',
          border: bracket.champion.isHuman ? 'none' : '1px solid #E5E7EB',
          borderRadius: 14, padding: '20px', marginBottom: 20, textAlign: 'center',
        }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>{bracket.champion.isHuman ? '🏆' : '🏀'}</div>
          <div style={{ color: bracket.champion.isHuman ? '#fff' : '#111827', fontWeight: 900, fontSize: isMobile ? 18 : 22 }}>
            {bracket.champion.isHuman ? `${userName} are NBA Champions!` : `${bracket.champion.name} win the championship`}
          </div>
          {bracket.champion.isHuman && (
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 6, fontWeight: 600 }}>
              +250 coins · +1 title earned
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={onBack} style={{
          flex: 1, minWidth: 100, padding: '13px 0',
          background: 'transparent', border: '1.5px solid #E5E7EB', borderRadius: 12,
          color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
          ← Home
        </button>
        {!bracket.champion && (
          <button onClick={onSimRound} style={{
            flex: 3, minWidth: 200, padding: '13px 0',
            background: '#16181D', border: 'none', borderRadius: 12,
            color: '#fff', fontWeight: 800, fontSize: 14,
            letterSpacing: '0.04em', cursor: 'pointer',
          }}>
            {nextRoundButtonLabel(bracket)}
          </button>
        )}
      </div>
    </div>
  );
}

function ConferenceBracket({ title, rounds }: { title: string; rounds: PlayoffRound[] }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', padding: '14px' }}>
      <div style={{ color: '#111827', fontWeight: 800, fontSize: 13, marginBottom: 10 }}>{title}</div>
      {rounds.map((round, i) => (
        <div key={i} style={{ marginBottom: 14 }}>
          <div style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 6 }}>
            {PLAYOFF_STAGE_NAMES[i].toUpperCase()}
          </div>
          {round.matchups.map((series, j) => (
            <SeriesCard key={j} series={series} />
          ))}
        </div>
      ))}
    </div>
  );
}

function SeriesCard({ series }: { series: SeriesState }) {
  const { teamA, teamB, winsA, winsB, winner } = series;
  return (
    <div style={{
      background: '#F9FAFB', borderRadius: 10, padding: '8px 12px', marginBottom: 8,
      border: winner ? '1px solid #E5E7EB' : '1px dashed #E5E7EB',
    }}>
      <SeriesTeamRow team={teamA} score={winsA} isWinner={!!winner && winner.slug === teamA.slug} />
      <SeriesTeamRow team={teamB} score={winsB} isWinner={!!winner && winner.slug === teamB.slug} />
      {winner && (
        <div style={{ marginTop: 4, color: '#16A34A', fontSize: 10, fontWeight: 700 }}>
          {winner.name} win series {Math.max(winsA, winsB)}–{Math.min(winsA, winsB)}
        </div>
      )}
    </div>
  );
}

function SeriesTeamRow({ team, score, isWinner }: { team: SeasonTeam; score: number; isWinner: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
      <span style={{
        flex: 1, color: team.isHuman ? '#7A3FF2' : isWinner ? '#16A34A' : '#374151',
        fontWeight: team.isHuman ? 800 : isWinner ? 700 : 600, fontSize: 12,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {team.name}{team.isHuman ? ' ★' : ''}
      </span>
      <span style={{ color: isWinner ? '#16A34A' : '#9CA3AF', fontWeight: 800, fontSize: 13 }}>{score}</span>
    </div>
  );
}

function FinalsCard({ finals }: { finals: SeriesState }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #1F2937, #111827)',
      borderRadius: 16, padding: '20px', marginBottom: 20,
    }}>
      <div style={{ color: '#FBBF24', fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', marginBottom: 14, textAlign: 'center' }}>
        🏆 NBA FINALS
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
        {[
          { team: finals.teamA, score: finals.winsA },
          { team: finals.teamB, score: finals.winsB },
        ].map(({ team, score }) => {
          const isWinner = !!finals.winner && finals.winner.slug === team.slug;
          return (
            <div key={team.slug} style={{ textAlign: 'center' }}>
              <div style={{ color: team.isHuman ? '#A78BFA' : '#fff', fontWeight: 800, fontSize: 14, marginBottom: 4 }}>
                {team.name}{team.isHuman ? ' ★' : ''}
              </div>
              <div style={{ color: isWinner ? '#FBBF24' : 'rgba(255,255,255,0.5)', fontWeight: 900, fontSize: 30, lineHeight: 1 }}>{score}</div>
            </div>
          );
        })}
      </div>
      {finals.winner && (
        <div style={{ textAlign: 'center', marginTop: 14, color: '#FBBF24', fontWeight: 700, fontSize: 13 }}>
          {finals.winner.name} win the championship {Math.max(finals.winsA, finals.winsB)}–{Math.min(finals.winsA, finals.winsB)}!
        </div>
      )}
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
