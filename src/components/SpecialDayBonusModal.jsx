// src/components/SpecialDayBonusModal.jsx
// Modal celebrativo de bonos por día especial (cumpleaños + festivos)
// al FORMATO GENERAL: patrón banda+cuerpo flat sin sombras ni emojis —
// banda naranja de marca con CONFETTI flotante (pp-confetti), eventos
// como filas con disco de color rotativo e icono SVG, puntos en verde.
// Misma interfaz de props que la versión anterior (App.jsx no cambia).
import { bento, BRAND_ORANGE, btnStyle } from '../constants/styles';
import { Cake, StarLine } from './ui/Icons';
import useBackLayer from '../hooks/useBackLayer';

// Piezas de confetti que llueven sobre la banda. Por pieza: posición
// (l/t, donde descansa con reduced motion), tamaño w×h (rectángulos =
// papelitos, r = círculo), color, `fall`/`off` = duración y fase de la
// caída (delay negativo: lluvia ya en curso), `spin`/`so` = duración y
// fase del volteo 3D, `rev` invierte el sentido del giro. Velocidades
// todas distintas para que ninguna pareja de piezas vaya sincronizada.
const CONFETTI = [
  { l: '4%',  t: '20%', w: 6, h: 10, c: '#FFD54F',                fall: 3.6, off: 0.4, spin: 1.15, so: 0.2 },
  { l: '11%', t: '62%', w: 5, h: 5,  c: 'rgba(255,255,255,.9)',   fall: 3.1, off: 1.7, spin: 1.5,  so: 0.6, r: 1 },
  { l: '18%', t: '30%', w: 5, h: 9,  c: '#FFE7D6',                fall: 4.2, off: 2.9, spin: 0.95, so: 0.1, rev: 1 },
  { l: '25%', t: '74%', w: 4, h: 7,  c: '#FFD54F',                fall: 2.9, off: 1.1, spin: 1.35, so: 0.8 },
  { l: '32%', t: '14%', w: 5, h: 5,  c: 'rgba(255,255,255,.75)',  fall: 3.8, off: 3.3, spin: 1.6,  so: 0.4, r: 1 },
  { l: '39%', t: '52%', w: 6, h: 9,  c: '#FFE7D6',                fall: 3.3, off: 0.9, spin: 1.05, so: 0.5, rev: 1 },
  { l: '47%', t: '80%', w: 4, h: 8,  c: 'rgba(255,255,255,.85)',  fall: 4.5, off: 2.2, spin: 1.25, so: 0.3 },
  { l: '54%', t: '12%', w: 6, h: 6,  c: '#FFE7D6',                fall: 3.0, off: 1.4, spin: 1.45, so: 0.7, r: 1 },
  { l: '61%', t: '44%', w: 5, h: 10, c: '#FFD54F',                fall: 3.9, off: 3.6, spin: 0.9,  so: 0.2, rev: 1 },
  { l: '68%', t: '70%', w: 5, h: 8,  c: 'rgba(255,255,255,.9)',   fall: 2.8, off: 0.6, spin: 1.3,  so: 0.9 },
  { l: '75%', t: '24%', w: 7, h: 7,  c: 'rgba(255,255,255,.8)',   fall: 4.0, off: 2.5, spin: 1.55, so: 0.4, r: 1 },
  { l: '82%', t: '58%', w: 4, h: 8,  c: '#FFE7D6',                fall: 3.4, off: 1.9, spin: 1.0,  so: 0.6, rev: 1 },
  { l: '89%', t: '32%', w: 6, h: 9,  c: '#FFD54F',                fall: 3.7, off: 0.2, spin: 1.2,  so: 0.1 },
  { l: '95%', t: '68%', w: 5, h: 5,  c: 'rgba(255,255,255,.75)',  fall: 3.2, off: 2.7, spin: 1.4,  so: 0.5, r: 1 },
];

// Discos de color rotativos para las filas de eventos (colorido)
const EVENT_COLORS = [bento.amber, bento.teal, bento.purple, bento.blue];

export default function SpecialDayBonusModal({
  open,
  events = [],
  bonus,
  memberName,
  tier,
  dark = tier?.name === 'BLACK',
  onClose,
}) {
  useBackLayer(!!open, onClose);
  if (!open) return null;

  const ink  = dark ? '#fff' : '#0D0D0D';
  const sub  = dark ? 'rgba(255,255,255,.55)' : '#6E6E73';
  const row  = dark ? 'rgba(255,255,255,.06)' : '#F5F5F7';

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
        background: dark ? '#101018' : '#fff',
        borderRadius: 24, maxWidth: 380, width: '100%',
        overflow: 'hidden',
      }}>
        {/* Banda festiva con confetti (centrada — regla del dueño) */}
        <div style={{ position: 'relative', background: BRAND_ORANGE, color: '#fff', padding: '26px 22px', textAlign: 'center', overflow: 'hidden' }}>
          {CONFETTI.map((p, i) => (
            <span key={i} className="pp-confetti" style={{
              left: p.l, top: p.t,
              animationDuration: `${p.fall}s`, animationDelay: `${-p.off}s`,
            }}>
              <i style={{
                width: p.w, height: p.h, background: p.c,
                borderRadius: p.r ? '50%' : 1.5,
                animationDuration: `${p.spin}s`, animationDelay: `${-p.so}s`,
                animationDirection: p.rev ? 'reverse' : 'normal',
              }} />
            </span>
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
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: `1px solid ${dark ? 'rgba(255,255,255,.1)' : '#F0F0F0'}` }}>
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
