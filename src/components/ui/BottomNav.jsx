// src/components/ui/BottomNav.jsx
import { adminTheme, GAL } from '../../constants/styles';

export default function BottomNav({ items, current, onSelect, view, tierName }) {
  const isA = view === 'admin';
  const isO = view === 'operator';

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480,
      background: isA ? adminTheme.bg
        : isO ? '#fff'
        : tierName === 'BLACK' ? GAL
        : tierName === 'PLATINO' ? '#DADADA' : '#fff',
      borderTop: `1px solid ${isA ? adminTheme.border : isO ? '#eee' : tierName === 'BLACK' ? 'rgba(255,255,255,.08)' : tierName === 'PLATINO' ? '#BDBDBD' : '#eee'}`,
      display: 'flex', justifyContent: 'space-around',
      padding: '6px 0 10px', zIndex: 100, overflow: 'hidden',
    }}>
      {items.map(n => (
        <button key={n.id} onClick={() => onSelect(n.id)} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          padding: '6px 8px', background: 'none', border: 'none',
          color: current === n.id
            ? (view === 'client' ? (tierName === 'BLACK' ? '#FFD54F' : tierName === 'PLATINO' ? '#1565C0' : '#F0A500')
              : '#FBBC04')
            : (isA ? '#666' : tierName === 'BLACK' ? '#aaa' : '#9E9E9E'),
          cursor: 'pointer', fontFamily: "'DM Sans'", fontSize: 9,
          fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase',
          position: 'relative', zIndex: 1,
        }}>
          {n.icon}
          {n.label}
        </button>
      ))}
    </div>
  );
}
