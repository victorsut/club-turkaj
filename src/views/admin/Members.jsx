// src/views/admin/Members.jsx
// Admin members list — search, filter by tier, sort, member cards
import { useState } from 'react';
import { sMono, adminTheme as AT, btnYellow } from '../../constants/styles';
import Badge from '../../components/ui/Badge';
import { Search, Back, Plus } from '../../components/ui/Icons';

export default function Members(ctx) {
  const {
    custs, gT, cfg, q, setQ, sel, setSel, setScr, setModal,
    memSort, setMemSort, sortDir, setSortDir,
    stationFilter, setStationFilter, stationMode, setStationMode,
    activityLog, editMember, setEditMember,
  } = ctx;

  const getMemberStation = (cid, mode) => {
    const acts = (activityLog && activityLog[cid]) || [];
    const withStation = acts.filter(a => a.station);
    if (!withStation.length) return null;
    if (mode === 'last') return withStation[0].station;
    const counts = {};
    withStation.forEach(a => { counts[a.station] = (counts[a.station] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  };

  // Filter and sort
  let filtered = custs.filter(c =>
    c.name.toLowerCase().includes(q.toLowerCase()) ||
    c.id.toLowerCase().includes(q.toLowerCase()) ||
    (c.phone || '').includes(q) ||
    (c.dpi || '').includes(q)
  );

  if (memSort !== 'all') {
    filtered = filtered.filter(c => gT(c.gallons).name === memSort);
  }
  if (stationFilter) {
    filtered = filtered.filter(c => getMemberStation(c.id, stationMode) === stationFilter);
  }

  filtered.sort((a, b) => {
    const diff = b.gallons - a.gallons;
    return sortDir === 'desc' ? diff : -diff;
  });

  const tiers = ['all', 'ORO', 'PLATINO', 'BLACK'];
  const stations = ['Turkaj I', 'Turkaj II', 'Turkaj III'];

  return (
    <div style={{ paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${AT.border}`, background: '#252525', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setScr('dash')} style={{ background: 'none', border: 'none', color: '#9E9E9E', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600 }}><Back /> Inicio</button>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Miembros ({filtered.length})</div>
        <button onClick={() => setModal('newC')} style={{ ...btnYellow, padding: '8px 16px', fontSize: 12, width: 'auto', borderRadius: 12 }}><Plus /> Nuevo</button>
      </div>

      {/* Search */}
      <div style={{ padding: '12px 20px', display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            placeholder="Buscar por nombre, ID, DPI, teléfono..."
            value={q} onChange={e => setQ(e.target.value)}
            style={{ width: '100%', padding: '12px 16px 12px 40px', borderRadius: 14, border: `1px solid ${AT.border}`, background: AT.card, fontFamily: "'DM Sans'", fontSize: 14, outline: 'none', color: '#fff', boxSizing: 'border-box' }}
          />
          <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#666' }}><Search /></div>
        </div>
      </div>

      {/* Tier filters */}
      <div style={{ display: 'flex', gap: 6, padding: '0 20px 8px', overflowX: 'auto' }}>
        {tiers.map(t => (
          <button key={t} onClick={() => setMemSort(t)} style={{
            padding: '7px 14px', borderRadius: 20,
            border: `1px solid ${memSort === t ? '#FBBC04' : AT.border}`,
            background: memSort === t ? '#FBBC04' : AT.card,
            fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 700, cursor: 'pointer',
            color: memSort === t ? '#0D0D0D' : '#9E9E9E', whiteSpace: 'nowrap',
          }}>{t === 'all' ? 'Todos' : t}</button>
        ))}
        <button onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')} style={{
          padding: '7px 14px', borderRadius: 20,
          border: `1px solid ${AT.border}`, background: AT.card,
          fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#9E9E9E', whiteSpace: 'nowrap',
        }}>{sortDir === 'desc' ? '↓ Mayor' : '↑ Menor'}</button>
      </div>

      {/* Station filter */}
      <div style={{ display: 'flex', gap: 6, padding: '0 20px 12px', overflowX: 'auto' }}>
        <button onClick={() => setStationFilter(null)} style={{
          padding: '5px 10px', borderRadius: 16, border: `1px solid ${!stationFilter ? '#FBBC04' : AT.border}`,
          background: !stationFilter ? 'rgba(251,188,4,.15)' : AT.card,
          fontFamily: "'DM Sans'", fontSize: 10, fontWeight: 700, cursor: 'pointer',
          color: !stationFilter ? '#FBBC04' : '#777', whiteSpace: 'nowrap',
        }}>📍 Todas</button>
        {stations.map(s => (
          <button key={s} onClick={() => setStationFilter(stationFilter === s ? null : s)} style={{
            padding: '5px 10px', borderRadius: 16, border: `1px solid ${stationFilter === s ? '#FBBC04' : AT.border}`,
            background: stationFilter === s ? 'rgba(251,188,4,.15)' : AT.card,
            fontFamily: "'DM Sans'", fontSize: 10, fontWeight: 700, cursor: 'pointer',
            color: stationFilter === s ? '#FBBC04' : '#777', whiteSpace: 'nowrap',
          }}>⛽ {s}</button>
        ))}
      </div>

      {/* Members list */}
      {filtered.map(c => {
        const t = gT(c.gallons);
        const station = getMemberStation(c.id, stationMode);
        return (
          <div key={c.id} onClick={() => { setSel(c); setScr('det'); }} style={{
            display: 'flex', alignItems: 'center', padding: '12px 20px',
            borderBottom: `1px solid ${AT.border}`, cursor: 'pointer',
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: t.bg, color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, marginRight: 12, flexShrink: 0 }}>{c.name.charAt(0)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#E0E0E0' }}>{c.name}</div>
              <div style={{ fontSize: 11, color: '#777', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Badge t={t} />
                {station && <span style={{ fontSize: 9, background: 'rgba(255,255,255,.08)', padding: '2px 6px', borderRadius: 6, color: '#aaa' }}>📍 {station}</span>}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ ...sMono, fontSize: 15, fontWeight: 800, color: '#FBBC04' }}>{c.points.toLocaleString()} <span style={{ fontSize: 10, color: '#777' }}>pts</span></div>
              <div style={{ fontSize: 10, color: '#777', ...sMono }}>{c.gallons.toFixed(0)} gal · Q{c.spent.toLocaleString()}</div>
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#777' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔍</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>No se encontraron miembros</div>
        </div>
      )}
    </div>
  );
}
