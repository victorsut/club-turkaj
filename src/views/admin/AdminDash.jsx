// src/views/admin/AdminDash.jsx
// Admin v2 (6-ago-2026) — INICIO del panel: estadísticas, gráficos y
// accesos a las consultas. Desktop-first (grid de stats + columnas de
// tarjetas), FORMATO GENERAL flat sin emojis; gráficos propios en
// CSS/SVG (barras por estación, dona de mezcla de combustible,
// distribución por nivel) — sin librerías externas. Los KPIs REALES
// vienen del RPC get_admin_kpis (F1); sin respuesta caen al estimado
// 45/35/20. Los botones zombie Escanear/Nuevo (modales inexistentes,
// deuda del ROADMAP) se eliminaron.
import { useState, useEffect } from 'react';
import { sb } from '../../lib/supabaseClient';
import { sMono, adminTheme as AT, BRAND_ORANGE } from '../../constants/styles';
import { getAdminToken } from '../../services/sessionTokens';
import { fetchRaffleParticipants } from '../../services';
import Badge from '../../components/ui/Badge';
import DashHistoryModal from './DashHistoryModal';
import { Users, Gift, Fuel, Receipt, TicketStar, Clipboard, Chev } from '../../components/ui/Icons';

const TIER_COLORS = { ORO: '#FFB74D', PLATINO: '#64B5F6', BLACK: '#CE93D8' };

// Dona SVG minimalista (sin librerías): segmentos por fracción.
function Donut({ parts, size = 128, stroke = 18 }) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  let off = 0;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={stroke} />
      {parts.map((p, i) => {
        const dash = (p.value / total) * C;
        const el = (
          <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={p.color} strokeWidth={stroke}
            strokeDasharray={`${Math.max(dash - 2, 0)} ${C - Math.max(dash - 2, 0)}`}
            strokeDashoffset={-off} strokeLinecap="butt" />
        );
        off += dash;
        return el;
      })}
    </svg>
  );
}

