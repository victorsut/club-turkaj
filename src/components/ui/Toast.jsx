// src/components/ui/Toast.jsx
// R1b.4 — Toast con FORMATO GENERAL: píldora oscura flat (sin sombra),
// DM Sans, ícono SVG en disco de color sólido según severidad — SIN
// emojis (directiva 21-jul). Para no tocar los ~100 fire() existentes,
// la severidad se deriva del emoji inicial del mensaje o de su texto,
// y el emoji se ELIMINA del texto mostrado. Código nuevo puede pasarla
// explícita: fire('Guardado', 'success') | 'error' | 'warn' | 'info'.
import { bento } from '../../constants/styles';
import { Check, Warn, XMark, Info } from './Icons';
import { stripEmojis } from '../../lib/text';

// Severidad por emoji inicial (contrato histórico de los fire()).
const fromEmoji = (s) => {
  const m = String(s).trim();
  if (/^(✅|🎉|⭐|🎟️|🎟|📋|🎁)/.test(m)) return 'success';
  if (/^(❌|🚫)/.test(m)) return 'error';
  if (/^(⚠️|⚠|⏳)/.test(m)) return 'warn';
  return null;
};

// Heurística para mensajes planos sin emoji.
const fromText = (s) => {
  if (/^error|sin conexi|inválid|invalid|obligatori|no coinciden|^mínimo|^minimo|no disponible|fall[oó]/i.test(String(s).trim())) return 'error';
  return null;
};

const SEV = {
  success: { color: bento.green, Icon: Check },
  error:   { color: bento.red,   Icon: XMark },
  warn:    { color: bento.amber, Icon: Warn },
  info:    { color: '#48484A',   Icon: Info },
};

export default function Toast({ toast, dark = false }) {
  if (!toast) return null;
  const msg = typeof toast === 'string' ? toast : toast.msg;
  const explicit = typeof toast === 'object' ? toast.type : null;
  const sev = SEV[explicit || fromEmoji(msg) || fromText(msg) || 'info'];

  return (
    <div style={{
      position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
      // En modo oscuro la píldora negra se perdería sobre el fondo —
      // sube un tono y gana un filo sutil.
      background: dark ? '#2A2A30' : '#0D0D0D', color: '#fff',
      border: dark ? '1px solid rgba(255,255,255,.12)' : 'none',
      padding: '10px 18px 10px 10px',
      borderRadius: 16, zIndex: 300, maxWidth: '90%',
      animation: 'fadeUp .3s', display: 'flex', alignItems: 'center', gap: 10,
      fontFamily: "'DM Sans'", fontSize: 13.5, fontWeight: 700, lineHeight: 1.35,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: sev.color, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <sev.Icon />
      </div>
      <span>{stripEmojis(msg)}</span>
    </div>
  );
}
