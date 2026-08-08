// src/views/admin/analytics/AnIntegridad.jsx
// ANÁLISIS → Integridad (8-ago-2026) — consultas de INVESTIGACIÓN
// INTERNA (pedido del dueño), separadas de las consultas comerciales:
//  · Compras repetidas: ≥N compras del mismo miembro el mismo día
//    calendario de Guatemala, con detalle de hora/estación/operador.
//  · Afinidad operador–cliente: un mismo operador registra ≥X% de
//    las compras de un miembro (concentración sospechosa).
//  · Cuentas del personal: cuentas de miembro que coinciden con un
//    operador/admin por DPI exacto (members.dpi es UNIQUE) o por
//    nombre exacto normalizado (señal secundaria).
// Cada ejecución queda AUDITADA server-side (log_admin_action,
// acción 'consulta_integridad') — visible en Sistema → Auditoría.
import { useState, useEffect } from 'react';
import { sMono, adminTheme as AT } from '../../../constants/styles';
import PeriodPicker, { rangeFromPreset } from '../../../components/ui/PeriodPicker';
import { rpcReport, fmtInt, groupLbl, chip, chipSoft, cardBox, AnHeader, AnStatus, downloadCSV, CsvButton } from './anShared';

const QUERIES = [
  { id: 'repetidos', label: 'Compras repetidas' },
  { id: 'afinidad',  label: 'Afinidad operador–cliente' },
  { id: 'personal',  label: 'Cuentas del personal' },
];

