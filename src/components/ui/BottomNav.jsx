// src/components/ui/BottomNav.jsx
// Cliente (referencia FORMATO GENERAL): barra blanca, pestaña activa en
// naranja de marca, inactivas en gris oscuro, botón QR central en círculo
// negro sobresaliente con su label "Código QR" (naranja al estar activo).
// Admin y operador conservan su paleta propia.
import { adminTheme, BRAND_ORANGE } from '../../constants/styles';

export default function BottomNav({ items, current, onSelect, view, tierName, dark = false }) {
  const isA = view === 'admin';
  const isC = view === 'client';

  // Cliente en modo oscuro: barra oscura y círculo QR invertido (blanco
  // con trazo negro) para que contraste con la barra.
  const dk = isC && dark;
  const barBg = isA ? adminTheme.bg : dk ? '#101014' : '#fff';
  const borderColor = isA ? adminTheme.border : dk ? 'rgba(255,255,255,.1)' : '#ECECEC';
  const activeColor = isC ? BRAND_ORANGE : '#FBBC04';
  const inactiveColor = isA ? '#666' : dk ? 'rgba(255,255,255,.85)' : '#1A1A1A';
  const qrBg  = dk ? '#fff' : '#0D0D0D';
  const qrInk = dk ? '#0D0D0D' : '#fff';

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      // El panel admin usa lienzo ancho en desktop/tablet (4-ago)
      width: '100%', maxWidth: isA ? 1080 : 480,
      background: barBg,
      borderTop: `1px solid ${borderColor}`,
      display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end',
      padding: '6px 0 8px',
      zIndex: 100,
      overflow: 'visible', // permite que el botón QR sobresalga
    }}>
      {items.map(n => {

        // ── Botón QR central (círculo negro, naranja al estar activo) ──
        if (n.isQR && isC) {
          const qrActive = current === 'qr';
          return (
            <button key="qr" onClick={(e) => onSelect('qr', e)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 0, marginTop: -26, // sube el círculo por encima de la barra
            }}>
              <div style={{
                width: 54, height: 54, borderRadius: '50%',
                background: qrActive ? BRAND_ORANGE : qrBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(0,0,0,.25)',
                border: `3px solid ${barBg}`,
              }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="7" height="7" rx="1.2" stroke={qrActive ? '#fff' : qrInk} strokeWidth="1.8" fill="none"/>
                  <rect x="5" y="5" width="3" height="3" rx=".4" fill={qrActive ? '#fff' : qrInk}/>
                  <rect x="14" y="3" width="7" height="7" rx="1.2" stroke={qrActive ? '#fff' : qrInk} strokeWidth="1.8" fill="none"/>
                  <rect x="16" y="5" width="3" height="3" rx=".4" fill={qrActive ? '#fff' : qrInk}/>
                  <rect x="3" y="14" width="7" height="7" rx="1.2" stroke={qrActive ? '#fff' : qrInk} strokeWidth="1.8" fill="none"/>
                  <rect x="5" y="16" width="3" height="3" rx=".4" fill={qrActive ? '#fff' : qrInk}/>
                  <path d="M14 14h2v2h-2zM16 16h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" fill={qrActive ? '#fff' : qrInk}/>
                </svg>
              </div>
              <span style={{
                fontFamily: "'DM Sans'", fontSize: 10.5, fontWeight: 700,
                color: qrActive ? BRAND_ORANGE : inactiveColor,
              }}>
                Código QR
              </span>
            </button>
          );
        }

        // ── Botones normales ──────────────────────────────
        return (
          <button key={n.id} onClick={(e) => onSelect(n.id, e)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            padding: '4px 8px', background: 'none', border: 'none',
            color: current === n.id ? activeColor : inactiveColor,
            cursor: 'pointer', fontFamily: "'DM Sans'", fontSize: 10.5,
            fontWeight: 700,
          }}>
            {n.icon}
            {n.label}
          </button>
        );
      })}
    </div>
  );
}
