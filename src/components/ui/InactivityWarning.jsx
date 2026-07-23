// src/components/ui/InactivityWarning.jsx
// Aviso de degradación por inactividad (FORMATO GENERAL): flat sin
// emojis ni borde — disco de color por severidad con icono Warn SVG.
import { Warn } from './Icons';
import { daysInactive } from '../../lib/tierSystem';

export default function InactivityWarning({ lastBuy }) {
  const d = daysInactive(lastBuy);
  if (d < 20) return null;

  const col = d >= 75 ? '#C62828' : d >= 55 ? '#E65100' : d >= 25 ? '#F57F17' : '#757575';
  const soft = d >= 75 ? '#FFEBEE' : d >= 55 ? '#FFF3E0' : '#FFF8E1';
  const msg = d >= 90 ? 'Puntos perdidos por inactividad'
    : d >= 75 ? `¡Tus puntos se pierden en ${90 - d} días!`
    : d >= 55 ? `Tu nivel baja a ORO en ${60 - d} días`
    : d >= 25 ? `Tu nivel baja en ${30 - d} días`
    : '';

  if (!msg) return null;

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