export default function AnIntegridad() {
  const [query, setQuery] = useState('repetidos');
  const [preset, setPreset] = useState('month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [minBuys, setMinBuys] = useState(2);   // repetidos: mínimo por día
  const [minPct, setMinPct] = useState(70);    // afinidad: % mínimo
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    const { from: f, to: t } = rangeFromPreset(preset, from, to);
    setError(null);
    setRows(null);
    const call = query === 'repetidos'
      ? rpcReport('report_integridad_repetidos', { p_from: f, p_to: t, p_min: minBuys })
      : query === 'afinidad'
        ? rpcReport('report_integridad_afinidad', { p_from: f, p_to: t, p_min_compras: 5, p_min_pct: minPct })
        : rpcReport('report_integridad_cuentas_personal', {});
    call.then(({ data, error: e }) => {
      if (!alive) return;
      if (e) { setError(e); setRows([]); return; }
      setRows(Array.isArray(data) ? data : []);
    });
    return () => { alive = false; };
  }, [query, preset, from, to, minBuys, minPct]);

  const exportCsv = () => {
    const period = preset === 'all' ? 'todo' : preset;
    if (query === 'repetidos') {
      downloadCSV(`integridad-repetidos-${period}.csv`,
        ['Miembro', 'Teléfono', 'Día', 'Compras', 'Galones', 'Quetzales', 'Detalle'],
        (rows || []).map(r => [r.member_name, r.phone || '', r.day, r.purchases, r.gallons, r.amount,
          (r.detail || []).map(d => `${d.time} ${d.station || '—'} (${d.operator || '—'}) ${d.gallons}gal Q${d.amount}`).join(' | ')]));
    } else if (query === 'afinidad') {
      downloadCSV(`integridad-afinidad-${period}.csv`,
        ['Miembro', 'Teléfono', 'Operador', 'Compras con el operador', 'Compras totales', '%', 'Galones', 'Quetzales'],
        (rows || []).map(r => [r.member_name, r.phone || '', r.operator_name, r.pair_purchases, r.member_purchases, r.pct, r.gallons, r.amount]));
    } else {
      downloadCSV('integridad-cuentas-personal.csv',
        ['Rol', 'Personal', 'Usuario/Correo', 'Activo', 'Coincidencia', 'Cuenta de miembro', 'Teléfono', 'Puntos', 'Galones', 'Quetzales', 'Visitas', 'Última compra'],
        (rows || []).map(r => [r.role, r.staff_name, r.staff_ref || '', r.staff_active ? 'Sí' : 'No', r.match_type,
          r.member_name, r.phone || '', r.points, r.gallons, r.spent, r.visits, r.last_buy ? String(r.last_buy).slice(0, 10) : '']));
    }
  };

  const statCell = (v, cap, color = '#E0E0E0') => (
    <div style={{ textAlign: 'right', minWidth: 58 }}>
      <div style={{ ...sMono, fontSize: 13, fontWeight: 800, color }}>{v}</div>
      <div style={{ fontSize: 9, color: '#777', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5 }}>{cap}</div>
    </div>
  );
  const rowBox = {
    background: AT.card, border: `1px solid ${AT.border}`,
    borderRadius: 16, padding: '12px 16px', marginBottom: 10,
  };

  return (
    <div style={{ padding: '22px 22px 60px' }}>
      <AnHeader title="Análisis · Integridad"
        subtitle="Señales para investigación interna — una coincidencia NO prueba una irregularidad por sí sola" />

      {/* Aviso de uso interno + auditoría */}
      <div style={{
        background: 'rgba(229,115,115,.08)', border: '1px solid rgba(229,115,115,.35)',
        borderRadius: 14, padding: '10px 14px', marginBottom: 16,
        fontSize: 11.5, color: '#E57373', fontWeight: 700, lineHeight: 1.5,
      }}>
        Uso interno. Cada ejecución de estas consultas queda registrada en la Auditoría
        (quién la corrió, cuándo y con qué parámetros).
      </div>

      <div style={cardBox}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, rowGap: 14 }}>
          <div>
            <div style={groupLbl}>Consulta</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {QUERIES.map(qq => (
                <button key={qq.id} onClick={() => setQuery(qq.id)} style={chip(query === qq.id)}>{qq.label}</button>
              ))}
            </div>
          </div>

          {query === 'repetidos' && (
            <div>
              <div style={groupLbl}>Mínimo de compras por día</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[2, 3, 4].map(n => (
                  <button key={n} onClick={() => setMinBuys(n)} style={chipSoft(minBuys === n)}>{n}+</button>
                ))}
              </div>
            </div>
          )}

          {query === 'afinidad' && (
            <div>
              <div style={groupLbl}>Concentración mínima</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[50, 70, 90].map(n => (
                  <button key={n} onClick={() => setMinPct(n)} style={chipSoft(minPct === n)}>{n}%</button>
                ))}
              </div>
            </div>
          )}

          {query !== 'personal' && (
            <PeriodPicker preset={preset} setPreset={setPreset} from={from} setFrom={setFrom} to={to} setTo={setTo} />
          )}
          <CsvButton onClick={exportCsv} disabled={!rows?.length} />
        </div>

        <div style={{ fontSize: 11, color: '#777', fontWeight: 600, lineHeight: 1.5, marginTop: 12 }}>
          {query === 'repetidos' && 'Miembros con varias compras registradas el MISMO día (día calendario de Guatemala). Revisá el detalle: horas muy seguidas con el mismo operador son la señal fuerte.'}
          {query === 'afinidad' && 'Pares donde un mismo operador registra la mayoría de las compras de un miembro (mínimo 5 compras en el período). En estaciones pequeñas cierta concentración es normal — el % alto con montos altos es lo que hay que revisar.'}
          {query === 'personal' && 'Cuentas de miembro que coinciden con el personal por DPI (coincidencia firme) o solo por nombre (puede ser un homónimo). Tener cuenta NO es una falta — esta lista es solo el punto de partida de la investigación.'}
        </div>
      </div>

      <AnStatus loading={!rows && !error} error={error}
        empty={rows && !rows.length} emptyMsg="Sin coincidencias con los criterios elegidos" />

      {/* ── Compras repetidas ── */}
      {query === 'repetidos' && (rows || []).map((r, i) => (
        <div key={`${r.member_id}-${r.day}-${i}`} style={rowBox}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 170 }}>
              <div style={{ fontWeight: 800, fontSize: 13.5, color: '#E0E0E0' }}>{r.member_name}</div>
              <div style={{ fontSize: 10.5, color: '#777', marginTop: 2, ...sMono }}>
                {r.day}{r.phone ? ` · ${r.phone}` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              {statCell(fmtInt(r.purchases), 'compras', '#E57373')}
              {statCell(fmtInt(r.gallons), 'gal')}
              {statCell(`Q${fmtInt(r.amount)}`, 'quetzales')}
            </div>
          </div>
          <div style={{ marginTop: 8, borderTop: `1px solid ${AT.border}`, paddingTop: 8 }}>
            {(r.detail || []).map((d, j) => (
              <div key={j} style={{ ...sMono, fontSize: 10.5, color: '#9E9E9E', padding: '2px 0' }}>
                {d.time} · {d.station || '—'} · {d.operator || 'sin operador'} · {d.gallons} gal · Q{fmtInt(d.amount)}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* ── Afinidad operador–cliente ── */}
      {query === 'afinidad' && (rows || []).map((r, i) => (
        <div key={`${r.member_id}-${r.operator_id}-${i}`} style={{ ...rowBox, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 800, fontSize: 13.5, color: '#E0E0E0' }}>{r.member_name}</div>
            <div style={{ fontSize: 10.5, color: '#777', marginTop: 2 }}>
              atendido por <span style={{ color: '#FBBC04', fontWeight: 800 }}>{r.operator_name}</span>
              {r.phone ? <span style={{ ...sMono }}> · {r.phone}</span> : null}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {statCell(`${r.pct}%`, 'concentración', +r.pct >= 90 ? '#E57373' : '#FBBC04')}
            {statCell(`${fmtInt(r.pair_purchases)}/${fmtInt(r.member_purchases)}`, 'compras')}
            {statCell(fmtInt(r.gallons), 'gal')}
            {statCell(`Q${fmtInt(r.amount)}`, 'quetzales')}
          </div>
        </div>
      ))}

      {/* ── Cuentas del personal ── */}
      {query === 'personal' && (rows || []).map((r, i) => (
        <div key={`${r.member_id}-${i}`} style={{ ...rowBox, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, fontSize: 13.5, color: '#E0E0E0' }}>{r.staff_name}</span>
              <span style={{ fontSize: 9, fontWeight: 800, background: 'rgba(255,255,255,.08)', color: '#aaa', padding: '2px 7px', borderRadius: 6, letterSpacing: .5, textTransform: 'uppercase' }}>{r.role}</span>
              <span style={{
                fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 6, letterSpacing: .5,
                background: r.match_type === 'DPI' ? 'rgba(229,115,115,.15)' : 'rgba(251,188,4,.15)',
                color: r.match_type === 'DPI' ? '#E57373' : '#FBBC04',
              }}>
                {r.match_type === 'DPI' ? 'DPI' : 'SOLO NOMBRE'}
              </span>
            </div>
            <div style={{ fontSize: 10.5, color: '#777', marginTop: 3, ...sMono }}>
              {r.staff_ref || '—'} · cuenta de miembro: {r.member_name}{r.phone ? ` · ${r.phone}` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {statCell(fmtInt(r.points), 'puntos', '#FBBC04')}
            {statCell(fmtInt(r.gallons), 'gal')}
            {statCell(`Q${fmtInt(r.spent)}`, 'quetzales')}
            {statCell(fmtInt(r.visits), 'visitas')}
            {statCell(r.last_buy ? String(r.last_buy).slice(0, 10) : '—', 'última compra')}
          </div>
        </div>
      ))}
    </div>
  );
}
