// src/components/ui/InactivityWarning.jsx
import { Warn } from './Icons';
import { daysInactive } from '../../lib/tierSystem';

export default function InactivityWarning({ lastBuy }) {
  const d = daysInactive(lastBuy);
  if (d < 20) return null;

  const col = d >= 75 ? '#C62828' : d >= 55 ? '#E65100' : d >= 25 ? '#F57F17' : '#757575';
  const msg = d >= 90 ? '💀 Puntos perdidos por inactividad'
    : d >= 75 ? `🔴 ¡Puntos se pierden en ${90 - d} días!`
    : d >= 55 ? `🚨 Nivel baja a ORO en ${60 - d} días`
    : d >= 25 ? `⚠️ Nivel baja en ${30 - d} días`
    : '';

  if (!msg) return null;

  return (
    <div style={{
      margin: '8px 20px', padding: '12px 16px',
      background: d >= 75 ? '#FFEBEE' : d >= 55 ? '#FFF3E0' : '#FFF8E1',
      borderRadius: 14, borderLeft: `3px solid ${col}`,
      fontSize: 13, fontWeight: 700, color: col,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <Warn /> {msg}
    </div>
  );
}
