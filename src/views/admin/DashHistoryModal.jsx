// src/views/admin/DashHistoryModal.jsx
// HISTORIAL MENSUAL del INICIO (Admin v2, 11-ago-2026): modal oscuro
// centrado (patrón ReasonModal) que abre cada cuadro del dashboard —
// una sección/fila por mes, el más reciente arriba. Los meses de
// compras vienen del RPC get_dash_monthly (migración 20260811; sin
// ella el modal avisa y nada se rompe). El historial de ALTAS de
// miembros se calcula client-side desde custs.registered — el nivel
// mostrado es el ACTUAL de cada miembro (no hay snapshot histórico).
import { sMono, adminTheme as AT } from '../../constants/styles';

const TIER_COLORS = { ORO: '#FFB74D', PLATINO: '#64B5F6', BLACK: '#CE93D8' };
const FUEL_COLORS = { super: '#FF8F3C', regular: '#66BB6A', diesel: '#64B5F6' };
const FUEL_LABELS = { super: 'Súper', regular: 'Regular', diesel: 'Diésel' };
const TITLES = {
  gal: 'Galones — historial mensual',
  ventas: 'Ventas — historial mensual',
  est: 'Ventas por estación — historial mensual',
  fuel: 'Mezcla de combustible — historial mensual',
  mem: 'Altas de miembros — historial mensual',
};

