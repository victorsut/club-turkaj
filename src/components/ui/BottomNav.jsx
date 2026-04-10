// src/components/ui/BottomNav.jsx
import { adminTheme, GAL } from '../../constants/styles';

export default function BottomNav({ items, current, onSelect, view, tierName }) {
  const isA = view === 'admin';
  const isO = view === 'operator';
  const isC = view === 'client';

  const qrColor = tierName === 'BLACK' ? '#FFD54F'
    : tierName === 'PLATINO' ? '#1565C0'
    : '#2E7D52'; // verde oscuro similar al ejemplo

  const barBg = isA ? adminTheme.bg
    : isO ? '#fff'
    : tierName === 'BLACK' ? GAL
    : tierName === 'PLATINO' ? '#DADADA' : '#fff';

  const borderColor = isA ? adminTheme.border
    : isO ? '#eee'
    : tierName === 'BLACK' ? 'rgba(255,255,255,.08)'
    : tierName === 'PLATINO' ? '#BDBDBD' : '#eee';

  const activeColor = isC
    ? (tierName === 'BLACK' ? '#FFD54F' : tierName === 'PLATINO' ? '#1565C0' : '#F0A500')
    : '#FBBC04';

  const inactiveColor = isA ? '#666' : tierName === 'BLACK' ? '#aaa' : '#9E9E9E';

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480,
      background: barBg,
      borderTop: `1px solid ${borderColor}`,
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      padding: '6px 0 10px',
      zIndex: 100,
      overflow: 'visible', // permite que el botón QR sobresalga
    }}>
      {items.map(n => {

        // ── Botón QR central ──────────────────────────────
        if (n.isQR && isC) {
          return (
            <button key="qr" onClick={() => onSelect('qr')} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 0, marginTop: -28, // sube el botón por encima de la barra
            }}>
              <div style={{
                width: 58, height: 58, borderRadius: '50%',
                background: qrColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 4px 16px rgba(0,0,0,.25)`,
                border: `3px solid ${barBg}`,
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="7" height="7" rx="1.2" stroke="#fff" strokeWidth="1.8" fill="none"/>
                  <rect x="5" y="5" width="3" height="3" rx=".4" fill="#fff"/>
                  <rect x="14" y="3" width="7" height="7" rx="1.2" stroke="#fff" strokeWidth="1.8" fill="none"/>
                  <rect x="16" y="5" width="3" height="3" rx=".4" fill="#fff"/>
                  <rect x="3" y="14" width="7" height="7" rx="1.2" stroke="#fff" strokeWidth="1.8" fill="none"/>
                  <rect x="5" y="16" width="3" height="3" rx=".4" fill="#fff"/>
                  <path d="M14 14h2v2h-2zM16 16h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" fill="#fff"/>
                </svg>
              </div>
            </button>
          );
        }

        // ── Botones normales ──────────────────────────────
        return (
          <button key={n.id} onClick={() => onSelect(n.id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            padding: '4px 8px', background: 'none', border: 'none',
            color: current === n.id ? activeColor : inactiveColor,
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
