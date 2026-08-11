// src/views/admin/analytics/AnClientes.jsx
// ANÁLISIS → Clientes (8-ago-2026): consumo segmentado por dimensión
// (edad, municipio, cantón, vehículo, nivel, combustible, día, hora)
// vía RPC report_consumo_segmentos, más el RANKING por estación
// (misma fuente del Top del inicio: get_station_top_members). Todo
// con período en día calendario de Guatemala y export CSV.
import { useState, useEffect } from 'react';
import { sb } from '../../../lib/supabaseClient';
import { sMono, adminTheme as AT } from '../../../constants/styles';
import { FUEL_LABELS } from '../../../constants/config';
import { getAdminToken } from '../../../services/sessionTokens';
import Badge from '../../../components/ui/Badge';
import PeriodPicker, { rangeFromPreset } from '../../../components/ui/PeriodPicker';
import { rpcReport, fmtInt, fmtGal, groupLbl, chip, chipSoft, cardBox, AnHeader, AnStatus, downloadCSV, CsvButton } from './anShared';

const DIMS = [
  { id: 'rank',    label: 'Ranking' },
  { id: 'age',     label: 'Edad' },
  { id: 'muni',    label: 'Municipio' },
  { id: 'canton',  label: 'Cantón' },
  { id: 'vehicle', label: 'Vehículo' },
  { id: 'tier',    label: 'Nivel' },
  { id: 'fuel',    label: 'Combustible' },
  { id: 'weekday', label: 'Día de semana' },
  { id: 'hour',    label: 'Hora' },
];

