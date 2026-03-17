// src/views/admin/Settings.jsx
// Admin settings — program config, fuel prices, tier thresholds
import { sMono, adminTheme as AT, btnYellow } from '../../constants/styles';
import { FUEL } from '../../constants/config';
import { Back } from '../../components/ui/Icons';

export default function Settings(ctx) {
  const { cfg, setScr, fire, operators, setScr: navTo } = ctx;

  const aSec = { padding: '20px 20px 8px', fontSize: 12, fontWeight: 800, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: 2 };
  const aCard = { background: AT.card, borderRadius: 18, border: `1px solid ${AT.border}`, margin: '0 20px 12px', padding: 16 };
  const row = { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${AT.border}`, fontSize: 13 };

  return (
    <div style={{ paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${AT.border}`, background: '#252525', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setScr('dash')} style={{ background: 'none', border: 'none', color: '#9E9E9E', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600 }}><Back /> Inicio</button>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Configuración</div>
        <div style={{ width: 80 }} />
      </div>

      {/* Quick Links */}
      <div style={{ display: 'flex', gap: 10, padding: '12px 20px' }}>
        <button onClick={() => setScr('rules')} style={{ flex: 1, padding: 14, borderRadius: 14, background: AT.card, border: `1px solid ${AT.border}`, fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#FBBC04' }}>📋 Ver Reglas</button>
        <button onClick={() => setScr('ops')} style={{ flex: 1, padding: 14, borderRadius: 14, background: AT.card, border: `1px solid ${AT.border}`, fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#64B5F6' }}>👷 Operadores</button>
      </div>

      {/* Conversión */}
      <div style={aSec}>Conversión</div>
      <div style={aCard}>
        <div style={row}>
          <span style={{ color: '#9E9E9E', fontWeight: 600 }}>Quetzales por punto</span>
          <span style={{ color: '#FBBC04', fontWeight: 800, ...sMono }}>Q{cfg.qPerPt}</span>
        </div>
        <div style={row}>
          <span style={{ color: '#9E9E9E', fontWeight: 600 }}>Puntos por boleto rifa</span>
          <span style={{ color: '#FBBC04', fontWeight: 800, ...sMono }}>{cfg.ticketPts} pts</span>
        </div>
        <div style={row}>
          <span style={{ color: '#9E9E9E', fontWeight: 600 }}>Pts registro base</span>
          <span style={{ color: '#2E7D32', fontWeight: 800, ...sMono }}>{cfg.regBase} pts</span>
        </div>
        <div style={row}>
          <span style={{ color: '#9E9E9E', fontWeight: 600 }}>Pts campo opcional</span>
          <span style={{ color: '#2E7D32', fontWeight: 800, ...sMono }}>+{cfg.regOptional} pts</span>
        </div>
        <div style={row}>
          <span style={{ color: '#9E9E9E', fontWeight: 600 }}>Pts referido</span>
          <span style={{ color: '#7B1FA2', fontWeight: 800, ...sMono }}>{cfg.referralPts} pts</span>
        </div>
        <div style={{ ...row, borderBottom: 'none' }}>
          <span style={{ color: '#9E9E9E', fontWeight: 600 }}>Encuestas diarias</span>
          <span style={{ color: '#1565C0', fontWeight: 800, ...sMono }}>{cfg.surveyDaily}/día · {cfg.surveyPts} pts</span>
        </div>
      </div>

      {/* Fuel Prices */}
      <div style={aSec}>Precios de Combustible</div>
      <div style={aCard}>
        {[
          { name: 'Súper', price: FUEL.super, color: '#E65100' },
          { name: 'Regular', price: FUEL.regular, color: '#2E7D32' },
          { name: 'Diésel', price: FUEL.diesel, color: '#1565C0' },
        ].map((f, i) => (
          <div key={f.name} style={{ ...row, borderBottom: i < 2 ? `1px solid ${AT.border}` : 'none' }}>
            <span style={{ color: f.color, fontWeight: 700 }}>⛽ {f.name}</span>
            <span style={{ color: '#fff', fontWeight: 800, ...sMono }}>Q{f.price.toFixed(2)}/gal</span>
          </div>
        ))}
      </div>

      {/* Tiers */}
      <div style={aSec}>Niveles (Tiers)</div>
      <div style={aCard}>
        <div style={row}>
          <span style={{ color: '#FBBC04', fontWeight: 700 }}>🟡 ORO</span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>0 – {(cfg.tiers?.platino?.gal || 150) - 1} gal</span>
        </div>
        <div style={row}>
          <span style={{ color: '#9E9E9E', fontWeight: 700 }}>💎 PLATINO</span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>{cfg.tiers?.platino?.gal || 150} – {(cfg.tiers?.black?.gal || 500) - 1} gal</span>
        </div>
        <div style={row}>
          <span style={{ color: '#9E9E9E', fontWeight: 700 }}>🖤 BLACK</span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>{cfg.tiers?.black?.gal || 500}+ gal</span>
        </div>
        {cfg.tiers?.platino && (
          <>
            <div style={{ height: 1, background: AT.border, margin: '8px 0' }} />
            <div style={row}>
              <span style={{ color: '#9E9E9E', fontWeight: 600 }}>PLATINO desc/galón</span>
              <span style={{ ...sMono, color: '#64B5F6' }}>Q{cfg.tiers.platino.discGal.toFixed(2)}</span>
            </div>
            <div style={row}>
              <span style={{ color: '#9E9E9E', fontWeight: 600 }}>PLATINO desc canje</span>
              <span style={{ ...sMono, color: '#64B5F6' }}>{Math.round(cfg.tiers.platino.discRedeem * 100)}%</span>
            </div>
            <div style={row}>
              <span style={{ color: '#9E9E9E', fontWeight: 600 }}>BLACK desc/galón</span>
              <span style={{ ...sMono, color: '#CE93D8' }}>Q{cfg.tiers.black.discGal.toFixed(2)}</span>
            </div>
            <div style={{ ...row, borderBottom: 'none' }}>
              <span style={{ color: '#9E9E9E', fontWeight: 600 }}>BLACK desc canje</span>
              <span style={{ ...sMono, color: '#CE93D8' }}>{Math.round(cfg.tiers.black.discRedeem * 100)}%</span>
            </div>
          </>
        )}
      </div>

      {/* Degradation */}
      <div style={aSec}>Degradación por Inactividad</div>
      <div style={aCard}>
        {(cfg.degrad || []).map((d, i) => (
          <div key={i} style={{ marginBottom: i < (cfg.degrad || []).length - 1 ? 12 : 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 6, color: d.tier === 'BLACK' ? '#CE93D8' : d.tier === 'PLATINO' ? '#64B5F6' : '#FFB74D' }}>{d.tier}</div>
            {d.rules.map((r, j) => (
              <div key={j} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
                <span style={{ color: '#aaa', fontWeight: 700 }}>{r.days} días</span>
                <span style={{ color: '#EF5350', fontWeight: 600 }}>{r.effect}</span>
              </div>
            ))}
          </div>
        ))}
        <div style={{ marginTop: 8, fontSize: 11, color: '#2E7D32', fontWeight: 700 }}>✅ Cualquier compra (hasta Q10) resetea el reloj</div>
      </div>
    </div>
  );
}
