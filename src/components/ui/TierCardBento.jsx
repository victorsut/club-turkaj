// src/components/ui/TierCardBento.jsx
// R1b (D34) — Tarjeta de nivel compacta del home bento. Tema por tier
// (regla inamovible: ORO dorado, PLATINO metálico, BLACK galaxia).
// Doble zona táctil: área general → detalle del nivel; área de
// puntos → pestaña Canjes. Número de puntos con count-up (D35).
import { sMono } from '../../constants/styles';
import { tierProgress } from '../../lib/tierSystem';
import TierDeco from './TierDeco';
import GalaxyDust from './GalaxyDust';
import useCountUp from '../../hooks/useCountUp';

export default function TierCardBento({ me, cTier, onOpenDetail, onPointsTap }) {
  const isBlack = cTier.name === 'BLACK';
  const isPlat = cTier.name === 'PLATINO';
  const pg = tierProgress(me.gallons, cTier);
  const points = useCountUp(me.points);

  const bg = isBlack
    ? 'radial-gradient(ellipse at 20% 30%, #0d0d1a 0%, #050508 40%, #000 100%)'
    : isPlat
    ? 'linear-gradient(135deg,#9E9E9E 0%,#BDBDBD 30%,#CFD8DC 60%,#BDBDBD 100%)'
    : 'linear-gradient(135deg,#FBBC04 0%,#FFD540 50%,#FBBC04 100%)';
  const shadow = isBlack ? '0 12px 40px rgba(0,0,0,.6)' : isPlat ? '0 6px 24px rgba(21,101,192,.2)' : '0 8px 32px rgba(251,188,4,.25)';
  const border = isBlack ? 'none' : isPlat ? '2px solid #1565C0' : '2px solid #E6A800';
  const txt = cTier.color;
  const barBg = isBlack ? 'rgba(255,255,255,.15)' : isPlat ? 'rgba(0,0,0,.15)' : 'rgba(0,0,0,.08)';
  const barFill = isBlack ? '#fff' : isPlat ? '#1565C0' : '#000';

  return (
    <div
      onClick={onOpenDetail}
      className="pp-tile"
      style={{
        borderRadius: 20, padding: '13px 16px', margin: '10px 16px 0',
        background: bg, color: txt, border, boxShadow: shadow,
        position: 'relative', overflow: 'hidden', cursor: 'pointer',
      }}
    >
      <TierDeco name={cTier.name} />
      {isBlack && <GalaxyDust n={12} />}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'stretch', gap: 12 }}>
        {/* Zona izquierda: nivel + progreso de galones → detalle */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, letterSpacing: 1 }}>
            Nivel <span style={{ letterSpacing: 2 }}>{cTier.icon} {cTier.name}</span>
            <span style={{ opacity: 0.55, marginLeft: 6, fontWeight: 900 }}>›</span>
          </div>
          {cTier.next ? (
            <div style={{ marginTop: 10 }}>
              <div style={{ height: 5, borderRadius: 3, overflow: 'hidden', background: barBg }}>
                <div style={{ height: '100%', borderRadius: 3, width: `${pg}%`, background: barFill, transition: 'width 1s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontSize: 9.5, opacity: 0.7, fontWeight: 700, marginTop: 5 }}>
                <span style={sMono}>{me.gallons.toFixed(0)}/{cTier.target} gal</span>
                <span>Faltan {cTier.rem} gal → {cTier.next}</span>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 10, fontSize: 10.5, fontWeight: 700, opacity: 0.7 }}>
              ⭐ Nivel máximo · {me.gallons.toFixed(0)} galones
            </div>
          )}
        </div>

        {/* Zona derecha: puntos grandes → Canjes (D34: doble zona táctil) */}
        <div
          onClick={(e) => { e.stopPropagation(); onPointsTap(e); }}
          style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: 12 }}
        >
          <div style={{ ...sMono, fontSize: 34, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1 }}>{points}</div>
          <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2, opacity: 0.8 }}>Puntos</div>
          <div style={{ fontSize: 9, fontWeight: 800, marginTop: 3, opacity: 0.65 }}>Canjear →</div>
        </div>
      </div>
    </div>
  );
}
