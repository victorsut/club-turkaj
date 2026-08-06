// src/components/RaffleWinnerModal.jsx
// R1b.4 Rifa — Modal de felicitación al ganador del sorteo mensual
// (análogo al modal de bono por día festivo). Aparece UNA sola vez por
// rifa ganada (flag en localStorage, lo maneja App.jsx) la primera vez
// que el ganador abre la app tras el sorteo — típicamente al día
// siguiente del cierre del mes. FORMATO GENERAL: flat, sin emojis;
// imagen real del premio si existe, si no el ícono SVG adecuado.
import { BRAND_ORANGE } from '../constants/styles';
import { rewardIconFor } from './ui/RewardIcon';
import useBackLayer from '../hooks/useBackLayer';

export default function RaffleWinnerModal({ cal, name, stations = [], isBlack = false, onClose }) {
  // Botón físico de volver: cierra el modal (y marca la rifa como vista).
  useBackLayer(!!cal, onClose);
  if (!cal) return null;
  const PrizeIcon = rewardIconFor({ name: cal.name || '', icon: cal.icon || '' });
  const firstName = (name || '').trim().split(' ')[0] || 'cliente';

  // D22: plazo y estación de reclamo — defaults 15 días y la primera
  // estación (Turkaj 1); el vencimiento corre desde el sorteo (drawnAt),
  // igual que el expires_at que estampa draw_due_raffles.
  const claimStation = (stations.find(s => s.id === cal.claimStationId) || stations[0])?.name || null;
  const deadline = cal.drawnAt
    ? new Date(new Date(cal.drawnAt).getTime() + (cal.claimDays ?? 15) * 86400000)
    : null;
  const deadlineTxt = deadline
    ? deadline.toLocaleDateString('es-GT', { day: 'numeric', month: 'long' })
    : null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)',
      zIndex: 320, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, animation: 'ppFade .25s ease',
    }}>
      <div className="pp-grow" style={{
        background: isBlack ? '#101018' : '#fff',
        borderRadius: 24, maxWidth: 360, width: '100%', padding: '26px 22px',
        textAlign: 'center',
      }}>
        {/* Banda kicker de celebración */}
        <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: BRAND_ORANGE }}>
          Rifa de {cal.m}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: isBlack ? '#fff' : '#0D0D0D', marginTop: 4 }}>
          ¡Felicidades, {firstName}!
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: isBlack ? 'rgba(255,255,255,.55)' : '#6E6E73', marginTop: 2, marginBottom: 16 }}>
          Ganaste el sorteo de este mes
        </div>

        {/* Premio: imagen real o ícono SVG en cuadro naranja */}
        {cal.img ? (
          <img src={cal.img} alt={cal.name || 'Premio'} style={{
            width: '100%', maxWidth: 240, aspectRatio: '4 / 3', objectFit: 'cover',
            borderRadius: 16, margin: '0 auto 12px', display: 'block',
          }} />
        ) : (
          <div style={{
            width: 64, height: 64, borderRadius: 18, margin: '0 auto 12px',
            background: BRAND_ORANGE, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ transform: 'scale(1.6)', lineHeight: 0 }}><PrizeIcon /></div>
          </div>
        )}
        <div style={{ fontSize: 18, fontWeight: 800, color: isBlack ? '#fff' : '#0D0D0D' }}>
          {cal.name || 'Premio'}
        </div>
        {cal.v && cal.v !== 'Q0' && (
          <div style={{ fontSize: 12.5, fontWeight: 700, color: isBlack ? 'rgba(255,255,255,.55)' : '#6E6E73', marginTop: 2 }}>
            Valorado en {cal.v}
          </div>
        )}

        {/* Cómo recibirlo: detalle configurado por la empresa
            (raffle_calendar.prize_detail — solo lo ve el ganador) o
            texto genérico si no hay detalle */}
        {cal.detail ? (
          <div style={{
            background: isBlack ? 'rgba(255,255,255,.06)' : '#F5F5F7',
            borderRadius: 14, padding: '12px 14px', margin: '16px 0 18px', textAlign: 'left',
          }}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: '#9E9E9E', marginBottom: 6 }}>
              Detalle del premio
            </div>
            <div style={{
              maxHeight: 150, overflowY: 'auto',
              fontSize: 12.5, fontWeight: 600, lineHeight: 1.55, whiteSpace: 'pre-line',
              color: isBlack ? '#CFCFCF' : '#48484A',
            }}>
              {cal.detail}
            </div>
          </div>
        ) : (
          <div style={{
            background: isBlack ? 'rgba(255,255,255,.06)' : '#F5F5F7',
            borderRadius: 14, padding: '12px 14px', margin: '16px 0 18px',
            fontSize: 12.5, fontWeight: 600, lineHeight: 1.55,
            color: isBlack ? '#CFCFCF' : '#48484A',
          }}>
            Tu premio ya está en tus canjes pendientes. Presentá el código
            {claimStation ? ` en ${claimStation}` : ' en la estación'} para recibirlo.
          </div>
        )}

        {/* D22: dónde y hasta cuándo reclamar */}
        {(claimStation || deadlineTxt) && (
          <div style={{
            fontSize: 12, fontWeight: 800, color: BRAND_ORANGE,
            marginTop: -8, marginBottom: 16, lineHeight: 1.5,
          }}>
            Reclamalo{claimStation ? ` en ${claimStation}` : ''}
            {deadlineTxt ? ` antes del ${deadlineTxt}` : ''}
          </div>
        )}

        <button onClick={onClose} style={{
          width: '100%', padding: 15, borderRadius: 14, border: 'none',
          background: BRAND_ORANGE, color: '#fff',
          fontFamily: "'DM Sans'", fontSize: 15, fontWeight: 800, cursor: 'pointer',
        }}>
          Entendido
        </button>
      </div>
    </div>
  );
}
