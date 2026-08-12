// src/components/RedeemConfirmRequestModal.jsx
// Modal en el dispositivo del MIEMBRO cuando el operador (o el POS de
// PROPER) solicita confirmar la entrega de un canje — FORMATO GENERAL:
// flat sin sombra, RewardIcon en cuadro de su categoría, kicker naranja,
// CTA BRAND_ORANGE. Extraído de App.jsx (división etapa 1, 12-ago-2026)
// sin cambios de lógica: la respuesta viaja por RPC con la sesión del
// miembro (SEC.C.3, respond_redemption_confirm).
import RewardIcon from './ui/RewardIcon';
import { bento, BRAND_ORANGE, CAT_COLORS } from '../constants/styles';
import { respondRedemptionConfirm } from '../services';

export default function RedeemConfirmRequestModal({ pending, dark, fire, onClose, onConfirmed }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)',
      zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 24px', animation: 'ppFade .25s ease',
    }}>
      <div style={{
        background: dark ? '#101018' : '#fff',
        borderRadius: 24, width: '100%', maxWidth: 400, padding: '28px 22px',
        animation: 'pop .3s cubic-bezier(.32,1.2,.64,1)',
      }}>
        {/* Héroe: ícono SVG del premio en cuadro de su categoría */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 12px',
            background: CAT_COLORS[pending.reward?.cat] || '#5E5E63', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <RewardIcon reward={pending.reward || { name: pending.rewardName }} />
          </div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: BRAND_ORANGE, marginBottom: 4 }}>
            Solicitud de Canje
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: dark ? '#fff' : '#0D0D0D', lineHeight: 1.2 }}>
            ¿Confirmás este canje?
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#9E9E9E', marginTop: 6 }}>
            El operador está listo para entregarte este premio
          </div>
        </div>

        {/* Detalle — filas flat con divisor */}
        <div style={{ background: dark ? 'rgba(255,255,255,.05)' : '#F5F5F7', borderRadius: 16, padding: '14px 18px', marginBottom: 20 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            paddingBottom: 12, marginBottom: 12,
            borderBottom: `1px solid ${dark ? 'rgba(255,255,255,.06)' : '#ECECEE'}`,
          }}>
            <span style={{ fontSize: 13, color: '#9E9E9E', fontWeight: 600 }}>Premio</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: dark ? '#fff' : '#0D0D0D' }}>{pending.rewardName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#9E9E9E', fontWeight: 600 }}>Puntos a descontar</span>
            <span style={{ fontSize: 16, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: dark ? '#FF8A80' : bento.red }}>-{pending.cost} pts</span>
          </div>
        </div>

        {/* Botones — acción sólida naranja, cancelar flat */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={async () => {
            // SEC.C.3: la respuesta viaja por RPC con la sesión del miembro.
            const res = await respondRedemptionConfirm(pending.redemptionId, false);
            onClose();
            if (res.error) fire(res.error, 'warn');
            else fire('Canje cancelado', 'info');
          }} style={{
            flex: 1, padding: 16, borderRadius: 14, border: 'none',
            background: dark ? 'rgba(255,255,255,.08)' : '#F5F5F7',
            color: dark ? '#ccc' : '#424242',
            fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>Cancelar</button>
          <button onClick={async () => {
            const res = await respondRedemptionConfirm(pending.redemptionId, true);
            onClose();
            if (res.error) { fire(res.error, 'warn'); return; }
            fire('¡Canje confirmado!', 'success');
            // App: cierra el QR del premio si quedó abierto (pedido del
            // dueño 29-jul) y recarga los canjes cuando el POS entregue.
            onConfirmed();
          }} style={{
            flex: 2, padding: 16, borderRadius: 14, border: 'none',
            background: BRAND_ORANGE, color: '#fff',
            fontFamily: "'DM Sans'", fontSize: 15, fontWeight: 800, cursor: 'pointer',
          }}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}
