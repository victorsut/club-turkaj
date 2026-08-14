// src/views/client/home/TierDetailModal.jsx
// Detalle del nivel (tocar la tarjeta — D34, FORMATO GENERAL): banda
// superior con la identidad sólida del tier (regla inamovible: ORO
// dorado, PLATINO metálico, BLACK galaxia) y lista de beneficios con
// iconos SVG. Extraído VERBATIM de ClientHome (división 14-ago).
import GrowModal from '../../../components/ui/GrowModal';
import GalaxyDust from '../../../components/ui/GalaxyDust';
import { Fuel, Tag, Wifi, Cake } from '../../../components/ui/Icons';

export default function TierDetailModal({
  onClose, origin, tint, tierTint, tierAccent, isBlack, dark, cTier, cfg,
}) {
  // Beneficios del nivel (FORMATO GENERAL, iconos SVG sin emojis). El
  // WiFi gratis solo aparece en PLATINO/BLACK (en ORO se omite la
  // línea); sin "invitar amigos" (feedback 21-jul). Sin descuento por
  // galón ni rifa mensual (decisión del dueño 24-jul) ni acceso a
  // baños (decisión del dueño 11-ago).
  const bens = [
    { icon: <Fuel />, t: `1 pt por cada Q${cTier.qPerPt ?? cfg.qPerPt}` },
    ...(cTier.redeemDisc > 0 ? [{ icon: <Tag />, t: `-${Math.round(cTier.redeemDisc * 100)}% en canje de premios` }] : []),
    ...(cTier.name !== 'ORO' ? [{ icon: <Wifi />, t: 'WiFi gratis ilimitado' }] : []),
    { icon: <Cake />, t: `${cTier.evtPts} pts en eventos especiales` },
  ];

  return (
    <GrowModal onClose={onClose} origin={origin} tint={tint}
      background={dark ? '#101018' : '#fff'} arrowColor="#fff">
      {() => (<>
        {/* Banda de identidad del nivel (centrada — feedback 21-jul) */}
        <div style={{ background: tierTint, color: '#fff', padding: '22px 20px 18px', position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
          {isBlack && dark && <GalaxyDust n={10} />}
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.85 }}>
              Tu nivel
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.15, letterSpacing: 0.5 }}>
              {cTier.name}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.9, marginTop: 2 }}>
              {cTier.next ? `${cTier.base} – ${cTier.target - 1} galones` : `${cTier.base}+ galones`}
            </div>
          </div>
        </div>

        <div style={{ padding: '8px 20px 20px' }}>
          {bens.map((b, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0',
              borderBottom: i < bens.length - 1 ? `1px solid ${dark ? 'rgba(255,255,255,.08)' : '#F0F0F0'}` : 'none',
              fontSize: 13, fontWeight: 600, color: dark ? '#E0E0E0' : '#424242',
            }}>
              <span style={{ width: 24, display: 'flex', justifyContent: 'center', color: tierAccent, flexShrink: 0 }}>{b.icon}</span>
              <span>{b.t}</span>
            </div>
          ))}
          {cTier.next && (
            <div style={{ marginTop: 12, fontSize: 11, fontWeight: 700, color: dark ? 'rgba(255,255,255,.45)' : '#9E9E9E', textAlign: 'center' }}>
              Faltan {cTier.rem} galones para {cTier.next}
            </div>
          )}
        </div>
      </>)}
    </GrowModal>
  );
}
