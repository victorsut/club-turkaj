// src/components/ui/BottomNav.jsx
import { adminTheme, GAL } from '../../constants/styles';

export default function BottomNav({ items, current, onSelect, view, tierName }) {
  const isA = view === 'admin';
  const isO = view === 'operator';
  const isC = view === 'client';

  const qrColor = tierName === 'BLACK' ? '#FFD54F'
    : tierName === 'PLATINO' ? '#1565C0'
    : '#F0A500';

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480,
      background: isA ? adminTheme.bg
        : isO ? '#fff'
        : tierName === 'BLACK' ? GAL
        : tierName === 'PLATINO' ? '#DADADA' : '#fff',
      borderTop: `1px solid ${isA ? adminTheme.border : isO ? '#eee' : tierName === 'BLACK' ? 'rgba(255,255,255,.08)' : tierName === 'PLATINO' ? '#BDBDBD' : '#eee'}`,
      display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end',
      padding: '6px 0 10px', zIndex: 100,
    }}>
      {items.map(n => {
        // Botón QR central especial
        if (n.isQR && isC) {
          return (
            <button key="qr" onClick={() => onSelect('qr')} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '0 8px', position: 'relative',
            }}>
              {/* Botón elevado sin texto debajo */}
              <div style={{
                width: 62, height: 62, borderRadius: '50%',
                background: `linear-gradient(135deg, ${qrColor}, ${qrColor}CC)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 6px 20px ${qrColor}88`,
                transform: 'translateY(-18px)',
                border: `3px solid ${tierName === 'BLACK' ? '#0D0D1A' : tierName === 'PLATINO' ? '#DADADA' : '#fff'}`,
              }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="7" height="7" rx="1" stroke={tierName === 'PLATINO' ? '#fff' : '#0D0D0D'} strokeWidth="1.8" fill="none"/>
                  <rect x="5" y="5" width="3" height="3" rx=".3" fill={tierName === 'PLATINO' ? '#fff' : '#0D0D0D'}/>
                  <rect x="14" y="3" width="7" height="7" rx="1" stroke={tierName === 'PLATINO' ? '#fff' : '#0D0D0D'} strokeWidth="1.8" fill="none"/>
                  <rect x="16" y="5" width="3" height="3" rx=".3" fill={tierName === 'PLATINO' ? '#fff' : '#0D0D0D'}/>
                  <rect x="3" y="14" width="7" height="7" rx="1" stroke={tierName === 'PLATINO' ? '#fff' : '#0D0D0D'} strokeWidth="1.8" fill="none"/>
                  <rect x="5" y="16" width="3" height="3" rx=".3" fill={tierName === 'PLATINO' ? '#fff' : '#0D0D0D'}/>
                  <path d="M14 14h2v2h-2zM16 16h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" fill={tierName === 'PLATINO' ? '#fff' : '#0D0D0D'}/>
                </svg>
              </div>
            </button>
          );
        }

        // Botones normales
        const activeColor = view === 'client'
          ? (tierName === 'BLACK' ? '#FFD54F' : tierName === 'PLATINO' ? '#1565C0' : '#F0A500')
          : '#FBBC04';

        return (
          <button key={n.id} onClick={() => onSelect(n.id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            padding: '6px 8px', background: 'none', border: 'none',
            color: current === n.id ? activeColor : (isA ? '#666' : tierName === 'BLACK' ? '#aaa' : '#9E9E9E'),
            cursor: 'pointer', fontFamily: "'DM Sans'", fontSize: 9,
            fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase',
          }}>
            {n.icon}
            {n.label}
          </button>
        );
      })}
    </div>
  );
}
