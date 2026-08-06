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
import { sMono, adminTheme as AT } from '../../constants/styles';
import Badge from '../../components/ui/Badge';
import { Search } from '../../components/ui/Icons';

export default function Members(ctx) {
  const {
    custs, gT, q, setQ, setSel, setScr,
    memSort, setMemSort, sortDir, setSortDir,
    stationFilter, setStationFilter, stationMode, setStationMode,
    memberStations, stations = [],
  } = ctx;

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
          {filtered.length.toLocaleString('en-US')} de {custs.length.toLocaleString('en-US')} miembros
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
              <button onClick={() => setStationFilter(null)} style={chipSoft(!stationFilter)}>Todas</button>
              {stations.map(s => (
                <button key={s.id} onClick={() => setStationFilter(stationFilter === s.name ? null : s.name)}
                  style={chipSoft(stationFilter === s.name)}>
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* Modo de clasificación por estación */}
          <div>
            <div style={groupLbl}>Clasificar por</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setStationMode('last')} style={chipSoft(stationMode === 'last')}>Última visita</button>
              <button onClick={() => setStationMode('frequent')} style={chipSoft(stationMode !== 'last')}>Más frecuente</button>
            </div>
          </div>

          {/* Orden */}
          <div>
            <div style={groupLbl}>Orden por galones</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setSortDir('desc')} style={chipSoft(sortDir === 'desc')}>Mayor primero</button>
              <button onClick={() => setSortDir('asc')} style={chipSoft(sortDir === 'asc')}>Menor primero</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Resultados: tarjetas en columnas responsivas ── */}
      <div className="pp-adm-grid" style={{ columnGap: 14 }}>
        {filtered.map(c => {
          const t = gT(c.gallons);
          const station = getMemberStation(c.id, stationMode);
          return (
            <div key={c.id} onClick={() => { setSel(c); setScr('det'); }} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: AT.card, border: `1px solid ${AT.border}`,
              borderRadius: 16, padding: '12px 14px', marginBottom: 10,
              cursor: 'pointer',
            }}>
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
    </div>
  );
}
