// src/views/client/RewardQrSheet.jsx
// Bottom sheet del QR único del canje pendiente (25-jul; extraído de
// HistorySheet el 11-ago al refinar el historial — Objetivo #3). El
// operador escanea este código (TK-XXXXXX) y le aparecen los datos
// del cliente y del premio; la entrega se confirma después en este
// dispositivo (flujo Realtime intacto). El panel del QR es SIEMPRE
// blanco (escaneabilidad) con esquinas de escáner en BRAND_ORANGE —
// mismo lenguaje del sheet Código QR.
import { sMono, BRAND_ORANGE } from '../../constants/styles';
import RewardIcon from '../../components/ui/RewardIcon';
import QRCode from '../../components/ui/QRCode';
import { stripEmojis } from '../../lib/text';

export default function RewardQrSheet({ item, closing, onClose, dark, TH, dateLabel }) {
  if (!item) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)',
      zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      animation: closing ? 'ppFadeOut .22s ease forwards' : 'ppFade .2s ease',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: dark ? '#101018' : '#fff',
        borderRadius: '24px 24px 0 0',
        // paddingBottom alto: este sheet vive DENTRO de HistorySheet
        // (zIndex 90, bajo la BottomNav 100) — el círculo QR central
        // sobresale encima, así que el contenido debe librarlo.
        width: '100%', maxWidth: 480, padding: '12px 24px 104px',
        animation: closing ? 'slideDownOut .22s ease-in forwards' : 'slideUp .3s cubic-bezier(.32,1.2,.64,1)',
        textAlign: 'center',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: dark ? 'rgba(255,255,255,.2)' : '#E0E0E0', margin: '0 auto 18px' }} />

        <div style={{
          fontSize: 10.5, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase',
          color: dark ? '#FFD54F' : '#B58000', marginBottom: 8,
        }}>
          Canje pendiente
        </div>
        <div style={{
          width: 56, height: 56, borderRadius: 16, margin: '0 auto 10px',
          background: TH.chipOn, color: TH.chipInk,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ transform: 'scale(1.4)', lineHeight: 0 }}><RewardIcon reward={item.reward} /></div>
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: TH.header }}>{stripEmojis(item.reward?.name) || 'Premio'}</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: TH.sub, marginTop: 3 }}>
          {dateLabel} · -{item.cost} pts
        </div>
        {/* D22: vencimiento del premio de rifa (los canjes normales no expiran) */}
        {item.expiresAt && (
          <div style={{ fontSize: 11.5, fontWeight: 800, marginTop: 5, color: dark ? '#FFD54F' : '#B58000' }}>
            Válido hasta el {new Date(item.expiresAt).toLocaleDateString('es-GT', { day: 'numeric', month: 'long' })}
          </div>
        )}

        {/* QR sobre panel blanco con esquinas de escáner */}
        <div style={{ position: 'relative', width: 194, margin: '18px auto 12px', padding: 12, background: '#fff', borderRadius: 16 }}>
          {[
            { top: -6, left: -6, borderTop: `3px solid ${BRAND_ORANGE}`, borderLeft: `3px solid ${BRAND_ORANGE}`, borderTopLeftRadius: 14 },
            { top: -6, right: -6, borderTop: `3px solid ${BRAND_ORANGE}`, borderRight: `3px solid ${BRAND_ORANGE}`, borderTopRightRadius: 14 },
            { bottom: -6, left: -6, borderBottom: `3px solid ${BRAND_ORANGE}`, borderLeft: `3px solid ${BRAND_ORANGE}`, borderBottomLeftRadius: 14 },
            { bottom: -6, right: -6, borderBottom: `3px solid ${BRAND_ORANGE}`, borderRight: `3px solid ${BRAND_ORANGE}`, borderBottomRightRadius: 14 },
          ].map((s, ci) => <div key={ci} style={{ position: 'absolute', width: 28, height: 28, ...s }} />)}
          <QRCode code={item.code} sz={170} />
        </div>

        <div style={{
          ...sMono, display: 'inline-block', fontSize: 13, fontWeight: 800, letterSpacing: 1.5,
          padding: '8px 14px', borderRadius: 10,
          background: dark ? 'rgba(255,255,255,.08)' : '#F5F5F7',
          color: TH.header,
        }}>
          {item.code}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: TH.sub, lineHeight: 1.6, marginTop: 12, padding: '0 8px' }}>
          Mostrá este código al operador para recibir tu premio. Después de que lo escanee, confirmás la entrega en este dispositivo.
        </div>
      </div>
    </div>
  );
}
