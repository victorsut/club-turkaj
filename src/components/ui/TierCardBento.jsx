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
        borderRadius: 20, padding: '18px 20px', margin: '12px 16px',
        background: bg, color: txt, border, boxShadow: shadow,
        position: 'relative', overflow: 'hidden', cursor: 'pointer',
      }}
    >
      <TierDeco name={cTier.name} />
      {isBlack && <GalaxyDust n={12} />}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'stretch', gap: 14 }}>
        {/* Zona izquierda: nivel + progreso de galones → detalle */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 1 }}>
            Nivel <span style={{ letterSpacing: 2 }}>{cTier.icon} {cTier.name}</span>
          </div>
          {cTier.next ? (
            <div style={{ marginTop: 14 }}>
              <div style={{ height: 6, borderRadius: 3, overflow: 'hidden', background: barBg }}>
                <div style={{ height: '100%', borderRadius: 3, width: `${pg}%`, background: barFill, transition: 'width 1s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, opacity: 0.7, fontWeight: 700, marginTop: 6 }}>
                <span style={sMono}>{me.gallons.toFixed(0)} / {cTier.target} gal</span>
                <span>Faltan {cTier.rem} gal → {cTier.next}</span>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 14, fontSize: 11, fontWeight: 700, opacity: 0.7 }}>
              ⭐ Nivel máximo · {me.gallons.toFixed(0)} galones
            </div>
          )}
          <div style={{ fontSize: 9.5, opacity: 0.55, fontWeight: 700, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Toca para ver tus beneficios
          </div>
        </div>

        {/* Zona derecha: puntos grandes → Canjes (D34: doble zona táctil) */}
        <div
          onClick={(e) => { e.stopPropagation(); onPointsTap(); }}
          style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: 12 }}
        >
          <div style={{ ...sMono, fontSize: 40, fontWeight: 800, letterSpacing: -2, lineHeight: 1 }}>{points}</div>
          <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2, opacity: 0.8 }}>Puntos</div>
          <div style={{ fontSize: 9.5, fontWeight: 800, marginTop: 4, opacity: 0.65 }}>Canjear →</div>
        </div>
      </div>
    </div>
  );
}
