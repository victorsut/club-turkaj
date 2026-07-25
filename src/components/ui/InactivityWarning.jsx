// src/components/ui/InactivityWarning.jsx
// Aviso de degradación por inactividad (FORMATO GENERAL): flat sin
// emojis ni borde — disco de color por severidad con icono Warn SVG.
// Umbrales alineados al motor real (25-jul, apply_due_degradations):
// 15 días de gracia; desde el día 16 los galones bajan a diario
// (−1, −3, −6… desde el umbral del nivel); ORO nativo solo pierde
// todo a los 45 días.
import { Warn } from './Icons';
import { daysInactive } from '../../lib/tierSystem';

export default function InactivityWarning({ lastBuy, tierName = 'ORO' }) {
  const d = daysInactive(lastBuy);
  if (!lastBuy || d < 10) return null;

  let col, soft, msg;
  if (tierName === 'ORO') {
    // Sin nivel que perder: solo el reinicio de los 45 días.
    if (d < 35 || d >= 45) return null;
    col = '#C62828'; soft = '#FFEBEE';
    msg = `Tus puntos se pierden en ${45 - d} día${45 - d === 1 ? '' : 's'} por inactividad`;
  } else if (d >= 16) {
    col = '#C62828'; soft = '#FFEBEE';
    msg = 'Estás perdiendo nivel y galones por inactividad — cualquier compra lo detiene';
  } else {
    col = '#F57F17'; soft = '#FFF8E1';
    msg = `Tu nivel empieza a bajar en ${16 - d} día${16 - d === 1 ? '' : 's'} por inactividad`;
  }

  return (
    <div style={{
      margin: '8px 16px 0', padding: '10px 14px',
      background: soft, borderRadius: 16,
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{ width: 32, height: 32, borderRadius: 10, background: col, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Warn />
      </div>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: col }}>{msg}</span>
    </div>
  );
}
