'use client';

import { useRef, useEffect, useState } from 'react';
import type { Bracket, Match, Team } from '@/lib/types';

// ─── Layout constants (natural / unscaled) ────────────────────────────────────
const UNIT    = 44;
const CARD_H  = 72;
const CARD_W  = 200;
const COL_GAP = 36;
const COL_H   = 8 * UNIT;   // 352 px – enough for 8 team rows
const HEADER_H = 28;        // column label height

const QF_TOPS = [0, 2, 4, 6].map(r => r * UNIT);
const SF_TOPS = [1, 5].map(r => r * UNIT);
const CF_TOP  = 3 * UNIT;
const FIN_TOP = (COL_H - CARD_H) / 2;

// Total natural width of the full bracket layout
// label + QF + gap + SF + gap + CF + gap + Finals(+20) + gap + WCF + gap + WSF + gap + WQF + label
const NATURAL_W =
  20 + CARD_W + COL_GAP + CARD_W + COL_GAP + CARD_W + COL_GAP +
  (CARD_W + 20) +
  COL_GAP + CARD_W + COL_GAP + CARD_W + COL_GAP + CARD_W + 20; // 1676

const NATURAL_H = HEADER_H + COL_H; // 380

// ─── Match card ───────────────────────────────────────────────────────────────
function MatchCard({ match, highlight }: { match: Match; highlight?: boolean }) {
  return (
    <div style={{
      width: CARD_W, height: CARD_H,
      background: '#FFFFFF',
      border: `1.5px solid ${highlight ? '#7A3FF2' : '#E5E7EB'}`,
      borderRadius: 10, overflow: 'hidden',
      boxShadow: highlight ? '0 0 0 3px #EDE9FE' : '0 1px 3px rgba(0,0,0,0.05)',
    }}>
      {(['a', 'b'] as const).map((side, i) => {
        const r = teamRow(side === 'a' ? match.a : match.b, match, side);
        return (
          <div key={side} style={{
            display: 'flex', alignItems: 'center',
            height: CARD_H / 2, padding: '0 10px', gap: 6,
            background: r.isWinner ? '#F5F3FF' : 'transparent',
            borderBottom: i === 0 ? '1px solid #F3F4F6' : 'none',
          }}>
            {r.isHuman
              ? <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#7A3FF2', flexShrink: 0 }} />
              : <div style={{ width: 6, flexShrink: 0 }} />
            }
            <div style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 700, flexShrink: 0, width: 14 }}>
              {r.seed}
            </div>
            <div style={{
              flex: 1,
              color: r.isWinner ? '#4C1D95' : r.tbd ? '#D1D5DB' : '#374151',
              fontWeight: r.isWinner ? 700 : 500, fontSize: 12,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {r.name}
            </div>
            {r.score !== '' && (
              <div style={{ color: r.isWinner ? '#7A3FF2' : '#9CA3AF', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                {r.score}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function teamRow(team: Team | null, match: Match, side: 'a' | 'b') {
  if (!team) return { isHuman: false, seed: '', name: 'TBD', score: '', isWinner: false, tbd: true };
  const win   = !!match.result && match.result.winner.name === team.name;
  const score = match.result ? (side === 'a' ? match.result.sa : match.result.sb) : '';
  return { isHuman: !!team.isHuman, seed: team.seed ?? '', name: team.name, score, isWinner: win, tbd: false };
}

// ─── Connector SVG ────────────────────────────────────────────────────────────
function Connectors({ fromTops, toTops }: { fromTops: number[]; toTops: number[] }) {
  const W = COL_GAP, H = COL_H;
  const cy  = (top: number) => top + CARD_H / 2;
  const paths: string[] = [];
  for (let i = 0; i < toTops.length; i++) {
    const lo  = fromTops[i * 2];
    const hi  = fromTops[i * 2 + 1];
    const to  = toTops[i];
    const midY = (cy(lo) + cy(hi)) / 2;
    const mx   = W / 2;
    paths.push(`M ${W * 0.05} ${cy(lo)} H ${mx}`);
    paths.push(`M ${W * 0.05} ${cy(hi)} H ${mx}`);
    paths.push(`M ${mx} ${cy(lo)} V ${cy(hi)}`);
    paths.push(`M ${mx} ${midY} H ${W * 0.95}`);
    void to;
  }
  return (
    <svg style={{ display: 'block' }} width={W} height={H} viewBox={`0 0 ${W} ${H}`} overflow="visible">
      {paths.map((d, i) => <path key={i} d={d} stroke="#D1D5DB" strokeWidth="1.5" fill="none" />)}
    </svg>
  );
}

// ─── Column of match cards ────────────────────────────────────────────────────
function Column({ matches, tops, label }: { matches: Match[]; tops: number[]; label?: string }) {
  return (
    <div>
      {label && (
        <div style={{
          color: '#9CA3AF', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
          textAlign: 'center', marginBottom: 8, whiteSpace: 'nowrap', height: HEADER_H - 8,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}>
          {label}
        </div>
      )}
      <div style={{ position: 'relative', width: CARD_W, height: COL_H }}>
        {matches.map((m, i) => (
          <div key={i} style={{ position: 'absolute', top: tops[i], left: 0 }}>
            <MatchCard match={m} highlight={!!(m.a?.isHuman || m.b?.isHuman)} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Full bracket, auto-scaled to fill container width ───────────────────────
export default function BracketTree({ bracket }: { bracket: Bracket }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    // min 0.45 so the bracket stays readable on mobile (parent can scroll-x)
    const update = () => setScale(Math.max(0.45, Math.min(1, el.clientWidth / NATURAL_W)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const eQF = bracket.east.qf;
  const eSF = bracket.east.sf;
  const eCF = bracket.east.cf;
  const wQF = bracket.west.qf;
  const wSF = bracket.west.sf;
  const wCF = bracket.west.cf;

  const connPad = { marginTop: HEADER_H };

  return (
    // wrapRef measures available width to compute scale
    <div ref={wrapRef} style={{ width: '100%' }}>
      {/* middle div has the VISUAL dimensions — parent overflow:auto lets it scroll on mobile */}
      <div style={{ width: NATURAL_W * scale, height: NATURAL_H * scale, position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0,
        width: NATURAL_W,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        display: 'flex',
        alignItems: 'flex-start',
      }}>
        {/* EASTERN label */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 20, flexShrink: 0, marginTop: HEADER_H, height: COL_H,
        }}>
          <span style={{
            writingMode: 'vertical-rl', textOrientation: 'mixed',
            transform: 'rotate(180deg)',
            color: '#7A3FF2', fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
          }}>EASTERN</span>
        </div>

        <Column matches={eQF} tops={QF_TOPS} label="FIRST ROUND" />
        <div style={connPad}><Connectors fromTops={QF_TOPS} toTops={SF_TOPS} /></div>
        <Column matches={eSF} tops={SF_TOPS} label="CONF SEMIS" />
        <div style={connPad}><Connectors fromTops={SF_TOPS} toTops={[CF_TOP]} /></div>
        <Column matches={eCF} tops={[CF_TOP]} label="CONF FINALS" />
        <div style={connPad}><Connectors fromTops={[CF_TOP]} toTops={[FIN_TOP]} /></div>

        {/* Finals */}
        <div>
          <div style={{
            height: HEADER_H,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 8,
            color: '#E2622C', fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
            whiteSpace: 'nowrap',
          }}>
            NBA FINALS
          </div>
          <div style={{ position: 'relative', width: CARD_W + 20, height: COL_H }}>
            <div style={{ position: 'absolute', top: FIN_TOP, left: 10 }}>
              <MatchCard match={bracket.finals} highlight />
            </div>
          </div>
        </div>

        <div style={{ ...connPad, transform: 'scaleX(-1)' }}><Connectors fromTops={[CF_TOP]} toTops={[FIN_TOP]} /></div>
        <Column matches={wCF} tops={[CF_TOP]} label="CONF FINALS" />
        <div style={{ ...connPad, transform: 'scaleX(-1)' }}><Connectors fromTops={SF_TOPS} toTops={[CF_TOP]} /></div>
        <Column matches={wSF} tops={SF_TOPS} label="CONF SEMIS" />
        <div style={{ ...connPad, transform: 'scaleX(-1)' }}><Connectors fromTops={QF_TOPS} toTops={SF_TOPS} /></div>
        <Column matches={wQF} tops={QF_TOPS} label="FIRST ROUND" />

        {/* WESTERN label */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 20, flexShrink: 0, marginTop: HEADER_H, height: COL_H,
        }}>
          <span style={{
            writingMode: 'vertical-rl', textOrientation: 'mixed',
            color: '#E2622C', fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
          }}>WESTERN</span>
        </div>
      </div>
      </div>
    </div>
  );
}
