// src/views/client/TermsSheet.jsx
// Términos y Condiciones en el REGISTRO (11-ago-2026, pedido del
// dueño): TermsAcceptRow es la casilla "Acepto los Términos y
// Condiciones" del paso final del wizard (el enlace abre el visor);
// TermsSheet es el visor a pantalla completa con los MISMOS textos
// aprobados en R1a (TERMS_SECS de MenuTerms — una sola fuente, sin
// copias) y botón "Aceptar y continuar" que marca la casilla al
// volver. Ambos soportan modo claro/oscuro (regla CLAUDE.md §3).
import { BRAND_ORANGE } from '../../constants/styles';
import { XMark, Check } from '../../components/ui/Icons';
import { TERMS_SECS } from './menu/MenuTerms';

// Casilla de aceptación (paso 3 del wizard). No se deshabilita el
// botón Finalizar: el wizard valida al clic con error explícito
// (regla del ReasonModal, 8-ago).
export function TermsAcceptRow({ accepted, onToggle, onRead, dark }) {
  const ink = dark ? '#fff' : '#0D0D0D';
  const card = dark ? 'rgba(255,255,255,.07)' : '#F5F5F7';
  return (
    <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginBottom: 16, background: card, borderRadius: 16, padding: '13px 14px' }}>
      <div style={{
        width: 24, height: 24, borderRadius: 8, flexShrink: 0,
        background: accepted ? BRAND_ORANGE : 'transparent',
        border: accepted ? 'none' : `2px solid ${dark ? 'rgba(255,255,255,.35)' : '#BDBDBD'}`,
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background .15s',
      }}>
        {accepted && <Check />}
      </div>
      <div style={{ flex: 1, fontSize: 12.5, color: ink, fontWeight: 600, lineHeight: 1.5 }}>
        Acepto los{' '}
        <span
          onClick={e => { e.stopPropagation(); onRead(); }}
          style={{ color: BRAND_ORANGE, fontWeight: 800, textDecoration: 'underline', textUnderlineOffset: 2 }}
        >
          Términos y Condiciones
        </span>
        {' '}del programa
      </div>
    </div>
  );
}

// Visor a pantalla completa (se abre desde el enlace de la casilla)
export default function TermsSheet({ dark, onClose, onAccept }) {
  const bg = dark ? '#0E0E10' : '#fff';
  const ink = dark ? '#fff' : '#0D0D0D';
  const sub = dark ? '#9E9E9E' : '#757575';
  const line = dark ? 'rgba(255,255,255,.12)' : '#ECECEE';
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: bg, display: 'flex', flexDirection: 'column' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 24px 14px', borderBottom: `1px solid ${line}`, flexShrink: 0 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: ink }}>Términos y Condiciones</div>
          <div style={{ fontSize: 12, color: sub, marginTop: 2 }}>Aplica en Gasolineras Turkaj, Chichicastenango</div>
        </div>
        <button onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: sub, display: 'flex', padding: 6 }}>
          <XMark />
        </button>
      </div>

      {/* Texto legal (scroll) */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '18px 24px 24px' }}>
        {TERMS_SECS.map((s, i) => (
          <div key={i} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: BRAND_ORANGE, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
              {String(i + 1).padStart(2, '0')}. {s.title}
            </div>
            <div style={{ fontSize: 13, color: ink, lineHeight: 1.7 }}>{s.body}</div>
          </div>
        ))}
        <div style={{ fontSize: 11, color: sub, textAlign: 'center', lineHeight: 1.6, marginTop: 8 }}>
          Última actualización: Julio 2026
        </div>
      </div>

      {/* Acción */}
      <div style={{ padding: '12px 24px 24px', borderTop: `1px solid ${line}`, flexShrink: 0 }}>
        <button onClick={onAccept} style={{
          width: '100%', padding: 15, borderRadius: 16, border: 'none',
          background: BRAND_ORANGE, color: '#fff',
          fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 800, cursor: 'pointer',
        }}>
          Aceptar y continuar
        </button>
      </div>
    </div>
  );
}
