// src/components/SpecialDayBonusModal.jsx
// ============================================================
// Club Turkaj — Modal celebrativo de bonos por día especial
// ============================================================
// Reemplaza el toast simple (FB.6.3) con un modal flotante
// personalizado por tier (ORO / PLATINO / BLACK), reusando los
// tokens visuales de src/lib/tierSystem.js. Sin Tailwind: estilos
// inline. Integración en App.jsx queda para FB.6.2c.2.
// ============================================================

import { useEffect } from 'react';
import { tierTheme, tierShadow, tierBorder, tierBackground } from '../lib/tierSystem';
import TierDeco from './ui/TierDeco';
import { sMono } from '../constants/styles';

const KEYFRAMES = `
@keyframes specialBonusScaleIn {
  0%   { opacity: 0; transform: scale(0.7); }
  60%  { opacity: 1; transform: scale(1.05); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes specialBonusFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}`;

// Inyecta los keyframes una sola vez en <head>.
function useBonusKeyframes() {
  useEffect(() => {
    const ID = 'special-bonus-keyframes';
    if (document.getElementById(ID)) return;
    const el = document.createElement('style');
    el.id = ID;
    el.textContent = KEYFRAMES;
    document.head.appendChild(el);
  }, []);
}

// Fallback ORO si no llega un tier válido.
const ORO_FALLBACK = {
  name: 'ORO',
  color: '#000',
  bg: '#FBBC04',
  grad: 'linear-gradient(135deg,#FBBC04 0%,#FFD540 50%,#FBBC04 100%)',
  icon: '🟡',
};

export default function SpecialDayBonusModal({
  open,
  events = [],
  bonus,
  memberName,
  tier,
  onClose,
}) {
  useBonusKeyframes();

  if (!open) return null;

  const safeTier = tier || ORO_FALLBACK;
  const theme = tierTheme(safeTier.name);
  const surfaceBg = tierBackground(safeTier.name) || safeTier.grad;
  const isBlack = safeTier.name === 'BLACK';

  // Título condicional: el cumpleaños tiene prioridad.
  const isBirthday = events.some((e) => e.is_birthday);
  const title = isBirthday
    ? `¡Feliz cumpleaños, ${memberName}!`
    : `¡Sorpresa, ${memberName}!`;

  // Separadores internos según el tier (claro sobre oscuro / oscuro sobre claro).
  const divider = isBlack || safeTier.name === 'PLATINO'
    ? 'rgba(255,255,255,.15)'
    : 'rgba(0,0,0,.08)';
  const eventCardBg = isBlack
    ? 'rgba(255,255,255,.06)'
    : safeTier.name === 'PLATINO'
      ? 'rgba(255,255,255,.35)'
      : 'rgba(255,255,255,.45)';
  const btnText = safeTier.name === 'ORO' ? '#000' : '#fff';

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        animation: 'specialBonusFadeIn 300ms ease-out',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%', maxWidth: 420,
          background: surfaceBg,
          color: safeTier.color,
          border: tierBorder(safeTier.name),
          boxShadow: tierShadow(safeTier.name),
          borderRadius: 20,
          padding: 32,
          overflow: 'hidden',
          animation: 'specialBonusScaleIn 500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {isBlack && <TierDeco name="BLACK" />}

        <div style={{ position: 'relative', zIndex: 2 }}>
          {/* Icono celebrativo */}
          <div style={{ fontSize: '3.5em', textAlign: 'center', marginBottom: 12 }}>
            🎉
          </div>

          {/* Título */}
          <h2 style={{
            fontSize: '1.5em', fontWeight: 700, textAlign: 'center',
            margin: '0 0 24px',
          }}>
            {title}
          </h2>

          {/* Eventos apilados */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {events.map((event, idx) => (
              <div key={event.id || idx} style={{
                padding: 16,
                background: eventCardBg,
                borderRadius: 12,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '2.5em', marginBottom: event.is_birthday ? 12 : 4, lineHeight: 1 }}>
                  {event.icon}
                </div>
                {!event.is_birthday && (
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>
                    {event.name}
                  </div>
                )}
                {event.message && (
                  <div style={{
                    fontStyle: 'italic',
                    fontSize: '0.9em',
                    marginBottom: 8,
                    opacity: 0.85,
                  }}>
                    &ldquo;{event.message}&rdquo;
                  </div>
                )}
                <div style={{
                  ...sMono,
                  fontSize: '1.5em',
                  color: theme.accent,
                  fontWeight: 700,
                }}>
                  +{event.points} pts
                </div>
              </div>
            ))}
          </div>

          {/* Total (solo si hay más de 1 evento) */}
          {events.length > 1 && (
            <div style={{
              marginTop: 20, textAlign: 'center',
              paddingTop: 16, borderTop: `1px solid ${divider}`,
            }}>
              <div style={{ fontSize: '0.9em', opacity: 0.8 }}>Total</div>
              <div style={{
                ...sMono,
                fontSize: '2em',
                color: theme.accent,
                fontWeight: 700,
              }}>
                +{bonus} pts
              </div>
            </div>
          )}

          {/* Botón Continuar */}
          <button
            onClick={onClose}
            style={{
              marginTop: 28, width: '100%',
              padding: '14px 24px',
              background: theme.accent,
              color: btnText,
              border: 'none',
              borderRadius: 12,
              fontSize: '1em',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'transform 150ms ease',
            }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
