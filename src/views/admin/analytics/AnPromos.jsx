// src/views/admin/analytics/AnPromos.jsx
// ANÁLISIS → Promos y Rifas (8-ago-2026), tres consultas:
//  · Promociones: consumo ATRIBUIDO por regla del motor (fuente
//    promo_applications — atribución exacta por compra, no por
//    ventana de fechas) — RPC report_promos.
//  · Rifas: boletos y puntos invertidos por rifa, comprados vs
//    regalados por la 5ª encuesta — RPC report_rifas (sin período:
//    cada rifa ya es un mes).
//  · Canjes: puntos quemados, tasa de entrega y premios más
//    canjeados — RPC report_canjes.
import { useState, useEffect } from 'react';
import { sMono, adminTheme as AT } from '../../../constants/styles';
import PeriodPicker, { rangeFromPreset } from '../../../components/ui/PeriodPicker';
import { rpcReport, fmtInt, fmtGal, groupLbl, chip, cardBox, AnHeader, AnStatus, downloadCSV, CsvButton } from './anShared';

const TABS = [
  { id: 'promos', label: 'Promociones' },
  { id: 'rifas',  label: 'Rifas' },
  { id: 'canjes', label: 'Canjes' },
];
const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const EFFECT_LABELS = { points_multiplier: 'Multiplicador', bonus_points: 'Puntos extra', grant_reward: 'Premio directo' };

