// src/components/SpecialDayBonusModal.jsx
// Modal celebrativo de bonos por día especial (cumpleaños + festivos)
// al FORMATO GENERAL: patrón banda+cuerpo flat sin sombras ni emojis —
// banda naranja de marca con CONFETTI flotante (pp-confetti), eventos
// como filas con disco de color rotativo e icono SVG, puntos en verde.
// Misma interfaz de props que la versión anterior (App.jsx no cambia).
import { bento, BRAND_ORANGE, btnStyle } from '../constants/styles';
import { Cake, StarLine } from './ui/Icons';
import useBackLayer from '../hooks/useBackLayer';

// Piezas de confetti sobre la banda (posiciones fijas, flotan en CSS)
const CONFETTI = [
  { l: '5%',  t: '16%', s: 7, c: '#FFD54F', r: 1 },
  { l: '12%', t: '62%', s: 5, c: 'rgba(255,255,255,.9)' },
  { l: '20%', t: '28%', s: 6, c: '#FFE7D6', r: 1 },
  { l: '27%', t: '74%', s: 4, c: '#FFD54F' },
  { l: '34%', t: '12%', s: 5, c: 'rgba(255,255,255,.75)' },
  { l: '55%', t: '10%', s: 6, c: '#FFE7D6' },
  { l: '66%', t: '70%', s: 5, c: '#FFD54F', r: 1 },
  { l: '74%', t: '22%', s: 7, c: 'rgba(255,255,255,.9)', r: 1 },
  { l: '82%', t: '58%', s: 4, c: '#FFE7D6' },
  { l: '90%', t: '30%', s: 6, c: '#FFD54F' },
  { l: '95%', t: '68%', s: 5, c: 'rgba(255,255,255,.75)', r: 1 },
];

// Discos de color rotativos para las filas de eventos (colorido)
const EVENT_COLORS = [bento.amber, bento.teal, bento.purple, bento.blue];

export default function SpecialDayBonusModal({
  open,
  events = [],
  bonus,
  memberName,
  tier,
  onClose,
}) {
  useBackLayer(!!open, onClose);
  if (!open) return null;

  const isBlack = tier?.name === 'BLACK';
  const ink  = isBlack ? '#fff' : '#0D0D0D';
  const sub  = isBlack ? 'rgba(255,255,255,.55)' : '#6E6E73';
  const row  = isBlack ? 'rgba(255,255,255,.06)' : '#F5F5F7';

  const isBirthday = events.some((e) => e.is_birthday);
  const firstName  = (memberName || '').trim().split(' ')[0] || 'cliente';

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, animation: 'ppFade .25s ease',
      }}
    >
      <div onClick={e => e.stopPropagation()} className="pp-grow" style={{
        background: isBlack ? '#101018' : '#fff',
        borderRadius: 24, maxWidth: 380, width: '100%',
        overflow: 'hidden',
      }}>
        {/* Banda festiva con confetti (centrada — regla del dueño) */}
        <div style={{ position: 'relative', background: BRAND_ORANGE, color: '#fff', padding: '26px 22px', textAlign: 'center', overflow: 'hidden' }}>
          {CONFETTI.map((p, i) => (
            <span key={i} className="pp-confetti" style={{
              left: p.l, top: p.t, width: p.s, height: p.s, background: p.c,
              borderRadius: p.r ? '50%' : 2,
              animationDelay: `${(i % 5) * .35}s`,
              animationDuration: `${1.5 + (i % 3) * .45}s`,
            }} />
          ))}
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, opacity: .9 }}>
              {isBirthday ? 'Hoy es tu día' : 'Día especial'}
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.25, marginTop: 4 }}>
              {isBirthday ? `¡Feliz cumpleaños, ${firstName}!` : `¡Sorpresa, ${firstName}!`}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4, opacity: .9 }}>
              Tenés puntos de regalo
            </div>
          </div>
        </div>

        {/* Cuerpo: eventos como filas de color */}
        <div style={{ padding: '18px 20px 22px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {events.map((event, idx) => (
              <div key={event.id || idx} style={{ background: row, borderRadius: 16, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: EVENT_COLORS[idx % EVENT_COLORS.length], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {event.is_birthday ? <Cake /> : <StarLine />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: ink }}>
                    {event.is_birthday ? 'Bonus de cumpleaños' : event.name}
                  </div>
                  {event.message && (
                    <div style={{ fontSize: 11.5, color: sub, marginTop: 2, lineHeight: 1.4 }}>
                      {event.message}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 15, fontWeight: 900, color: bento.green, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                  +{event.points}
                </div>
              </div>
            ))}
          </div>

          {/* Total (solo con más de un evento) */}
          {events.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: `1px solid ${isBlack ? 'rgba(255,255,255,.1)' : '#F0F0F0'}` }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: sub, textTransform: 'uppercase', letterSpacing: 1 }}>Total</span>
              <span style={{ fontSize: 24, fontWeight: 900, color: bento.green, fontVariantNumeric: 'tabular-nums' }}>+{bonus} pts</span>
            </div>
          )}

          <button onClick={onClose} style={{ ...btnStyle, background: BRAND_ORANGE, color: '#fff', marginTop: 18, padding: 15, fontSize: 15 }}>
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