export default function AnClientes(ctx) {
  const { stations = [], gT, custs = [], setSel, setScr } = ctx;

  const [dim, setDim] = useState('age');
  const [stationId, setStationId] = useState(null); // null = todas (segmentos)
  const [preset, setPreset] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [rows, setRows] = useState(null);   // segmentos
  const [rank, setRank] = useState(null);   // ranking [{id,name,top}]
  const [error, setError] = useState(null);

  // En ranking la estación es obligatoria — default: la primera.
  useEffect(() => {
    if (dim === 'rank' && !stationId && stations.length) setStationId(stations[0].id);
  }, [dim, stationId, stations]);

  useEffect(() => {
    let alive = true;
    const { from: f, to: t } = rangeFromPreset(preset, from, to);
    setError(null);
    if (dim === 'rank') {
      const tok = getAdminToken()?.token;
      if (!sb || !tok) return;
      setRank(null);
      sb.rpc('get_station_top_members', { p_session_token: tok, p_limit: 500, p_from: f, p_to: t })
        .then(({ data, error: e }) => {
          if (!alive) return;
          if (e) { setError(e.message); setRank([]); return; }
          if (Array.isArray(data)) setRank(data);
        });
    } else {
      setRows(null);
      rpcReport('report_consumo_segmentos', { p_dim: dim, p_from: f, p_to: t, p_station: stationId })
        .then(({ data, error: e }) => {
          if (!alive) return;
          if (e) { setError(e); setRows([]); return; }
          setRows(Array.isArray(data) ? data : []);
        });
    }
    return () => { alive = false; };
  }, [dim, stationId, preset, from, to]);

  const dimLabel = DIMS.find(d => d.id === dim)?.label || '';
  const segLabel = (r) => (dim === 'fuel' ? (FUEL_LABELS?.[r.label] || r.label) : r.label);

  // ── Ranking: filas de la estación elegida con puesto real ──
  const rankStation = rank?.find(s => s.id === stationId) || null;
  const rankRows = (rankStation?.top || []).map((r, i) => ({ ...r, rank: i + 1 }));

  const maxGal = rows?.length ? Math.max(...rows.map(r => +r.gallons || 0), 1) : 1;

  const exportCsv = () => {
    const period = preset === 'all' ? 'todo' : preset;
    if (dim === 'rank') {
      downloadCSV(`ranking-${rankStation?.name || 'estacion'}-${period}.csv`,
        ['Puesto', 'Miembro', 'Compras', 'Galones', 'Quetzales'],
        rankRows.map(r => [r.rank, r.member_name, r.purchases, r.gallons, r.amount]));
    } else {
      downloadCSV(`clientes-${dim}-${period}.csv`,
        [dimLabel, 'Miembros', 'Compras', 'Galones', 'Quetzales', 'Puntos'],
        (rows || []).map(r => [segLabel(r), r.members, r.purchases, r.gallons, r.amount, r.points]));
    }
  };

  const statCell = (v, cap) => (
    <div style={{ textAlign: 'right', minWidth: 62 }}>
      <div style={{ ...sMono, fontSize: 13, fontWeight: 800, color: '#E0E0E0' }}>{v}</div>
      <div style={{ fontSize: 9, color: '#777', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5 }}>{cap}</div>
    </div>
  );

  return (
    <div style={{ padding: '22px 22px 60px' }}>
      <AnHeader title="Análisis · Clientes"
        subtitle="Consumo por segmento y ranking por estación — solo consulta, la gestión vive en Miembros" />

      {/* ── Filtros ── */}
      <div style={cardBox}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, rowGap: 14 }}>
          <div>
            <div style={groupLbl}>Consulta</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {DIMS.map(d => (
                <button key={d.id} onClick={() => setDim(d.id)} style={chip(dim === d.id)}>{d.label}</button>
              ))}
            </div>
          </div>

          <div>
            <div style={groupLbl}>Estación</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {dim !== 'rank' && (
                <button onClick={() => setStationId(null)} style={chipSoft(!stationId)}>Todas</button>
              )}
              {stations.map(s => (
                <button key={s.id} onClick={() => setStationId(s.id)} style={chipSoft(stationId === s.id)}>
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <PeriodPicker preset={preset} setPreset={setPreset} from={from} setFrom={setFrom} to={to} setTo={setTo} />
          <CsvButton onClick={exportCsv} disabled={dim === 'rank' ? !rankRows.length : !rows?.length} />
        </div>

        <div style={{ fontSize: 11, color: '#777', fontWeight: 600, lineHeight: 1.5, marginTop: 12 }}>
          {dim === 'rank'
            ? 'Orden completo de consumo registrado en la estación elegida — la misma fuente del Top 10 del inicio.'
            : 'Edad, dirección y vehículo dependen del dato del perfil del miembro: quien no lo tiene cae en "Sin dato". El nivel es el ACTUAL del miembro, no el que tenía al comprar.'}
        </div>
      </div>

      {/* ── Resultados ── */}
      {dim === 'rank' ? (
        <>
          <AnStatus loading={!rank && !error} error={error} empty={rank && !rankRows.length} />
          {rankRows.length > 0 && (
            <div className="pp-memb-cols">
              {rankRows.map(r => {
                const c = custs.find(x => x.id === r.member_id) || null;
                const t = gT(+r.member_gallons || 0);
                return (
                  <div key={r.member_id} onClick={() => { if (c) { setSel(c); setScr('det'); } }} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: AT.card, border: `1px solid ${AT.border}`,
                    borderRadius: 16, padding: '12px 12px', marginBottom: 10,
                    cursor: c ? 'pointer' : 'default',
                  }}>
                    <div style={{ width: 26, textAlign: 'center', flexShrink: 0, ...sMono, fontSize: 12, fontWeight: 800, color: r.rank <= 3 ? '#FBBC04' : '#555' }}>{r.rank}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#E0E0E0' }}>{r.member_name}</div>
                      <div style={{ fontSize: 10.5, color: '#777', marginTop: 2 }}>{fmtInt(r.purchases)} compras</div>
                      <div style={{ marginTop: 5 }}><Badge t={t} /></div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ ...sMono, fontSize: 14.5, fontWeight: 800, color: '#FBBC04' }}>
                        {fmtInt(r.gallons)} <span style={{ fontSize: 10, color: '#777' }}>gal</span>
                      </div>
                      <div style={{ fontSize: 10, color: '#777', ...sMono, marginTop: 2 }}>Q{fmtInt(r.amount)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <AnStatus loading={!rows && !error} error={error} empty={rows && !rows.length} />
          {rows?.length > 0 && rows.map(r => (
            <div key={r.label} style={{
              background: AT.card, border: `1px solid ${AT.border}`,
              borderRadius: 16, padding: '12px 16px', marginBottom: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 150, fontWeight: 800, fontSize: 13.5, color: '#E0E0E0' }}>{segLabel(r)}</div>
                <div style={{ flex: 1, minWidth: 120, height: 8, borderRadius: 6, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.max((+r.gallons / maxGal) * 100, 1.5)}%`, height: '100%', borderRadius: 6, background: '#FBBC04' }} />
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  {statCell(fmtInt(r.members), 'miembros')}
                  {statCell(fmtInt(r.purchases), 'compras')}
                  {statCell(fmtGal(r.gallons), 'gal')}
                  {statCell(`Q${fmtInt(r.amount)}`, 'quetzales')}
                  {statCell(fmtInt(r.points), 'pts')}
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