export default function AnPromos() {
  const [tab, setTab] = useState('promos');
  const [preset, setPreset] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    const { from: f, to: t } = rangeFromPreset(preset, from, to);
    setError(null);
    setData(null);
    const call = tab === 'promos'
      ? rpcReport('report_promos', { p_from: f, p_to: t })
      : tab === 'rifas'
        ? rpcReport('report_rifas', {})
        : rpcReport('report_canjes', { p_from: f, p_to: t });
    call.then(({ data: d, error: e }) => {
      if (!alive) return;
      if (e) { setError(e); setData(tab === 'canjes' ? { summary: {}, top: [] } : []); return; }
      setData(d);
    });
    return () => { alive = false; };
  }, [tab, preset, from, to]);

  const rows = Array.isArray(data) ? data : [];
  const summary = (!Array.isArray(data) && data?.summary) || {};
  const top = (!Array.isArray(data) && data?.top) || [];

  const exportCsv = () => {
    const period = preset === 'all' ? 'todo' : preset;
    if (tab === 'promos') {
      downloadCSV(`promos-${period}.csv`,
        ['Promoción', 'Efecto', 'Activa', 'Aplicaciones', 'Miembros', 'Puntos bonus', 'Galones', 'Quetzales'],
        rows.map(r => [r.name, EFFECT_LABELS[r.effect_type] || r.effect_type, r.active ? 'Sí' : 'No',
          r.applications, r.members, r.bonus_points, r.gallons, r.amount]));
    } else if (tab === 'rifas') {
      downloadCSV('rifas.csv',
        ['Rifa', 'Premio', 'Boletos', 'Comprados', 'Regalados', 'Puntos invertidos', 'Participantes', 'Ganador'],
        rows.map(r => [`${MESES[r.month] || r.month} ${r.year}`, r.prize_name, r.tickets, r.tickets_paid,
          r.tickets_gift, r.points_spent, r.participants, r.winner_name || '']));
    } else {
      downloadCSV(`canjes-${period}.csv`,
        ['Premio', 'Categoría', 'Canjes', 'Entregados', 'Puntos'],
        top.map(t => [t.reward, t.category || '', t.count, t.delivered, t.points]));
    }
  };

  const statCell = (v, cap, color = '#E0E0E0') => (
    <div style={{ textAlign: 'right', minWidth: 62 }}>
      <div style={{ ...sMono, fontSize: 13, fontWeight: 800, color }}>{v}</div>
      <div style={{ fontSize: 9, color: '#777', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5 }}>{cap}</div>
    </div>
  );
  const rowBox = {
    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
    background: AT.card, border: `1px solid ${AT.border}`,
    borderRadius: 16, padding: '12px 16px', marginBottom: 10,
  };
  const tile = (label, value) => (
    <div style={{ flex: '1 1 120px', background: AT.card, border: `1px solid ${AT.border}`, borderRadius: 16, padding: '14px 16px' }}>
      <div style={{ ...sMono, fontSize: 19, fontWeight: 800, color: '#FBBC04' }}>{value}</div>
      <div style={{ fontSize: 10, color: '#777', fontWeight: 800, textTransform: 'uppercase', letterSpacing: .8, marginTop: 3 }}>{label}</div>
    </div>
  );

  const loading = data === null && !error;
  const empty = data !== null && (tab === 'canjes' ? !top.length && !(+summary.created) : !rows.length);

  return (
    <div style={{ padding: '22px 22px 60px' }}>
      <AnHeader title="Análisis · Promos y Rifas"
        subtitle="Rendimiento de promociones, boletos de rifa y economía del catálogo de canjes" />

      <div style={cardBox}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, rowGap: 14 }}>
          <div>
            <div style={groupLbl}>Consulta</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} style={chip(tab === t.id)}>{t.label}</button>
              ))}
            </div>
          </div>
          {tab !== 'rifas' && (
            <PeriodPicker preset={preset} setPreset={setPreset} from={from} setFrom={setFrom} to={to} setTo={setTo} />
          )}
          <CsvButton onClick={exportCsv} disabled={loading || empty} />
        </div>
        {tab === 'promos' && (
          <div style={{ fontSize: 11, color: '#777', fontWeight: 600, lineHeight: 1.5, marginTop: 12 }}>
            Consumo ATRIBUIDO: solo compras a las que la regla aplicó de verdad (motor de promos).
            Puntos bonus = puntos otorgados por encima de la base.
          </div>
        )}
      </div>

      <AnStatus loading={loading} error={error} empty={empty} />

      {/* ── Promociones ── */}
      {tab === 'promos' && rows.map(r => (
        <div key={r.id} style={{ ...rowBox, opacity: r.active ? 1 : .55 }}>
          <div style={{ flex: 1, minWidth: 170 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, fontSize: 13.5, color: '#E0E0E0' }}>{r.name}</span>
              <span style={{ fontSize: 9, fontWeight: 800, background: 'rgba(251,188,4,.15)', color: '#FBBC04', padding: '2px 7px', borderRadius: 6, letterSpacing: .5 }}>
                {(EFFECT_LABELS[r.effect_type] || r.effect_type || '').toUpperCase()}
              </span>
              {!r.active && (
                <span style={{ fontSize: 9, fontWeight: 800, background: 'rgba(255,255,255,.08)', color: '#999', padding: '2px 7px', borderRadius: 6, letterSpacing: .5 }}>INACTIVA</span>
              )}
            </div>
            <div style={{ fontSize: 10.5, color: '#777', marginTop: 3 }}>
              {r.starts_on || 'sin inicio'} → {r.ends_on || 'sin fin'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {statCell(fmtInt(r.applications), 'aplicada')}
            {statCell(fmtInt(r.members), 'miembros')}
            {statCell(fmtInt(r.bonus_points), 'pts bonus', '#FBBC04')}
            {statCell(fmtGal(r.gallons), 'gal')}
            {statCell(`Q${fmtInt(r.amount)}`, 'quetzales')}
          </div>
        </div>
      ))}

      {/* ── Rifas ── */}
      {tab === 'rifas' && rows.map(r => (
        <div key={r.id} style={rowBox}>
          <div style={{ flex: 1, minWidth: 170 }}>
            <div style={{ fontWeight: 800, fontSize: 13.5, color: '#E0E0E0' }}>
              {MESES[r.month] || r.month} {r.year}
            </div>
            <div style={{ fontSize: 10.5, color: '#777', marginTop: 3 }}>{r.prize_name || 'Sin premio configurado'}</div>
            <div style={{ fontSize: 10.5, color: r.winner_name ? '#81C784' : '#777', fontWeight: 700, marginTop: 3 }}>
              {r.winner_name ? `Ganador: ${r.winner_name}` : 'Sin sortear'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {statCell(fmtInt(r.tickets), 'boletos')}
            {statCell(fmtInt(r.tickets_paid), 'comprados')}
            {statCell(fmtInt(r.tickets_gift), 'regalados')}
            {statCell(fmtInt(r.points_spent), 'pts invertidos', '#FBBC04')}
            {statCell(fmtInt(r.participants), 'participantes')}
          </div>
        </div>
      ))}

      {/* ── Canjes ── */}
      {tab === 'canjes' && data !== null && !empty && (
        <>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            {tile('Canjes creados', fmtInt(summary.created))}
            {tile('Entregados', fmtInt(summary.delivered))}
            {tile('Pendientes', fmtInt(summary.pending))}
            {tile('Puntos quemados', fmtInt(summary.points))}
          </div>
          {top.map(t => (
            <div key={t.reward} style={rowBox}>
              <div style={{ flex: 1, minWidth: 170 }}>
                <div style={{ fontWeight: 800, fontSize: 13.5, color: '#E0E0E0' }}>{t.reward}</div>
                {t.category && <div style={{ fontSize: 10.5, color: '#777', marginTop: 3 }}>{t.category}</div>}
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                {statCell(fmtInt(t.count), 'canjes')}
                {statCell(fmtInt(t.delivered), 'entregados')}
                {statCell(fmtInt(t.points), 'puntos', '#FBBC04')}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