export default function AdminDash(ctx) {
  const {
    custs, gT, cfg, setScr, setSel, loggedAdmin,
    raffleCal, curMonth, activityLog, rewards,
  } = ctx;

  // ===== KPIs =====
  const tP = custs.reduce((s, c) => s + c.points, 0);
  const tG = custs.reduce((s, c) => s + c.gallons, 0);
  const tSpent = custs.reduce((s, c) => s + c.spent, 0);
  const tRedeemed = custs.reduce((s, c) => s + (c.redeemed || 0), 0);
  const curYM = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const newThisMonth = custs.filter(c => c.registered?.startsWith(curYM)).length;
  // Puntos canjeados ESTIMADOS: no tenemos el costo exacto de cada canje
  // histórico en el inicio (redemptions está cerrada), así que se usa el
  // costo PROMEDIO REAL del catálogo × la cantidad de canjes — antes era
  // una constante mágica 175 sin relación con los premios reales.
  const avgRewardCost = rewards?.length
    ? Math.round(rewards.reduce((s, r) => s + (r.points_cost || 0), 0) / rewards.length)
    : 0;
  const ptsRedeemed = tRedeemed * avgRewardCost;
  const ptsUnredeemed = tP;
  const ptsTotal = ptsUnredeemed + ptsRedeemed;
  const qUnredeemed = (ptsUnredeemed / cfg.qPerPt).toFixed(0);
  const qRedeemed = (ptsRedeemed / cfg.qPerPt).toFixed(0);

  // Distribución por nivel (galones acumulados de cada miembro)
  const tierCount = { ORO: 0, PLATINO: 0, BLACK: 0 };
  custs.forEach(c => { tierCount[gT(c.gallons).name] += 1; });
  // Altas del MES por nivel (nivel ACTUAL del miembro — no hay
  // snapshot del nivel que tenía al inscribirse)
  const newByTier = { ORO: 0, PLATINO: 0, BLACK: 0 };
  custs.filter(c => c.registered?.startsWith(curYM)).forEach(c => { newByTier[gT(c.gallons).name] += 1; });
  const maxNewTier = Math.max(...Object.values(newByTier), 1);

  // Fallback estimado del desglose de combustible (sin RPC)
  const gSuper = +(tG * 0.45).toFixed(0);
  const gRegular = +(tG * 0.35).toFixed(0);
  const gDiesel = +(tG - gSuper - gRegular).toFixed(0);

  // KPIs REALES (F1): agregados de purchases con sesión de admin
  const [kpis, setKpis] = useState(null);
  useEffect(() => {
    if (!sb) return;
    const tok = getAdminToken()?.token;
    if (!tok) return;
    sb.rpc('get_admin_kpis', { p_session_token: tok }).then(({ data, error }) => {
      if (error) { console.warn('[Dash] KPIs:', error.message); return; }
      if (data && !data.error) setKpis(data);
    });
  }, []);

  const FUEL_META = {
    super:   { label: 'Súper',   color: '#FF8F3C' },
    regular: { label: 'Regular', color: '#66BB6A' },
    diesel:  { label: 'Diésel',  color: '#64B5F6' },
  };
  const fuelReal = !!kpis?.fuel?.length;
  const fuelRows = fuelReal
    ? kpis.fuel.map(f => ({
        key: f.fuel_type,
        label: FUEL_META[f.fuel_type]?.label || (f.fuel_type[0].toUpperCase() + f.fuel_type.slice(1)),
        color: FUEL_META[f.fuel_type]?.color || '#9E9E9E',
        g: +f.gallons || 0, q: +f.amount || 0,
      }))
    : [
        { key: 'super',   label: 'Súper',   color: FUEL_META.super.color,   g: gSuper,   q: +(gSuper * (cfg.fuelPrices?.super ?? 0)).toFixed(0) },
        { key: 'regular', label: 'Regular', color: FUEL_META.regular.color, g: gRegular, q: +(gRegular * (cfg.fuelPrices?.regular ?? 0)).toFixed(0) },
        { key: 'diesel',  label: 'Diésel',  color: FUEL_META.diesel.color,  g: gDiesel,  q: +(gDiesel * (cfg.fuelPrices?.diesel ?? 0)).toFixed(0) },
      ];
  const fuelTotalG = fuelReal ? fuelRows.reduce((s, f) => s + f.g, 0) : tG;
  const fuelTotalQ = fuelReal ? fuelRows.reduce((s, f) => s + f.q, 0) : tSpent;

  const stationRows = kpis?.stations || [];

  // ── MES ACTUAL en las gráficas (pedido del dueño 11-ago): cada
  // cuadro muestra el mes en curso, el encabezado lleva el TOTAL
  // acumulado y al presionarlo se abre el historial mensual.
  // fuel_month/stations_month ya venían en get_admin_kpis (F1, mes
  // calendario GT) — stations_month solo trae estaciones con ventas,
  // por eso se mezcla sobre la lista completa con 0 de default.
  const monthReal = !!kpis;
  const mesNombre = (() => {
    const s = new Date().toLocaleDateString('es-GT', { month: 'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  })();
  const monthFuelRows = (kpis?.fuel_month || []).map(f => ({
    key: f.fuel_type,
    label: FUEL_META[f.fuel_type]?.label || (f.fuel_type[0].toUpperCase() + f.fuel_type.slice(1)),
    color: FUEL_META[f.fuel_type]?.color || '#9E9E9E',
    g: +f.gallons || 0, q: +f.amount || 0,
  }));
  const galMes = monthFuelRows.reduce((s, f) => s + f.g, 0);
  const qMes = monthFuelRows.reduce((s, f) => s + f.q, 0);
  const stationsMes = stationRows.map(s => {
    const m = (kpis?.stations_month || []).find(x => x.id === s.id);
    return { ...s, mg: +(m?.gallons) || 0, ma: +(m?.amount) || 0, mp: +(m?.purchases) || 0 };
  });
  const maxStationMesG = Math.max(...stationsMes.map(s => s.mg), 1);
  const totalStationQ = stationRows.reduce((s, x) => s + (+x.amount || 0), 0);

  // Historial mensual (modal): RPC get_dash_monthly, carga perezosa la
  // primera vez que se abre un cuadro; 'missing' = migración 20260811
  // sin ejecutar (el modal avisa). El historial de miembros no usa RPC.
  const [histMetric, setHistMetric] = useState(null);
  const [histMonths, setHistMonths] = useState(null); // null | 'loading' | 'missing' | rows[]
  const openHistory = (metric) => {
    setHistMetric(metric);
    if (metric === 'mem' || Array.isArray(histMonths)) return;
    const tok = getAdminToken()?.token;
    if (!sb || !tok) { setHistMonths('missing'); return; }
    setHistMonths('loading');
    sb.rpc('get_dash_monthly', { p_session_token: tok }).then(({ data, error }) => {
      if (error || data?.error) { setHistMonths('missing'); return; }
      setHistMonths(Array.isArray(data) ? data : []);
    });
  };

  const rm = raffleCal[curMonth] || { m: '—', name: null };

  // Boletos vendidos SOLO de la rifa del MES ACTUAL: el RPC devuelve
  // participantes de TODAS las rifas (agrupados por raffle_id) — se
  // filtra por la rifa vigente (rm.dbId). Sin rifa configurada → 0.
  const [rafTickets, setRafTickets] = useState(null);
  useEffect(() => {
    if (!rm.dbId) { setRafTickets(0); return; }
    fetchRaffleParticipants().then(rows => {
      if (rows) {
        setRafTickets(rows
          .filter(p => p.raffle_id === rm.dbId)
          .reduce((s, p) => s + (+p.tickets || 0), 0));
      }
    });
  }, [rm.dbId]);

  // Top 10 POR ESTACIÓN (RPC get_station_top_members, migración
  // 20260806f) — sin migración el RPC no existe y la sección se omite.
  const [stationTop, setStationTop] = useState(null);
  useEffect(() => {
    if (!sb) return;
    const tok = getAdminToken()?.token;
    if (!tok) return;
    sb.rpc('get_station_top_members', { p_session_token: tok, p_limit: 10 })
      .then(({ data, error }) => {
        if (error) { console.warn('[Dash] top estaciones:', error.message); return; }
        if (Array.isArray(data)) setStationTop(data);
      });
  }, []);

  // Encuestas — derivadas de la actividad reciente cargada (activityLog
  // global, ~300 eventos). Antes se leía de ctx.surveys, que NUNCA se
  // poblaba (setSurveys no se llamaba) → la tarjeta mostraba 0 fijo.
  const surveyActs = Object.values(activityLog || {}).flat().filter(a => a.type === 'encuesta');
  const totalSurveys = surveyActs.length;
  const totalSPts = surveyActs.reduce((s, a) => s + (a.pts || 0), 0);
  const uniqueSurveyMembers = Object.values(activityLog || {}).filter(acts => acts.some(a => a.type === 'encuesta')).length;

  const firstName = (loggedAdmin?.name || '').trim().split(' ')[0] || 'Admin';

  // ===== estilos =====
  const card = { background: AT.card, borderRadius: 18, border: `1px solid ${AT.border}`, padding: 18 };
  // Tarjetas de fila: mismo ALTO que la más alta de su fila (el grid
  // hace stretch; height 100% + border-box lo aprovechan).
  const rowCard = { ...card, height: '100%', boxSizing: 'border-box' };
  const kicker = { fontSize: 10.5, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9E9E9E' };
  const cardTitle = { fontSize: 13.5, fontWeight: 800, color: '#E0E0E0', marginBottom: 12 };
  const big = { ...sMono, fontSize: 26, letterSpacing: -1, color: '#fff' };

  const Stat = ({ icon, value, label, sub, onClick, accent = '#fff' }) => (
    <div onClick={onClick} style={{ ...card, cursor: onClick ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={kicker}>{label}</div>
        <span style={{ color: BRAND_ORANGE, display: 'flex' }}>{icon}</span>
      </div>
      <div style={{ ...big, color: accent }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, fontWeight: 700, color: '#9E9E9E' }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ padding: '22px 22px 60px' }}>
      {/* Encabezado */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 21, fontWeight: 800, color: '#fff' }}>Hola, {firstName}</div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#9E9E9E', marginTop: 2 }}>
          Resumen del programa — {new Date().toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {/* ── Fila de estadísticas ── */}
      <div className="pp-dash-stats" style={{ marginBottom: 14 }}>
        <Stat icon={<Users />} label="Miembros" value={custs.length}
          sub={`+${newThisMonth} este mes`} onClick={() => setScr('mem')} />
        <Stat icon={<Gift />} label="Puntos sin canjear" value={ptsUnredeemed.toLocaleString('en-US')}
          sub={`Equivalen a Q${(+qUnredeemed).toLocaleString('en-US')}`} onClick={() => setScr('cat')} accent="#66BB6A" />
        <Stat icon={<Fuel />} label={monthReal ? `Galones · ${mesNombre}` : 'Galones (est.)'}
          value={Math.round(monthReal ? galMes : fuelTotalG).toLocaleString('en-US')}
          sub={monthReal ? `Total: ${Math.round(fuelTotalG).toLocaleString('en-US')} gal acumulados` : 'Acumulados por el programa'}
          onClick={() => openHistory('gal')} />
        <Stat icon={<Receipt />} label={monthReal ? `Ventas · ${mesNombre}` : 'Ventas (est.)'}
          value={`Q${Math.round(monthReal ? qMes : fuelTotalQ).toLocaleString('en-US')}`}
          sub={monthReal ? `Total: Q${Math.round(fuelTotalQ).toLocaleString('en-US')} facturados` : 'Combustible facturado'}
          accent="#FBBC04" onClick={() => openHistory('ventas')} />
      </div>

      {/* ── Gráficos ── */}
      <div className="pp-dash-cols pp-dash-cols-3" style={{ marginBottom: 14 }}>
        {/* Barras: ventas por estación — el MES en las barras, el total
            acumulado en el encabezado y en cada fila; clic = historial */}
        <div style={{ ...rowCard, cursor: 'pointer' }} onClick={() => openHistory('est')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: '#E0E0E0' }}>Ventas por estación · {mesNombre}</div>
            <div style={{ ...sMono, fontSize: 11, color: '#9E9E9E', whiteSpace: 'nowrap' }}>Total Q{Math.round(totalStationQ).toLocaleString('en-US')}</div>
          </div>
          {stationsMes.length === 0 && (
            <div style={{ fontSize: 12, color: '#777', fontWeight: 600, lineHeight: 1.6 }}>
              Sin datos de compras todavía — el gráfico se construye con las
              facturas registradas (RPC de KPIs).
            </div>
          )}
          {stationsMes.map((s, i) => {
            const pct = Math.max(s.mg / maxStationMesG * 100, 3);
            return (
              <div key={s.id || i} style={{ marginBottom: i < stationsMes.length - 1 ? 14 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: '#E0E0E0' }}>{s.name}</span>
                  <span style={{ ...sMono, fontSize: 13, color: '#FBBC04' }}>
                    {Math.round(s.mg).toLocaleString('en-US')}<span style={{ fontSize: 10, color: '#777' }}> gal</span>
                  </span>
                </div>
                <div style={{ height: 8, borderRadius: 5, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', borderRadius: 5, background: BRAND_ORANGE }} />
                </div>
                <div style={{ fontSize: 10.5, color: '#9E9E9E', fontWeight: 700, marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                  <span>{s.mp} compras · Q{Math.round(s.ma).toLocaleString('en-US')} en el mes</span>
                  <span style={{ color: '#66BB6A' }}>Total: {Math.round(s.gallons).toLocaleString('en-US')} gal</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dona: mezcla de combustible — el MES en la dona, el total
            acumulado en el encabezado; clic = historial. Sin RPC cae al
            estimado 45/35/20 sobre los acumulados (comportamiento F1). */}
        <div style={{ ...rowCard, cursor: 'pointer' }} onClick={() => openHistory('fuel')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: '#E0E0E0' }}>
              {monthReal ? `Mezcla de combustible · ${mesNombre}` : 'Mezcla de combustible (estimado)'}
            </div>
            <div style={{ ...sMono, fontSize: 11, color: '#9E9E9E', whiteSpace: 'nowrap' }}>Total {Math.round(fuelTotalG).toLocaleString('en-US')} gal</div>
          </div>
          {monthReal && monthFuelRows.length === 0 && (
            <div style={{ fontSize: 12, color: '#777', fontWeight: 600, lineHeight: 1.6 }}>
              Sin compras registradas este mes todavía.
            </div>
          )}
          {(() => {
            const donutRows = monthReal ? monthFuelRows : fuelRows;
            const donutG = monthReal ? galMes : fuelTotalG;
            if (monthReal && donutRows.length === 0) return null;
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <div style={{ position: 'relative', width: 128, height: 128, flexShrink: 0 }}>
                  <Donut parts={donutRows.map(f => ({ value: f.g, color: f.color }))} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ ...sMono, fontSize: 17, color: '#fff', letterSpacing: -0.5 }}>
                      {donutG >= 10000 ? `${Math.round(donutG / 1000)}k` : Math.round(donutG).toLocaleString('en-US')}
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 800, color: '#777', letterSpacing: 1 }}>GALONES</div>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {donutRows.map(f => (
                    <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: f.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: '#E0E0E0' }}>{f.label}</span>
                      <span style={{ ...sMono, fontSize: 12, color: '#fff' }}>{Math.round(f.g).toLocaleString('en-US')}</span>
                      <span style={{ fontSize: 10, color: '#777', fontWeight: 700, width: 54, textAlign: 'right' }}>
                        Q{f.q >= 10000 ? `${Math.round(f.q / 1000)}k` : Math.round(f.q).toLocaleString('en-US')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Barras: miembros por nivel — ALTAS del mes por nivel, el
            total de miembros en el encabezado y el total de cada nivel
            a la derecha de su barra; clic = historial de altas */}
        <div style={{ ...rowCard, cursor: 'pointer' }} onClick={() => openHistory('mem')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: '#E0E0E0' }}>Miembros por nivel · {mesNombre}</div>
            <div style={{ ...sMono, fontSize: 11, color: '#9E9E9E', whiteSpace: 'nowrap' }}>Total {custs.length.toLocaleString('en-US')}</div>
          </div>
          {['ORO', 'PLATINO', 'BLACK'].map(t => {
            const n = newByTier[t];
            const pct = Math.max(n / maxNewTier * 100, 2);
            return (
              <div key={t} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: TIER_COLORS[t], letterSpacing: 1 }}>{t}</span>
                  <span style={{ ...sMono, fontSize: 13, color: '#fff' }}>
                    +{n}<span style={{ fontSize: 10, color: '#777' }}> · {tierCount[t]} en total</span>
                  </span>
                </div>
                <div style={{ height: 8, borderRadius: 5, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', borderRadius: 5, background: TIER_COLORS[t] }} />
                </div>
              </div>
            );
          })}
          <div style={{ fontSize: 10.5, color: '#777', fontWeight: 700, marginTop: 2 }}>
            {newThisMonth} altas en {mesNombre.toLowerCase()} · Umbrales: PLATINO {cfg.tiers?.platino?.gal ?? 150} gal · BLACK {cfg.tiers?.black?.gal ?? 500} gal
          </div>
        </div>
      </div>

      {/* ── Programa: puntos, rifa y encuestas ── */}
      <div className="pp-dash-cols pp-dash-cols-3" style={{ marginBottom: 14 }}>
        {/* Economía de puntos */}
        <div onClick={() => setScr('cat')} style={{ ...rowCard, cursor: 'pointer' }}>
          <div style={cardTitle}>Puntos del programa</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
            <div style={{ ...sMono, fontSize: 28, letterSpacing: -1.5, color: '#fff' }}>{ptsTotal.toLocaleString('en-US')}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9E9E9E' }}>emitidos en total</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ background: 'rgba(46,125,50,.14)', borderRadius: 12, padding: 12 }}>
              <div style={{ ...kicker, color: '#66BB6A', marginBottom: 4 }}>Sin canjear</div>
              <div style={{ ...sMono, fontSize: 18, color: '#fff' }}>{ptsUnredeemed.toLocaleString('en-US')}</div>
              <div style={{ fontSize: 11, color: '#66BB6A', fontWeight: 700 }}>Q{(+qUnredeemed).toLocaleString('en-US')}</div>
            </div>
            <div style={{ background: 'rgba(230,81,0,.14)', borderRadius: 12, padding: 12 }}>
              <div style={{ ...kicker, color: '#FFB74D', marginBottom: 4 }}>Canjeados</div>
              <div style={{ ...sMono, fontSize: 18, color: '#fff' }}>{ptsRedeemed.toLocaleString('en-US')}</div>
              <div style={{ fontSize: 11, color: '#FFB74D', fontWeight: 700 }}>Q{(+qRedeemed).toLocaleString('en-US')}</div>
            </div>
          </div>
        </div>

        {/* Rifa del mes */}
        <div onClick={() => setScr('raf')} style={{ ...rowCard, cursor: 'pointer', display: 'flex', flexDirection: 'column' }}>
          <div style={cardTitle}>Rifa de {rm.m}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
            <div style={{ width: 52, height: 52, borderRadius: 15, background: '#FBBC04', color: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <TicketStar />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {rm.name || 'Sin premio configurado'}
              </div>
              <div style={{ fontSize: 11.5, color: '#9E9E9E', fontWeight: 700, marginTop: 3 }}>
                {rm.ticketPts ?? cfg.ticketPts} pts = 1 boleto{rm.v && rm.v !== 'Q0' ? ` · valorado en ${rm.v}` : ''}
              </div>
            </div>
            <span style={{ color: '#666', display: 'flex' }}><Chev /></span>
          </div>
          {/* Boletos vendidos del mes (RPC de participantes) */}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${AT.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ ...kicker }}>Boletos vendidos</span>
            <span style={{ ...sMono, fontSize: 18, color: '#FBBC04' }}>{rafTickets ?? '—'}</span>
          </div>
        </div>

        {/* Encuestas — informativa (el detalle por miembro vive en su
            ficha; el viejo click abría un modal que solo existe en la
            vista del cliente = acción zombie, retirada en Admin v2) */}
        <div style={{ ...rowCard, display: 'flex', flexDirection: 'column' }}>
          <div style={cardTitle}>Encuestas Shell</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
            <div style={{ width: 52, height: 52, borderRadius: 15, background: 'rgba(230,81,0,.2)', color: '#FF8F3C', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Clipboard />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: '#fff' }}>{totalSurveys.toLocaleString('en-US')} en actividad reciente</div>
              <div style={{ fontSize: 11.5, color: '#9E9E9E', fontWeight: 700, marginTop: 3 }}>
                {totalSPts.toLocaleString('en-US')} pts otorgados · {uniqueSurveyMembers.toLocaleString('en-US')} miembros · límite {cfg.surveyDaily}/día
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Top 10 GENERAL (galones acumulados del programa) —
          máx 5 columnas en monitor, flujo VERTICAL (el 2º debajo
          del 1º): multi-column CSS, no grid ── */}
      <div style={{ ...card, padding: '18px 6px 8px', marginBottom: 14 }}>
        <div style={{ ...cardTitle, padding: '0 14px' }}>Top 10 general — Galones comprados</div>
        <div className="pp-top-cols" style={{ padding: '0 8px' }}>
          {[...custs].sort((a, b) => b.gallons - a.gallons).slice(0, 10).map((c, i) => {
            const t = gT(c.gallons);
            return (
              <div key={c.id} onClick={() => { setSel(c); setScr('det'); }} style={{
                display: 'flex', alignItems: 'center', padding: '11px 8px',
                borderBottom: `1px solid ${AT.border}`, cursor: 'pointer',
              }}>
                <div style={{
                  width: 26, textAlign: 'center', marginRight: 10, ...sMono,
                  fontSize: 13, fontWeight: 800,
                  color: i < 3 ? BRAND_ORANGE : '#666',
                }}>
                  {i + 1}
                </div>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: t.bg, color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, marginRight: 12, flexShrink: 0 }}>
                  {c.name.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#E0E0E0' }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: '#9E9E9E', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}><Badge t={t} /></div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ ...sMono, fontSize: 14, fontWeight: 800, color: '#fff' }}>{Math.round(c.gallons).toLocaleString('en-US')}<span style={{ fontSize: 10, color: '#777', fontWeight: 600 }}> gal</span></div>
                  <div style={{ fontSize: 10, color: '#777', ...sMono }}>Q{Math.round(c.spent).toLocaleString('en-US')}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Top 10 POR ESTACIÓN (RPC get_station_top_members) — una
          tarjeta por estación, agregado de las facturas registradas.
          Sin la migración 20260806f el RPC no existe y la sección se
          omite sin romper nada. ── */}
      {stationTop?.length > 0 && (
        <div className="pp-dash-cols pp-dash-cols-3">
          {stationTop.map(st => (
            <div key={st.id} style={{ ...rowCard, padding: '18px 14px 8px' }}>
              <div style={{ ...cardTitle, padding: '0 4px' }}>Top 10 — {st.name}</div>
              {(!st.top || st.top.length === 0) && (
                <div style={{ fontSize: 12, color: '#777', fontWeight: 600, padding: '0 4px 12px' }}>
                  Sin compras registradas en esta estación.
                </div>
              )}
              {(st.top || []).map((r, i) => {
                const c = custs.find(x => x.id === r.member_id) || null;
                const t = gT(r.member_gallons ?? c?.gallons ?? 0);
                return (
                  <div key={r.member_id || i}
                    onClick={() => { if (c) { setSel(c); setScr('det'); } }}
                    style={{
                      display: 'flex', alignItems: 'center', padding: '10px 4px',
                      borderBottom: i < st.top.length - 1 ? `1px solid ${AT.border}` : 'none',
                      cursor: c ? 'pointer' : 'default',
                    }}>
                    <div style={{
                      width: 24, textAlign: 'center', marginRight: 8, ...sMono,
                      fontSize: 12.5, fontWeight: 800,
                      color: i < 3 ? BRAND_ORANGE : '#666',
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: t.bg, color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, marginRight: 10, flexShrink: 0 }}>
                      {(r.member_name || '?').charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#E0E0E0' }}>{r.member_name}</div>
                      <div style={{ fontSize: 10, color: '#9E9E9E', marginTop: 1 }}>{r.purchases} compras</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ ...sMono, fontSize: 13, fontWeight: 800, color: '#fff' }}>{Math.round(r.gallons).toLocaleString('en-US')}<span style={{ fontSize: 9.5, color: '#777', fontWeight: 600 }}> gal</span></div>
                      <div style={{ fontSize: 10, color: '#777', ...sMono }}>Q{Math.round(r.amount).toLocaleString('en-US')}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* ── Historial mensual (al presionar cada cuadro) ── */}
      <DashHistoryModal
        metric={histMetric}
        months={histMonths}
        custs={custs}
        gT={gT}
        totals={{
          gal: `Total acumulado: ${Math.round(fuelTotalG).toLocaleString('en-US')} gal`,
          ventas: `Total acumulado: Q${Math.round(fuelTotalQ).toLocaleString('en-US')}`,
          est: `Total acumulado: Q${Math.round(totalStationQ).toLocaleString('en-US')}`,
          fuel: `Total acumulado: ${Math.round(fuelTotalG).toLocaleString('en-US')} gal`,
          mem: `${custs.length.toLocaleString('en-US')} miembros en total`,
        }}
        onClose={() => setHistMetric(null)}
      />
    </div>
  );
}
