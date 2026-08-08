// src/components/ui/PeriodPicker.jsx
// Grupo "Período" compartido (8-ago-2026) — extraído de la vista
// Miembros (consulta de consumo) para reutilizarlo en todo el grupo
// Análisis del panel de administrador. Presets: Todo / Este mes /
// Mes anterior / Fechas específicas (dos date inputs dark). Las
// fechas se resuelven SERVER-SIDE en día calendario de Guatemala —
// este componente solo entrega strings 'YYYY-MM-DD' o null.
import { adminTheme as AT } from '../../constants/styles';

const fmtD = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Resuelve el preset a {from, to} para los RPCs (null = sin límite).
export function rangeFromPreset(preset, from, to) {
  const now = new Date();
  if (preset === 'month') return { from: fmtD(new Date(now.getFullYear(), now.getMonth(), 1)), to: null };
  if (preset === 'prev') return {
    from: fmtD(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
    to: fmtD(new Date(now.getFullYear(), now.getMonth(), 0)),
  };
  if (preset === 'custom') return { from: from || null, to: to || null };
  return { from: null, to: null };
}

export default function PeriodPicker({ preset, setPreset, from, setFrom, to, setTo, label = 'Período' }) {
  const groupLbl = { fontSize: 10, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: '#777', marginBottom: 6 };
  const chipSoft = (on) => ({
    padding: '7px 14px', borderRadius: 10, cursor: 'pointer', whiteSpace: 'nowrap',
    border: `1px solid ${on ? '#FBBC04' : AT.border}`,
    background: on ? 'rgba(251,188,4,.15)' : AT.card,
    color: on ? '#FBBC04' : '#9E9E9E',
    fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 700,
  });
  const dateInput = {
    padding: '6px 10px', borderRadius: 10, border: `1px solid ${AT.border}`,
    background: '#1E1E1E', color: '#fff', fontFamily: "'DM Sans'", fontSize: 12, colorScheme: 'dark',
  };

  return (
    <div>
      <div style={groupLbl}>{label}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => setPreset('all')} style={chipSoft(preset === 'all')}>Todo</button>
        <button onClick={() => setPreset('month')} style={chipSoft(preset === 'month')}>Este mes</button>
        <button onClick={() => setPreset('prev')} style={chipSoft(preset === 'prev')}>Mes anterior</button>
        <button onClick={() => setPreset('custom')} style={chipSoft(preset === 'custom')}>Fechas específicas</button>
        {preset === 'custom' && (
          <>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={dateInput} />
            <span style={{ fontSize: 11, color: '#777', fontWeight: 700 }}>a</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} style={dateInput} />
          </>
        )}
      </div>
    </div>
  );
}
