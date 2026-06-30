'use client';

import { useGameStore } from '@/store/gameStore';

interface TipBannerProps {
  id:      string;
  icon:    string;
  text:    string;
}

export default function TipBanner({ id, icon, text }: TipBannerProps) {
  const save       = useGameStore(s => s.save);
  const dismissTip = useGameStore(s => s.dismissTip);

  const seen = save?.seenTips?.includes(id) ?? false;
  if (seen) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: '#EFF6FF',
      border: '1px solid #BFDBFE',
      borderRadius: 10, padding: '10px 14px',
      marginBottom: 16, flexShrink: 0,
    }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, color: '#1E40AF', fontSize: 12, fontWeight: 600, lineHeight: 1.4 }}>
        {text}
      </span>
      <button
        onClick={() => dismissTip(id)}
        style={{
          background: 'none', border: 'none',
          color: '#93C5FD', fontSize: 16, fontWeight: 700,
          cursor: 'pointer', flexShrink: 0, padding: '0 4px', lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  );
}
