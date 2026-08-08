// src/views/admin/Members.jsx
// Admin v2 (6-ago-2026) — vista MIEMBROS rediseñada: sin botón de
// volver (la navegación vive en el menú lateral) y sin el botón
// "Nuevo" (modal inexistente — zombie documentado en el ROADMAP).
// Filtros reestructurados en grupos con etiqueta (Nivel / Estación /
// Orden), SIN emojis, chips de estación desde ctx.stations (los
// nombres hardcodeados "Turkaj I/II/III" no coincidían con los reales
// "TURKAJ 1/2/3" del RPC — el filtro nunca aplicaba) y selector del
// modo de clasificación (última visita / más frecuente) que existía
// en el estado pero no tenía UI. Resultados como TARJETAS con código
// de tarjeta y teléfono (útiles al buscar), en columnas responsivas.
import { useState, useEffect } from 'react';
import { sb } from '../../lib/supabaseClient';
import { sMono, adminTheme as AT } from '../../constants/styles';
import { getAdminToken } from '../../services/sessionTokens';
import Badge from '../../components/ui/Badge';
import PeriodPicker, { rangeFromPreset } from '../../components/ui/PeriodPicker';
import { Search } from '../../components/ui/Icons';

export default function Members(ctx) {
  const {
    custs, gT, q, setQ, setSel, setScr,
    memSort, setMemSort, sortDir, setSortDir,
    stationFilter, setStationFilter, stationMode, setStationMode,
    memberStations, stations = [],
  } = ctx;

  // ── Modo de vista: padrón de miembros o RANKING de consumo por
  // estación (misma fuente del Top del inicio: get_station_top_members
  // con tope 500 — migración 20260806g). Aclara la diferencia que
  // confundía: el FILTRO clasifica a cada miembro en UNA estación
  // (última/frecuente); el RANKING lista a todo el que compró ahí. ──
  const [viewMode, setViewMode] = useState('members'); // 'members' | 'ranking'
  const [stationRank, setStationRank] = useState(null); // [{id,name,top:[…]}]

  // ── PERÍODO de la consulta (6-ago): historial completo o fechas
  // específicas — día calendario de Guatemala, resuelto server-side.
  // (8-ago) UI y resolución extraídas a PeriodPicker (compartido con
  // el grupo Análisis). ──
  const [datePreset, setDatePreset] = useState('all'); // all|month|prev|custom
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    if (viewMode !== 'ranking' || !sb) return;
    const tok = getAdminToken()?.token;
    if (!tok) return;
    const { from, to } = rangeFromPreset(datePreset, dateFrom, dateTo);
    setStationRank(null);
    sb.rpc('get_station_top_members', { p_session_token: tok, p_limit: 500, p_from: from, p_to: to })
      .then(({ data, error }) => {
        if (error) {
          // Firma vieja sin fechas (migración 20260806h pendiente):
          // el historial completo sigue funcionando como fallback.
          if (!from && !to) {
            sb.rpc('get_station_top_members', { p_session_token: tok, p_limit: 500 })
              .then(({ data: d2, error: e2 }) => {
                if (e2) { console.warn('[Members] ranking:', e2.message); return; }
                if (Array.isArray(d2)) setStationRank(d2);
              });
          } else {
            console.warn('[Members] ranking con fechas requiere la migración 20260806h:', error.message);
            setStationRank([]);
          }
          return;
        }
        if (Array.isArray(data)) setStationRank(data);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, datePreset, dateFrom, dateTo]);

  // En ranking se necesita una estación elegida — default: la primera.
  useEffect(() => {
    if (viewMode === 'ranking' && !stationFilter && stations.length) {
      setStationFilter(stations[0].name);
    }
  }, [viewMode, stationFilter, stations, setStationFilter]);

  // SEC.C.2b: la estación del miembro viene del RPC list_member_stations
  // (derivada de purchases, con NOMBRE server-side). Regla del dueño:
  // clasificar por el ÚLTIMO consumo (modo 'last') o el más frecuente.
  const getMemberStation = (cid, mode) => {
    const st = memberStations?.[cid];
    if (!st) return null;
    return mode === 'last' ? (st.last || null) : (st.top || st.last || null);
  };

  // Filter and sort
  let filtered = custs.filter(c =>
    c.name.toLowerCase().includes(q.toLowerCase()) ||
    c.id.toLowerCase().includes(q.toLowerCase()) ||
    (c.cardId || '').toLowerCase().includes(q.toLowerCase()) ||
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

  // ── Filas del RANKING por estación: rank precomputado sobre el
  // orden real de consumo (buscar no altera el número — Alexander
  // sigue siendo #2 de su estación aunque se filtre por su nombre) ──
  const rankStation = stationRank?.find(s => s.name === stationFilter) || null;
  let rankRows = (rankStation?.top || []).map((r, i) => ({ ...r, rank: i + 1 }));
  rankRows = rankRows.filter(r =>
    (!q || (r.member_name || '').toLowerCase().includes(q.toLowerCase())) &&
    (memSort === 'all' || gT(+r.member_gallons || 0).name === memSort)
  );
  if (sortDir === 'asc') rankRows = [...rankRows].reverse();

  const tiers = ['all', 'ORO', 'PLATINO', 'BLACK'];

  // ── estilos ──
  const groupLbl = { fontSize: 10, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: '#777', marginBottom: 6 };
  const chip = (on) => ({
    padding: '7px 14px', borderRadius: 10, cursor: 'pointer', whiteSpace: 'nowrap',
    border: `1px solid ${on ? '#FBBC04' : AT.border}`,
    background: on ? '#FBBC04' : AT.card,
    color: on ? '#0D0D0D' : '#9E9E9E',
    fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 700,
  });
  const chipSoft = (on) => ({
    ...chip(on),
    background: on ? 'rgba(251,188,4,.15)' : AT.card,
    color: on ? '#FBBC04' : '#9E9E9E',
  });

  return (
    <div style={{ padding: '22px 22px 60px' }}>
      {/* Encabezado (sin volver ni acciones — navegación en el sidebar) */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 21, fontWeight: 800, color: '#fff' }}>Miembros</div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#9E9E9E', marginTop: 2 }}>
          {viewMode === 'ranking'
            ? `${rankRows.length.toLocaleString('en-US')} miembros con consumo en ${stationFilter || '—'}`
            : `${filtered.length.toLocaleString('en-US')} de ${custs.length.toLocaleString('en-US')} miembros`}
        </div>
      </div>

      {/* ── Barra de búsqueda + filtros agrupados ── */}
      <div style={{ background: AT.card, border: `1px solid ${AT.border}`, borderRadius: 18, padding: 16, marginBottom: 16 }}>
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <input
            placeholder="Buscar por nombre, tarjeta, DPI o teléfono"
            value={q} onChange={e => setQ(e.target.value)}
            style={{
              width: '100%', padding: '12px 16px 12px 42px', borderRadius: 12,
              border: `1px solid ${AT.border}`, background: '#1E1E1E',
              fontFamily: "'DM Sans'", fontSize: 14, outline: 'none',
              color: '#fff', boxSizing: 'border-box',
            }}
          />
          <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#666', display: 'flex' }}><Search /></div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, rowGap: 14 }}>
          {/* Vista: padrón o ranking de consumo por estación */}
          <div>
            <div style={groupLbl}>Vista</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setViewMode('members')} style={chip(viewMode === 'members')}>Miembros</button>
              <button onClick={() => setViewMode('ranking')} style={chip(viewMode === 'ranking')}>Consumo por estación</button>
            </div>
          </div>

          {/* Nivel */}
          <div>
            <div style={groupLbl}>Nivel</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {tiers.map(t => (
                <button key={t} onClick={() => setMemSort(t)} style={chip(memSort === t)}>
                  {t === 'all' ? 'Todos' : t}
                </button>
              ))}
            </div>
          </div>

          {/* Estación (nombres REALES desde ctx.stations) */}
          <div>
            <div style={groupLbl}>Estación</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {viewMode === 'members' && (
                <button onClick={() => setStationFilter(null)} style={chipSoft(!stationFilter)}>Todas</button>
              )}
              {stations.map(s => (
                <button key={s.id}
                  onClick={() => setStationFilter(viewMode === 'members' && stationFilter === s.name ? null : s.name)}
                  style={chipSoft(stationFilter === s.name)}>
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* Modo de clasificación por estación (solo en padrón) */}
          {viewMode === 'members' && (
            <div>
              <div style={groupLbl}>Clasificar por</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setStationMode('last')} style={chipSoft(stationMode === 'last')}>Última visita</button>
                <button onClick={() => setStationMode('frequent')} style={chipSoft(stationMode !== 'last')}>Más frecuente</button>
              </div>
            </div>
          )}

          {/* Orden */}
          <div>
            <div style={groupLbl}>Orden por galones</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setSortDir('desc')} style={chipSoft(sortDir === 'desc')}>Mayor primero</button>
              <button onClick={() => setSortDir('asc')} style={chipSoft(sortDir === 'asc')}>Menor primero</button>
            </div>
          </div>

          {/* Período (solo consulta de consumo — el padrón es acumulado) */}
          {viewMode === 'ranking' && (
            <PeriodPicker
              preset={datePreset} setPreset={setDatePreset}
              from={dateFrom} setFrom={setDateFrom}
              to={dateTo} setTo={setDateTo}
            />
          )}
        </div>

        {viewMode === 'ranking' && (
          <div style={{ fontSize: 11, color: '#777', fontWeight: 600, lineHeight: 1.5, marginTop: 12 }}>
            Ranking por consumo REGISTRADO en la estación elegida — la misma fuente
            del Top 10 del inicio. Incluye a todo miembro que haya comprado ahí,
            aunque su estación habitual (última visita / más frecuente) sea otra.
          </div>
        )}
      </div>

      {/* ── Resultados — columnas con flujo VERTICAL (el 2º debajo del
          1º) y numerador sutil de orden en cada tarjeta ── */}
      {viewMode === 'members' ? (
        <>
          <div className="pp-memb-cols">
            {filtered.map((c, i) => {
              const t = gT(c.gallons);
              const station = getMemberStation(c.id, stationMode);
              return (
                <div key={c.id} onClick={() => { setSel(c); setScr('det'); }} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: AT.card, border: `1px solid ${AT.border}`,
                  borderRadius: 16, padding: '12px 12px', marginBottom: 10,
                  cursor: 'pointer',
                }}>
                  <div style={{ width: 22, textAlign: 'center', flexShrink: 0, ...sMono, fontSize: 10.5, fontWeight: 700, color: '#555' }}>
                    {i + 1}
                  </div>
                  <div style={{ width: 44, height: 44, borderRadius: 13, background: t.bg, color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                    {c.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#E0E0E0' }}>{c.name}</div>
                    {/* Identificadores útiles al BUSCAR: tarjeta y teléfono */}
                    <div style={{ fontSize: 10.5, color: '#777', marginTop: 2, ...sMono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.cardId || '—'}{c.phone ? ` · ${c.phone}` : ''}
                    </div>
                    <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Badge t={t} />
                      {station && (
                        <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(255,255,255,.08)', padding: '2px 7px', borderRadius: 6, color: '#aaa', letterSpacing: .3 }}>
                          {station}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ ...sMono, fontSize: 14.5, fontWeight: 800, color: '#FBBC04' }}>
                      {c.points.toLocaleString('en-US')} <span style={{ fontSize: 10, color: '#777' }}>pts</span>
                    </div>
                    <div style={{ fontSize: 10, color: '#777', ...sMono, marginTop: 2 }}>
                      {Math.round(c.gallons).toLocaleString('en-US')} gal
                    </div>
                    <div style={{ fontSize: 10, color: '#777', ...sMono }}>
                      Q{Math.round(c.spent).toLocaleString('en-US')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#777' }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, margin: '0 auto 12px', background: AT.card, border: `1px solid ${AT.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                <Search />
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#9E9E9E' }}>No se encontraron miembros</div>
              <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>Probá con otro nombre, tarjeta, DPI o teléfono</div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* ── RANKING de consumo por estación (fuente del Top del
              inicio) — el número es el puesto REAL en la estación y no
              cambia al buscar ── */}
          {!stationRank && (
            <div style={{ textAlign: 'center', padding: 40, color: '#777', fontSize: 13, fontWeight: 700 }}>
              Cargando ranking de consumo...
            </div>
          )}
          {stationRank && (
            <div className="pp-memb-cols">
              {rankRows.map(r => {
                const c = custs.find(x => x.id === r.member_id) || null;
                const t = gT(+r.member_gallons || 0);
                return (
                  <div key={r.member_id}
                    onClick={() => { if (c) { setSel(c); setScr('det'); } }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: AT.card, border: `1px solid ${AT.border}`,
                      borderRadius: 16, padding: '12px 12px', marginBottom: 10,
                      cursor: c ? 'pointer' : 'default',
                    }}>
                    <div style={{ width: 26, textAlign: 'center', flexShrink: 0, ...sMono, fontSize: 12, fontWeight: 800, color: r.rank <= 3 ? '#FBBC04' : '#555' }}>
                      {r.rank}
                    </div>
                    <div style={{ width: 44, height: 44, borderRadius: 13, background: t.bg, color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                      {(r.member_name || '?').charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#E0E0E0' }}>{r.member_name}</div>
                      <div style={{ fontSize: 10.5, color: '#777', marginTop: 2 }}>
                        {r.purchases} compras en {stationFilter}
                      </div>
                      <div style={{ marginTop: 5 }}><Badge t={t} /></div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ ...sMono, fontSize: 14.5, fontWeight: 800, color: '#FBBC04' }}>
                        {Math.round(+r.gallons).toLocaleString('en-US')} <span style={{ fontSize: 10, color: '#777' }}>gal</span>
                      </div>
                      <div style={{ fontSize: 10, color: '#777', ...sMono, marginTop: 2 }}>
                        Q{Math.round(+r.amount).toLocaleString('en-US')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {stationRank && rankRows.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#777' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#9E9E9E' }}>Sin consumo registrado</div>
              <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>Nadie coincide con la búsqueda o los filtros en {stationFilter || 'esta estación'}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
