// src/views/client/menu/PhoneChangeSection.jsx
// Teléfono en Mi Cuenta (8-ago-2026 v2, cambio de método del dueño):
// el número se muestra BLOQUEADO y el cambio se SOLICITA por WhatsApp
// al canal de asistencia (mensaje pre-escrito con el número actual);
// el ADMIN verifica la identidad y aplica el cambio desde la ficha
// del miembro (update_member_with_audit — flujo auditado existente).
// update_my_profile rechaza cambios de phone server-side. La
// verificación OTP quedó SOLO para el registro (PhoneVerifyStep).
import { inputFlat, BRAND_ORANGE } from '../../../constants/styles';
import { Phone, Lock, Whatsapp } from '../../../components/ui/Icons';
import { phoneMask } from '../../../lib/inputMasks';

export default function PhoneChangeSection({ ctx, TH }) {
  const { me, cfg } = ctx;

  const field = { ...inputFlat, background: TH.isDark ? 'rgba(255,255,255,.08)' : '#fff', color: TH.header, paddingLeft: 44 };
  const label = { fontSize: 11, fontWeight: 800, color: TH.sub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 };
  const iconL = { position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: TH.sub, display: 'flex', zIndex: 1 };

  // Mismo canal de asistencia de la recuperación de contraseña (4-ago)
  const requestChange = () => {
    const support = (cfg?.supportPhone || '49741067').replace(/\D/g, '');
    const current = me?.phone ? phoneMask.format(me.phone) : '—';
    const msg = `Hola, soy ${me?.name || ''} y quiero cambiar el número de teléfono de mi cuenta Puntos Plus. Mi número actual es ${current}. Mi número nuevo es: `;
    window.open(`https://wa.me/502${support}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  };

  return (
    <div style={{ marginBottom: 14 }}>
      {/* Número actual — bloqueado como el DPI */}
      <div style={label}>Teléfono</div>
      <div style={{ ...field, display: 'flex', alignItems: 'center', color: TH.sub, position: 'relative' }}>
        <div style={iconL}><Phone /></div>
        <span style={{ flex: 1, fontVariantNumeric: 'tabular-nums' }}>{me?.phone ? phoneMask.format(me.phone) : '—'}</span>
        <span style={{ display: 'flex', color: TH.sub, opacity: .6 }}><Lock /></span>
      </div>

      <button onClick={requestChange}
        style={{ width: '100%', marginTop: 8, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, border: 'none', background: TH.surface, fontFamily: "'DM Sans'", cursor: 'pointer', textAlign: 'left' }}>
        <div style={{ width: 36, height: 36, borderRadius: 11, background: '#25D366', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Whatsapp size={18} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: TH.header }}>Solicitar cambio de número</div>
          <div style={{ fontSize: 11, color: TH.sub, marginTop: 2 }}>
            Escribinos por WhatsApp — verificamos tu identidad y lo cambiamos por vos
          </div>
        </div>
        <span style={{ color: BRAND_ORANGE, fontSize: 12, fontWeight: 800, flexShrink: 0 }}>Abrir chat</span>
      </button>
    </div>
  );
}