export default function DashHistoryModal({ metric, months, custs, gT, totals, onClose }) {
  if (!metric) return null;

  const monthLabel = (ym) => {
    const [y, m] = ym.split('-');
    const s = new Date(+y, +m - 1, 1).toLocaleDateString('es-GT', { month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  const num = (v) => Math.round(+v || 0).toLocaleString('en-US');

  const loading = months === 'loading';
  const missing = months === 'missing';
  const rows = Array.isArray(months) ? months : [];

  // Altas por mes (client-side)
  let memRows = [];
  if (metric === 'mem') {
    const map = {};
    custs.forEach(c => {
      const ym = (c.registered || '').slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(ym)) return;
      if (!map[ym]) map[ym] = { ym, n: 0, tiers: { ORO: 0, PLATINO: 0, BLACK: 0 } };
      map[ym].n += 1;
      map[ym].tiers[gT(c.gallons).name] += 1;
    });
    memRows = Object.values(map).sort((a, b) => b.ym.localeCompare(a.ym));
  }

  const needsRpc = metric !== 'mem';
  const empty = metric === 'mem' ? memRows.length === 0 : (!loading && !missing && rows.length === 0);

  const info = { fontSize: 12.5, color: '#9E9E9E', fontWeight: 700, lineHeight: 1.6, padding: '18px 0' };
  const mRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, padding: '9px 0', borderBottom: `1px solid ${AT.border}` };
  const mLbl = { fontSize: 12.5, fontWeight: 800, color: '#E0E0E0' };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: AT.bg, border: `1px solid ${AT.border}`, borderRadius: 20, padding: 24, width: '100%', maxWidth: 460, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ fontSize: 17, fontWeight: 900, color: '#fff' }}>{TITLES[metric]}</div>
        {totals?.[metric] && (
          <div style={{ fontSize: 12, color: '#9E9E9E', fontWeight: 700, marginTop: 3, marginBottom: 12 }}>{totals[metric]}</div>
        )}

        {needsRpc && loading && <div style={info}>Cargando historial...</div>}
        {needsRpc && missing && (
          <div style={info}>
            Historial no disponible — falta ejecutar la migración
            20260811_dash_historial_mensual.sql (RPC get_dash_monthly).
          </div>
        )}
        {empty && <div style={info}>Sin registros todavía.</div>}

        {/* Galones / Ventas: una fila por mes */}
        {(metric === 'gal' || metric === 'ventas') && rows.map(r => (
          <div key={r.ym} style={mRow}>
            <span style={mLbl}>{monthLabel(r.ym)}</span>
            <span style={{ textAlign: 'right', flexShrink: 0 }}>
              <span style={{ ...sMono, fontSize: 14, color: metric === 'gal' ? '#fff' : '#FBBC04' }}>
                {metric === 'gal' ? `${num(r.gallons)} gal` : `Q${num(r.amount)}`}
              </span>
              <div style={{ fontSize: 10.5, color: '#777', fontWeight: 700 }}>
                {metric === 'gal'
                  ? `${num(r.purchases)} compras · Q${num(r.amount)}`
                  : `${num(r.gallons)} gal · ${num(r.purchases)} compras`}
              </div>
            </span>
          </div>
        ))}

        {/* Por estación: sección por mes */}
        {metric === 'est' && rows.map(r => (
          <div key={r.ym} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <span style={mLbl}>{monthLabel(r.ym)}</span>
              <span style={{ ...sMono, fontSize: 11.5, color: '#FBBC04' }}>Q{num(r.amount)}</span>
            </div>
            {(r.stations || []).map((s, i) => (
              <div key={s.id || i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '4px 0 4px 10px', fontSize: 12 }}>
                <span style={{ color: '#9E9E9E', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                <span style={{ ...sMono, fontSize: 11.5, color: '#fff', flexShrink: 0 }}>
                  {num(s.gallons)} gal · <span style={{ color: '#FBBC04' }}>Q{num(s.amount)}</span>
                </span>
              </div>
            ))}
            <div style={{ height: 1, background: AT.border, marginTop: 8 }} />
          </div>
        ))}

        {/* Mezcla de combustible: sección por mes */}
        {metric === 'fuel' && rows.map(r => (
          <div key={r.ym} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <span style={mLbl}>{monthLabel(r.ym)}</span>
              <span style={{ ...sMono, fontSize: 11.5, color: '#9E9E9E' }}>{num(r.gallons)} gal</span>
            </div>
            {(r.fuel || []).map(f => (
              <div key={f.fuel_type} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0 4px 10px', fontSize: 12 }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: FUEL_COLORS[f.fuel_type] || '#9E9E9E', flexShrink: 0 }} />
                <span style={{ flex: 1, color: '#9E9E9E', fontWeight: 700 }}>
                  {FUEL_LABELS[f.fuel_type] || (f.fuel_type[0].toUpperCase() + f.fuel_type.slice(1))}
                </span>
                <span style={{ ...sMono, fontSize: 11.5, color: '#fff', flexShrink: 0 }}>
                  {num(f.gallons)} gal · <span style={{ color: '#FBBC04' }}>Q{num(f.amount)}</span>
                </span>
              </div>
            ))}
            <div style={{ height: 1, background: AT.border, marginTop: 8 }} />
          </div>
        ))}

        {/* Altas de miembros: una fila por mes con desglose por nivel */}
        {metric === 'mem' && memRows.length > 0 && (
          <div style={{ fontSize: 10.5, color: '#777', fontWeight: 700, marginBottom: 8, lineHeight: 1.5 }}>
            El desglose usa el nivel ACTUAL de cada miembro (no existe registro del nivel que tenía al inscribirse).
          </div>
        )}
        {metric === 'mem' && memRows.map(r => (
          <div key={r.ym} style={mRow}>
            <span style={mLbl}>{monthLabel(r.ym)}</span>
            <span style={{ textAlign: 'right', flexShrink: 0 }}>
              <span style={{ ...sMono, fontSize: 14, color: '#fff' }}>+{num(r.n)}</span>
              <div style={{ fontSize: 10.5, fontWeight: 800, marginTop: 1 }}>
                {['ORO', 'PLATINO', 'BLACK'].filter(t => r.tiers[t] > 0).map((t, i, arr) => (
                  <span key={t} style={{ color: TIER_COLORS[t] }}>
                    {t} {r.tiers[t]}{i < arr.length - 1 ? <span style={{ color: '#555' }}> · </span> : null}
                  </span>
                ))}
              </div>
            </span>
          </div>
        ))}

        <button onClick={onClose} style={{ marginTop: 16, width: '100%', padding: 13, borderRadius: 12, border: `1px solid ${AT.border}`, background: 'transparent', color: '#9E9E9E', fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
