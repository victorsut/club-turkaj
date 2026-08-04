// src/views/admin/AdminDash.jsx
// Admin dashboard — KPIs, points economy, fuel stats, top members, surveys
import { useState, useEffect } from 'react';
import { sb } from '../../lib/supabaseClient';
import { sMono, adminTheme as AT, btnYellow, BRAND_ORANGE } from '../../constants/styles';
import { getAdminToken } from '../../services/sessionTokens';
import Badge from '../../components/ui/Badge';
import { Gear, Logout, QR as QRIcon, Plus } from '../../components/ui/Icons';

export default function AdminDash(ctx) {
  const {
    custs, gT, cfg, setScr, setModal, setSel, fire, logout,
    surveys, showSurveys, setShowSurveys,
    raffleCal, curMonth, operators, activityLog,
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
  const qTotal = (ptsTotal / cfg.qPerPt).toFixed(2);
  const qUnredeemed = (ptsUnredeemed / cfg.qPerPt).toFixed(2);
  const qRedeemed = (ptsRedeemed / cfg.qPerPt).toFixed(2);

  // Fuel breakdown (estimated — fallback si el RPC de KPIs no responde)
  const gSuper = +(tG * 0.45).toFixed(0);
  const gRegular = +(tG * 0.35).toFixed(0);
  const gDiesel = +(tG - gSuper - gRegular).toFixed(0);
  const iSuper = +(gSuper * (cfg.fuelPrices?.super ?? 0)).toFixed(0);
  const iRegular = +(gRegular * (cfg.fuelPrices?.regular ?? 0)).toFixed(0);
  const iDiesel = +(gDiesel * (cfg.fuelPrices?.diesel ?? 0)).toFixed(0);

  // ── KPIs REALES (F1, 4-ago): agregados de purchases por RPC — el
  // SELECT de purchases quedó cerrado en SEC.C.2, por eso get_admin_kpis
  // (sesión de admin). Sin RPC o sin datos, el desglose cae al estimado.
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
    super:   { label: 'Súper',   color: '#E65100' },
    regular: { label: 'Regular', color: '#2E7D32' },
    diesel:  { label: 'Diésel',  color: '#1565C0' },
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
        { key: 'super',   label: 'Súper',   color: '#E65100', g: gSuper,   q: iSuper },
        { key: 'regular', label: 'Regular', color: '#2E7D32', g: gRegular, q: iRegular },
        { key: 'diesel',  label: 'Diésel',  color: '#1565C0', g: gDiesel,  q: iDiesel },
      ];
  const fuelTotalG = fuelReal ? fuelRows.reduce((s, f) => s + f.g, 0) : tG;
  const fuelTotalQ = fuelReal ? fuelRows.reduce((s, f) => s + f.q, 0) : tSpent;

  const rm = raffleCal[curMonth] || { m: '—', p: '—' };

  // Survey stats
  const totalSurveys = surveys.length;
  const totalSPts = surveys.reduce((s, sv) => s + sv.pts, 0);
  const uniqueSurveyMembers = [...new Set(surveys.map(s => s.cid))].length;

  const aCard = { background: AT.card, borderRadius: 18, border: `1px solid ${AT.border}` };

  const Pair = ({ l, r, onL, onR }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 20px', marginBottom: 10 }}>
      <div onClick={onL} style={{ ...aCard, padding: 16, cursor: onL ? 'pointer' : 'default' }}>{l}</div>
      <div onClick={onR} style={{ background: '#FBBC04', borderRadius: 18, padding: 16, cursor: onR ? 'pointer' : 'default' }}>{r}</div>
    </div>
  );

  const aSec = { padding: '20px 20px 8px', fontSize: 12, fontWeight: 800, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: 2 };

  return (
    <div style={{ paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ padding: '24px 20px 16px', background: 'linear-gradient(180deg,#252525,' + AT.bg + ')' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="Puntos Plus" style={{ width: 40, height: 40, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,.3)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>Puntos<span style={{ color: BRAND_ORANGE }}>Plus</span></div>
            <div style={{ fontSize: 12, color: '#777', fontWeight: 600 }}>Panel de Administración</div>
          </div>
          <button onClick={() => setScr('cfg')} style={{ width: 40, height: 40, borderRadius: 12, background: AT.card, border: `1px solid ${AT.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9E9E9E' }}><Gear /></button>
          <button onClick={logout} title="Cerrar sesión" style={{ width: 40, height: 40, borderRadius: 12, background: AT.card, border: `1px solid ${AT.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9E9E9E' }}><Logout /></button>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ padding: '12px 20px 6px', display: 'flex', gap: 10 }}>
        <button onClick={() => setModal('scan')} style={{ ...btnYellow, flex: 1, padding: 12, fontSize: 14, borderRadius: 14 }}><QRIcon /> Escanear</button>
        <button onClick={() => setModal('newC')} style={{ flex: 1, padding: 12, borderRadius: 14, border: `1px solid ${AT.border}`, background: AT.card, fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: AT.txt }}><Plus /> Nuevo</button>
      </div>

      {/* Responsivo (4-ago): en pantallas anchas los dos grupos de
          secciones fluyen lado a lado (pp-adm-dash); en móvil apilan
          en el orden de siempre. */}
      <div className="pp-adm-dash">
      <div>
      {/* Members */}
      <div style={aSec}>Miembros</div>
      <Pair
        onL={() => setScr('mem')} onR={() => setScr('mem')}
        l={<><div style={{ ...sMono, fontSize: 26, letterSpacing: -1, color: '#fff' }}>{custs.length}</div><div style={{ fontSize: 11, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4, fontWeight: 700 }}>Miembros actuales</div></>}
        r={<><div style={{ ...sMono, fontSize: 26, letterSpacing: -1 }}>{newThisMonth}</div><div style={{ fontSize: 11, color: 'rgba(0,0,0,.45)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4, fontWeight: 700 }}>Nuevos este mes</div></>}
      />

      {/* Points Economy */}
      <div style={aSec}>Puntos del Programa</div>
      <div onClick={() => setScr('cat')} style={{ margin: '0 20px 10px', padding: 20, ...aCard, cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ ...sMono, fontSize: 32, letterSpacing: -2, color: '#fff' }}>{ptsTotal.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: '#9E9E9E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Puntos totales</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ ...sMono, fontSize: 28, letterSpacing: -2, color: '#2E7D32' }}>Q{qTotal}</div>
            <div style={{ fontSize: 11, color: '#9E9E9E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Equivalente</div>
          </div>
        </div>
        <div style={{ height: 1, background: AT.border, margin: '0 0 14px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ background: 'rgba(46,125,50,.15)', borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#66BB6A', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>🟢 Sin canjear</div>
            <div style={{ ...sMono, fontSize: 22, letterSpacing: -1, color: '#fff' }}>{ptsUnredeemed.toLocaleString()}</div>
            <div style={{ fontSize: 12, color: '#66BB6A', fontWeight: 700, marginTop: 2 }}>Q{qUnredeemed}</div>
          </div>
          <div style={{ background: 'rgba(230,81,0,.15)', borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#FFB74D', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>🟠 Canjeados</div>
            <div style={{ ...sMono, fontSize: 22, letterSpacing: -1, color: '#fff' }}>{ptsRedeemed.toLocaleString()}</div>
            <div style={{ fontSize: 12, color: '#FFB74D', fontWeight: 700, marginTop: 2 }}>Q{qRedeemed}</div>
          </div>
        </div>
      </div>

      {/* Fuel Stats — reales desde purchases (RPC F1) o estimado */}
      <div style={aSec}>Galones Vendidos{fuelReal ? '' : ' (estimado)'}</div>
      <Pair
        l={<>
          {fuelRows.map((f, i) => (
            <div key={f.key} style={{ fontSize: 13, fontWeight: 700, color: f.color, marginTop: i > 0 ? 8 : 0 }}>⛽ {f.label}<span style={{ ...sMono, float: 'right', color: '#fff' }}>{Math.round(f.g).toLocaleString()}</span></div>
          ))}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${AT.border}`, fontSize: 13, fontWeight: 800, color: '#fff' }}>Total<span style={{ ...sMono, float: 'right' }}>{fuelTotalG.toFixed(0)} gal</span></div>
        </>}
        r={<>
          {fuelRows.map((f, i) => (
            <div key={f.key} style={{ fontSize: 13, fontWeight: 700, color: 'rgba(0,0,0,.7)', marginTop: i > 0 ? 8 : 0 }}>{f.label}<span style={{ ...sMono, float: 'right' }}>Q{Math.round(f.q).toLocaleString()}</span></div>
          ))}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(0,0,0,.15)', fontSize: 13, fontWeight: 800 }}>Total<span style={{ ...sMono, float: 'right' }}>Q{Math.round(fuelTotalQ).toLocaleString()}</span></div>
        </>}
      />

      </div>
      <div>
      {/* Raffle */}
      <div style={aSec}>Rifa: {rm.m}</div>
      <div onClick={() => setScr('raf')} style={{ margin: '0 20px', padding: 16, background: 'linear-gradient(135deg,#FBBC04,#FFD540)', borderRadius: 18, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
        <div style={{ fontSize: 32 }}>{(rm.p || '').split(' ')[0]}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{rm.p}</div>
          <div style={{ fontSize: 12, opacity: .6 }}>{rm.ticketPts ?? cfg.ticketPts} pts = 1 boleto</div>
        </div>
        <div style={{ fontSize: 18, opacity: .4 }}>→</div>
      </div>

      {/* Surveys */}
      <div style={aSec}>Encuestas Shell</div>
      <div onClick={() => setShowSurveys(true)} style={{ margin: '0 20px 10px', padding: 16, background: 'linear-gradient(135deg,#3A2800,#4A3000)', borderRadius: 18, border: '2px solid #E65100', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: '#E65100', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📊</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#fff' }}>{totalSurveys} encuestas completadas</div>
          <div style={{ fontSize: 11, color: '#BDBDBD', marginTop: 2 }}>{totalSPts} pts otorgados · {uniqueSurveyMembers} miembros</div>
          <div style={{ fontSize: 10, color: '#FFB74D', fontWeight: 700, marginTop: 2 }}>Límite: {cfg.surveyDaily}/día por cliente · ≈ Q{(totalSPts / cfg.qPerPt).toFixed(2)}</div>
        </div>
        <div style={{ fontSize: 18, color: '#666' }}>→</div>
      </div>

      {/* Ventas por estación (F1: purchases.station_id es dato confiable
          de cada factura desde el modelo operador-por-factura) */}
      {kpis?.stations?.length > 0 && (
        <>
          <div style={aSec}>Ventas por Estación</div>
          <div style={{ margin: '0 20px 10px', ...aCard, padding: '4px 16px' }}>
            {kpis.stations.map((s, i) => {
              const m = (kpis.stations_month || []).find(x => x.id === s.id);
              return (
                <div key={s.id || i} style={{ padding: '12px 0', borderBottom: i < kpis.stations.length - 1 ? `1px solid ${AT.border}` : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#E0E0E0' }}>{s.name}</div>
                    <div style={{ ...sMono, fontSize: 14, fontWeight: 800, color: '#FBBC04' }}>{Math.round(s.gallons).toLocaleString()}<span style={{ fontSize: 10, color: '#777' }}> gal</span></div>
                  </div>
                  <div style={{ fontSize: 11, color: '#9E9E9E', marginTop: 3, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{s.purchases} compras · Q{Math.round(s.amount).toLocaleString()}</span>
                    <span style={{ color: '#66BB6A', fontWeight: 700 }}>Este mes: {Math.round(m?.gallons || 0).toLocaleString()} gal</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Top 10 */}
      <div style={aSec}>Top 10 — Galones Comprados</div>
      {[...custs].sort((a, b) => b.gallons - a.gallons).slice(0, 10).map((c, i) => {
        const t = gT(c.gallons);
        const medals = ['🥇', '🥈', '🥉'];
        return (
          <div key={c.id} onClick={() => { setSel(c); setScr('det'); }} style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: `1px solid ${AT.border}`, cursor: 'pointer' }}>
            <div style={{ width: 28, textAlign: 'center', fontSize: i < 3 ? 18 : 13, fontWeight: 800, color: i < 3 ? undefined : '#666', marginRight: 10, ...sMono }}>{i < 3 ? medals[i] : i + 1}</div>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: t.bg, color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, marginRight: 12, flexShrink: 0 }}>{c.name.charAt(0)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#E0E0E0' }}>{c.name}</div>
              <div style={{ fontSize: 11, color: '#9E9E9E', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}><Badge t={t} /></div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ ...sMono, fontSize: 15, fontWeight: 800, color: '#fff' }}>{c.gallons.toFixed(0)}<span style={{ fontSize: 10, color: '#777', fontWeight: 600 }}>gal</span></div>
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
