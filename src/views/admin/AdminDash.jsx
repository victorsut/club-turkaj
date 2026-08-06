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
import Badge from '../../components/ui/Badge';
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
    surveys, raffleCal, curMonth,
  } = ctx;

  // ===== KPIs =====
  const tP = custs.reduce((s, c) => s + c.points, 0);
  const tG = custs.reduce((s, c) => s + c.gallons, 0);
  const tSpent = custs.reduce((s, c) => s + c.spent, 0);
  const tRedeemed = custs.reduce((s, c) => s + (c.redeemed || 0), 0);
  const curYM = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const newThisMonth = custs.filter(c => c.registered?.startsWith(curYM)).length;
  const ptsRedeemed = tRedeemed * 175;
  const ptsUnredeemed = tP;
  const ptsTotal = ptsUnredeemed + ptsRedeemed;
  const qUnredeemed = (ptsUnredeemed / cfg.qPerPt).toFixed(0);
  const qRedeemed = (ptsRedeemed / cfg.qPerPt).toFixed(0);

  // Distribución por nivel (galones acumulados de cada miembro)
  const tierCount = { ORO: 0, PLATINO: 0, BLACK: 0 };
  custs.forEach(c => { tierCount[gT(c.gallons).name] += 1; });

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
  const maxStationG = Math.max(...stationRows.map(s => +s.gallons || 0), 1);

  const rm = raffleCal[curMonth] || { m: '—', name: null };

  // Encuestas
  const totalSurveys = surveys.length;
  const totalSPts = surveys.reduce((s, sv) => s + sv.pts, 0);
  const uniqueSurveyMembers = [...new Set(surveys.map(s => s.cid))].length;

  const firstName = (loggedAdmin?.name || '').trim().split(' ')[0] || 'Admin';

  // ===== estilos =====
  const card = { background: AT.card, borderRadius: 18, border: `1px solid ${AT.border}`, padding: 18 };
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
        <Stat icon={<Gift />} label="Puntos sin canjear" value={ptsUnredeemed.toLocaleString()}
          sub={`Equivalen a Q${(+qUnredeemed).toLocaleString()}`} onClick={() => setScr('cat')} accent="#66BB6A" />
        <Stat icon={<Fuel />} label={`Galones${fuelReal ? '' : ' (est.)'}`} value={Math.round(fuelTotalG).toLocaleString()}
          sub="Acumulados por el programa" />
        <Stat icon={<Receipt />} label={`Ventas${fuelReal ? '' : ' (est.)'}`} value={`Q${Math.round(fuelTotalQ).toLocaleString()}`}
          sub="Combustible facturado" accent="#FBBC04" />
      </div>

      {/* ── Gráficos ── */}
      <div className="pp-dash-cols pp-dash-cols-3" style={{ marginBottom: 14 }}>
        {/* Barras: ventas por estación */}
        <div style={card}>
          <div style={cardTitle}>Ventas por estación</div>
          {stationRows.length === 0 && (
            <div style={{ fontSize: 12, color: '#777', fontWeight: 600, lineHeight: 1.6 }}>
              Sin datos de compras todavía — el gráfico se construye con las
              facturas registradas (RPC de KPIs).
            </div>
          )}
          {stationRows.map((s, i) => {
            const m = (kpis?.stations_month || []).find(x => x.id === s.id);
            const pct = Math.max((+s.gallons || 0) / maxStationG * 100, 3);
            return (
              <div key={s.id || i} style={{ marginBottom: i < stationRows.length - 1 ? 14 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: '#E0E0E0' }}>{s.name}</span>
                  <span style={{ ...sMono, fontSize: 13, color: '#FBBC04' }}>
                    {Math.round(s.gallons).toLocaleString()}<span style={{ fontSize: 10, color: '#777' }}> gal</span>
                  </span>
                </div>
                <div style={{ height: 8, borderRadius: 5, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', borderRadius: 5, background: BRAND_ORANGE }} />
                </div>
                <div style={{ fontSize: 10.5, color: '#9E9E9E', fontWeight: 700, marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                  <span>{s.purchases} compras · Q{Math.round(s.amount).toLocaleString()}</span>
                  <span style={{ color: '#66BB6A' }}>Mes: {Math.round(m?.gallons || 0).toLocaleString()} gal</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dona: mezcla de combustible */}
        <div style={card}>
          <div style={cardTitle}>Mezcla de combustible{fuelReal ? '' : ' (estimado)'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ position: 'relative', width: 128, height: 128, flexShrink: 0 }}>
              <Donut parts={fuelRows.map(f => ({ value: f.g, color: f.color }))} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ ...sMono, fontSize: 17, color: '#fff', letterSpacing: -0.5 }}>{Math.round(fuelTotalG / 1000)}k</div>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#777', letterSpacing: 1 }}>GALONES</div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {fuelRows.map(f => (
                <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: f.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: '#E0E0E0' }}>{f.label}</span>
                  <span style={{ ...sMono, fontSize: 12, color: '#fff' }}>{Math.round(f.g).toLocaleString()}</span>
                  <span style={{ fontSize: 10, color: '#777', fontWeight: 700, width: 54, textAlign: 'right' }}>Q{Math.round(f.q / 1000)}k</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Barras: miembros por nivel */}
        <div style={card}>
          <div style={cardTitle}>Miembros por nivel</div>
          {['ORO', 'PLATINO', 'BLACK'].map(t => {
            const n = tierCount[t];
            const pct = Math.max(n / Math.max(custs.length, 1) * 100, 2);
            return (
              <div key={t} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: TIER_COLORS[t], letterSpacing: 1 }}>{t}</span>
                  <span style={{ ...sMono, fontSize: 13, color: '#fff' }}>{n}</span>
                </div>
                <div style={{ height: 8, borderRadius: 5, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', borderRadius: 5, background: TIER_COLORS[t] }} />
                </div>
              </div>
            );
          })}
          <div style={{ fontSize: 10.5, color: '#777', fontWeight: 700, marginTop: 2 }}>
            Umbrales: PLATINO {cfg.tiers?.platino?.gal ?? 150} gal · BLACK {cfg.tiers?.black?.gal ?? 500} gal
          </div>
        </div>
      </div>

      {/* ── Programa: puntos, rifa y encuestas ── */}
      <div className="pp-dash-cols pp-dash-cols-3" style={{ marginBottom: 14 }}>
        {/* Economía de puntos */}
        <div onClick={() => setScr('cat')} style={{ ...card, cursor: 'pointer' }}>
          <div style={cardTitle}>Puntos del programa</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
            <div style={{ ...sMono, fontSize: 28, letterSpacing: -1.5, color: '#fff' }}>{ptsTotal.toLocaleString()}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9E9E9E' }}>emitidos en total</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ background: 'rgba(46,125,50,.14)', borderRadius: 12, padding: 12 }}>
              <div style={{ ...kicker, color: '#66BB6A', marginBottom: 4 }}>Sin canjear</div>
              <div style={{ ...sMono, fontSize: 18, color: '#fff' }}>{ptsUnredeemed.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: '#66BB6A', fontWeight: 700 }}>Q{(+qUnredeemed).toLocaleString()}</div>
            </div>
            <div style={{ background: 'rgba(230,81,0,.14)', borderRadius: 12, padding: 12 }}>
              <div style={{ ...kicker, color: '#FFB74D', marginBottom: 4 }}>Canjeados</div>
              <div style={{ ...sMono, fontSize: 18, color: '#fff' }}>{ptsRedeemed.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: '#FFB74D', fontWeight: 700 }}>Q{(+qRedeemed).toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Rifa del mes */}
        <div onClick={() => setScr('raf')} style={{ ...card, cursor: 'pointer', display: 'flex', flexDirection: 'column' }}>
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
        </div>

        {/* Encuestas — informativa (el detalle por miembro vive en su
            ficha; el viejo click abría un modal que solo existe en la
            vista del cliente = acción zombie, retirada en Admin v2) */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>
          <div style={cardTitle}>Encuestas Shell</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
            <div style={{ width: 52, height: 52, borderRadius: 15, background: 'rgba(230,81,0,.2)', color: '#FF8F3C', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Clipboard />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: '#fff' }}>{totalSurveys} completadas</div>
              <div style={{ fontSize: 11.5, color: '#9E9E9E', fontWeight: 700, marginTop: 3 }}>
                {totalSPts} pts otorgados · {uniqueSurveyMembers} miembros · límite {cfg.surveyDaily}/día
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Top 10 galones ── */}
      <div style={{ ...card, padding: '18px 6px 8px' }}>
        <div style={{ ...cardTitle, padding: '0 14px' }}>Top 10 — Galones comprados</div>
        <div className="pp-adm-grid" style={{ padding: '0 8px' }}>
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
                  <div style={{ ...sMono, fontSize: 14, fontWeight: 800, color: '#fff' }}>{c.gallons.toFixed(0)}<span style={{ fontSize: 10, color: '#777', fontWeight: 600 }}> gal</span></div>
                  <div style={{ fontSize: 10, color: '#777', ...sMono }}>Q{c.spent.toLocaleString()}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
