// src/components/ClientQrSheet.jsx
// Bottom-sheet del código QR del miembro (botón central de la BottomNav)
// — FORMATO GENERAL: flat, esquinas de escáner en el naranja de marca
// (referencia pantalla Código QR). El QR se genera local (SVG, offline)
// y siempre sobre panel blanco para que el escáner lo lea en modo
// oscuro. Extraído de App.jsx (división etapa 1, 12-ago-2026) sin
// cambios; el cierre animado (closing) lo orquesta App (closeQR).
import QRCode from './ui/QRCode';
import { sMono, bento, BRAND_ORANGE } from '../constants/styles';

export default function ClientQrSheet({ me, tierName, dark, closing, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,.6)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: closing ? 'ppFadeOut .22s ease forwards' : 'fadeIn .2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: dark ? '#101018' : '#fff',
          borderRadius: '28px 28px 0 0',
          width: '100%', maxWidth: 480,
          padding: '12px 24px 44px',
          animation: closing ? 'slideDownOut .22s ease-in forwards' : 'slideUp .32s cubic-bezier(.32,1.2,.64,1)',
        }}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 4, background: dark ? 'rgba(255,255,255,.2)' : '#E0E0E0', margin: '0 auto 18px' }} />

        {/* Título */}
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{
            fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2,
            color: tierName === 'BLACK' ? '#FFD54F' : tierName === 'PLATINO' ? '#6B767D' : bento.gold,
          }}>
            Nivel {tierName}
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: dark ? '#fff' : '#0D0D0D' }}>
            Código QR
          </div>
        </div>

        {/* QR enmarcado por esquinas de escáner (naranja de marca) */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-block', position: 'relative', padding: 14 }}>
            {[
              { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 14 },
              { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 14 },
              { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 14 },
              { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 14 },
            ].map((pos, i) => (
              <div key={i} style={{
                position: 'absolute', width: 30, height: 30,
                borderColor: BRAND_ORANGE, borderStyle: 'solid', borderWidth: 0,
                ...pos,
              }} />
            ))}
            {/* Panel blanco siempre (el QR necesita fondo claro para escanear) */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 16, display: 'inline-block', lineHeight: 0 }}>
              <QRCode code={me.cardId || me.id} sz={180} scanColor={BRAND_ORANGE} />
            </div>
          </div>

          {/* Código de tarjeta */}
          <div style={{ marginTop: 10 }}>
            <div style={{
              display: 'inline-block', padding: '8px 18px', borderRadius: 10,
              background: dark ? 'rgba(255,255,255,.08)' : '#F5F5F7',
              ...sMono, fontSize: 13, fontWeight: 800, letterSpacing: 1.5,
              color: dark ? '#fff' : '#0D0D0D',
            }}>
              {me.cardId || '—'}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12.5, color: dark ? 'rgba(255,255,255,.5)' : '#6E6E73', fontWeight: 600 }}>
          Mostrá este código en cada carga de combustible
        </div>
      </div>
    </div>
  );
}
