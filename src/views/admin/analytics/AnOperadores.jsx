// src/views/admin/analytics/AnOperadores.jsx
// ANÁLISIS → Operadores (8-ago-2026): productividad (compras,
// galones, Q), rating promedio CON conteo de calificaciones (un 5.0
// con 3 votos no debe leerse igual que un 4.7 con 200) y canjes
// entregados, por operador y período. RPC report_operadores. La
// estación mostrada es referencial (modelo operador-por-factura).
import { useState, useEffect } from 'react';
import { sMono, adminTheme as AT } from '../../../constants/styles';
import { StarLine } from '../../../components/ui/Icons';
import PeriodPicker, { rangeFromPreset } from '../../../components/ui/PeriodPicker';
import { rpcReport, fmtInt, fmtGal, groupLbl, chip, chipSoft, cardBox, AnHeader, AnStatus, downloadCSV, CsvButton } from './anShared';

const SORTS = [
  { id: 'gallons',    label: 'Galones' },
  { id: 'purchases',  label: 'Registros' },
  { id: 'rating',     label: 'Rating' },
  { id: 'deliveries', label: 'Entregas' },
];

export default function AnOperadores(ctx) {
  const { stations = [] } = ctx;

  const [sort, setSort] = useState('gallons');
  const [stationId, setStationId] = useState(null);
  const [preset, setPreset] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    const { from: f, to: t } = rangeFromPreset(preset, from, to);
    setError(null);
    setRows(null);
    rpcReport('report_operadores', { p_from: f, p_to: t, p_station: stationId })
      .then(({ data, error: e }) => {
        if (!alive) return;
        if (e) { setError(e); setRows([]); return; }
        setRows(Array.isArray(data) ? data : []);
      });
    return () => { alive = false; };
  }, [stationId, preset, from, to]);

  // Orden client-side. Rating con MENOS de 3 calificaciones se manda
  // al fondo del orden por rating (muestra igual, pero no compite).
  const sorted = [...(rows || [])].sort((a, b) => {
    if (sort === 'rating') {
      const ar = (a.rating_count || 0) >= 3 ? +a.rating_avg : -1;
      const br = (b.rating_count || 0) >= 3 ? +b.rating_avg : -1;
      return br - ar || (b.rating_count || 0) - (a.rating_count || 0);
    }
    const key = sort === 'purchases' ? 'purchases' : sort === 'deliveries' ? 'deliveries' : 'gallons';
    return (+b[key] || 0) - (+a[key] || 0);
  });

  const exportCsv = () => downloadCSV(`operadores-${preset === 'all' ? 'todo' : preset}.csv`,
    ['Operador', 'Usuario', 'Activo', 'PROPER', 'Estación', 'Registros', 'Miembros', 'Galones', 'Quetzales', 'Puntos', 'Rating', 'Calificaciones', 'Entregas'],
    sorted.map(r => [r.name, r.username, r.active ? 'Sí' : 'No', r.is_proper ? 'Sí' : 'No', r.station_name || '',
      r.purchases, r.members, r.gallons, r.amount, r.points, r.rating_avg ?? '', r.rating_count, r.deliveries]));

  const statCell = (v, cap) => (
    <div style={{ textAlign: 'right', minWidth: 58 }}>
      <div style={{ ...sMono, fontSize: 13, fontWeight: 800, color: '#E0E0E0' }}>{v}</div>
      <div style={{ fontSize: 9, color: '#777', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5 }}>{cap}</div>
    </div>
  );

  return (
    <div style={{ padding: '22px 22px 60px' }}>
      <AnHeader title="Análisis · Operadores"
        subtitle={`${sorted.length.toLocaleString('en-US')} operadores — productividad, rating y entregas por período`} />

      <div style={cardBox}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, rowGap: 14 }}>
          <div>
            <div style={groupLbl}>Ordenar por</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SORTS.map(s => (
                <button key={s.id} onClick={() => setSort(s.id)} style={chip(sort === s.id)}>{s.label}</button>
              ))}
            </div>
          </div>

          <div>
            <div style={groupLbl}>Estación de la compra</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button onClick={() => setStationId(null)} style={chipSoft(!stationId)}>Todas</button>
              {stations.map(s => (
                <button key={s.id} onClick={() => setStationId(s.id)} style={chipSoft(stationId === s.id)}>{s.name}</button>
              ))}
            </div>
          </div>

          <PeriodPicker preset={preset} setPreset={setPreset} from={from} setFrom={setFrom} to={to} setTo={setTo} />
          <CsvButton onClick={exportCsv} disabled={!sorted.length} />
        </div>

        <div style={{ fontSize: 11, color: '#777', fontWeight: 600, lineHeight: 1.5, marginTop: 12 }}>
          El rating es el promedio de las calificaciones RECIBIDAS en el período; con menos de 3
          calificaciones no compite en el orden por rating. La estación del operador es referencial
          (última donde despachó) — el filtro aplica a las compras.
        </div>
      </div>

      <AnStatus loading={!rows && !error} error={error} empty={rows && !sorted.length} />

      {sorted.length > 0 && sorted.map((r, i) => (
        <div key={r.id} style={{
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          background: AT.card, border: `1px solid ${AT.border}`,
          borderRadius: 16, padding: '12px 16px', marginBottom: 10,
          opacity: r.active ? 1 : .55,
        }}>
          <div style={{ width: 24, textAlign: 'center', flexShrink: 0, ...sMono, fontSize: 11, fontWeight: 800, color: i < 3 ? '#FBBC04' : '#555' }}>{i + 1}</div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, fontSize: 13.5, color: '#E0E0E0' }}>{r.name}</span>
              {r.is_proper && (
                <span style={{ fontSize: 9, fontWeight: 800, background: 'rgba(100,181,246,.15)', color: '#64B5F6', padding: '2px 7px', borderRadius: 6, letterSpacing: .5 }}>PROPER</span>
              )}
              {!r.active && (
                <span style={{ fontSize: 9, fontWeight: 800, background: 'rgba(255,255,255,.08)', color: '#999', padding: '2px 7px', borderRadius: 6, letterSpacing: .5 }}>INACTIVO</span>
              )}
            </div>
            <div style={{ fontSize: 10.5, color: '#777', marginTop: 3, ...sMono }}>
              {r.username || '—'}{r.station_name ? ` · ${r.station_name}` : ''}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, color: '#FBBC04' }}>
              <span style={{ display: 'flex', transform: 'scale(.7)', transformOrigin: 'left center' }}><StarLine /></span>
              <span style={{ ...sMono, fontSize: 12, fontWeight: 800 }}>
                {r.rating_avg != null ? (+r.rating_avg).toFixed(2) : '—'}
              </span>
              <span style={{ fontSize: 10, color: '#777', fontWeight: 700 }}>
                ({fmtInt(r.rating_count)} calif.)
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {statCell(fmtInt(r.purchases), 'registros')}
            {statCell(fmtInt(r.members), 'miembros')}
            {statCell(fmtGal(r.gallons), 'gal')}
            {statCell(`Q${fmtInt(r.amount)}`, 'quetzales')}
            {statCell(fmtInt(r.deliveries), 'entregas')}
          </div>
        </div>
      ))}
    </div>
  );
}
