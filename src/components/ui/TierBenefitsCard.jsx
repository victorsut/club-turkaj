// src/components/ui/TierBenefitsCard.jsx
// Tarjeta de nivel con beneficios (FORMATO GENERAL) — sustituye al
// TierCard viejo (emojis + "invitar amigo"): banda con la identidad
// del tier y filas de beneficios con iconos SVG en el acento del
// nivel. Mismas reglas del modal de nivel del home: WiFi solo
// PLATINO/BLACK y sin invitar amigos. La usan el Menú del cliente
// (Niveles) y el admin (Rules, MemberDetail) — `surface`/`ink`
// adaptan la tarjeta al tema claro u oscuro de cada vista.
import { tierAccent, tierBand } from '../../constants/styles';
import { Fuel, Tag, Wifi, Door, Cake } from './Icons';

export default function TierBenefitsCard({ t, cfg, pill, surface = '#fff', ink = '#424242', style }) {
  const ptGal = cfg.tiers?.platino?.gal ?? 150;
  const bkGal = cfg.tiers?.black?.gal ?? 500;
  const ranges = {
    ORO: `0 – ${ptGal - 1} galones`,
    PLATINO: `${ptGal} – ${bkGal - 1} galones`,
    BLACK: `${bkGal}+ galones`,
  };
  // Sin línea de descuento por galón ni de rifa mensual (decisión del
  // dueño 24-jul-2026: ya no se muestran como beneficio del nivel).
  const bens = [
    { icon: <Fuel />, txt: `1 pt por cada Q${t.qPerPt ?? cfg.qPerPt}` },
    ...(t.redeemDisc > 0 ? [{ icon: <Tag />, txt: `-${Math.round(t.redeemDisc * 100)}% en canje de premios` }] : []),
    ...(t.name !== 'ORO' ? [{ icon: <Wifi />, txt: 'WiFi gratis ilimitado' }] : []),
    ...(t.bath ? [{ icon: <Door />, txt: 'Acceso a baños' }] : []),
    { icon: <Cake />, txt: `${t.evtPts} pts en eventos especiales` },
  ];

  return (
    <div style={{ borderRadius: 20, overflow: 'hidden', background: surface, ...style }}>
      {/* Banda con la identidad del tier (centrada — regla del dueño) */}
      <div style={{ background: tierBand(t.name), padding: '16px 18px', textAlign: 'center', color: '#fff' }}>
        <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, opacity: .85 }}>Nivel</div>
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 1, lineHeight: 1.3 }}>{t.name}</div>
        <div style={{ fontSize: 12, fontWeight: 700, opacity: .85 }}>{ranges[t.name]}</div>
        {pill && (
          <div style={{ display: 'inline-block', marginTop: 8, background: 'rgba(255,255,255,.25)', borderRadius: 8, padding: '3px 10px', fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>
            {pill}
          </div>
        )}
      </div>
      <div style={{ padding: '14px 18px' }}>
        {bens.map((b, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
            <span style={{ width: 24, display: 'flex', justifyContent: 'center', color: tierAccent(t.name), flexShrink: 0 }}>{b.icon}</span>
            <span style={{ fontSize: 13, color: ink, fontWeight: 600 }}>{b.txt}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
