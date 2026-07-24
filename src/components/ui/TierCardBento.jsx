// src/components/ui/TierCardBento.jsx
// R1b (D34 + FORMATO GENERAL) — Tarjeta de nivel del home: color sólido
// plano por tier (regla inamovible: ORO dorado, PLATINO metálico, BLACK
// galaxia), tipografía DM Sans. Contenido mínimo de la referencia:
// nivel + barra de progreso + galones acumulados; puntos en grande a la
// derecha. Doble zona táctil: área general → detalle del nivel; área de
// puntos → pestaña Canjes. Número de puntos con count-up (D35).
import { useState } from 'react';
import { bento } from '../../constants/styles';
import { tierProgress } from '../../lib/tierSystem';
import GalaxyDust from './GalaxyDust';
import useCountUp from '../../hooks/useCountUp';
import useShortScreen from '../../hooks/useShortScreen';

// D35 matizada (mismo criterio que useCountUp): la barra se llena con
// animación UNA sola vez por sesión. El componente se REMONTA cada vez
// que se vuelve al inicio desde otra pestaña (y en los remontajes al
// abrir la app), y el replay del llenado hacía que la barra volviera a
// animarse desde cero una y otra vez; en montajes posteriores arranca
// ya en su ancho y los cambios reales los suaviza la transition de width.
let barFilled = false;

export default function TierCardBento({ me, cTier, onOpenDetail, onPointsTap }) {
  const [fillAnim] = useState(() => {
    if (barFilled) return false;
    barFilled = true;
    return true;
  });
  const isBlack = cTier.name === 'BLACK';
  const isPlat = cTier.name === 'PLATINO';
  const pg = tierProgress(me.gallons, cTier);
  const points = useCountUp(me.points);
  const shortScr = useShortScreen();

  const bg = isBlack
    ? 'radial-gradient(ellipse at 20% 30%, #0d0d1a 0%, #050508 40%, #000 100%)'
    : isPlat ? '#9EA7AD' : bento.gold;
  const barBg = isBlack ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.30)';
  // BLACK: acentos en dorado champán (referencia nivel black inicio) —
  // barra y puntos dorados sobre la galaxia.
  const gold = '#D8A94E';
  const barFill = isBlack ? gold : '#fff';

  return (
    <div
      onClick={onOpenDetail}
      className="pp-tile"
      style={{
        borderRadius: bento.radius,
        padding: shortScr ? '14px 18px' : '18px 20px',
        margin: shortScr ? '10px 16px 0' : '12px 16px 0',
        background: bg, color: '#fff',
        position: 'relative', overflow: 'hidden', cursor: 'pointer',
      }}
    >
      {isBlack && <GalaxyDust n={12} />}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'stretch', gap: 14 }}>
        {/* Zona izquierda: nivel + barra + galones → detalle */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: shortScr ? 16 : 17, lineHeight: 1.2 }}>
            <span style={{ fontWeight: 500, opacity: 0.85 }}>Nivel </span>
            <span style={{ fontWeight: 800 }}>{cTier.name}</span>
          </div>
          <div style={{ height: 7, borderRadius: 4, overflow: 'hidden', background: barBg, marginTop: shortScr ? 9 : 12 }}>
            <div className={fillAnim ? 'pp-bar-fill' : undefined} style={{ height: '100%', borderRadius: 4, width: `${pg}%`, background: barFill, transition: 'width 1s ease' }} />
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 700, opacity: 0.9, marginTop: shortScr ? 6 : 8 }}>
            {(cTier.next || me.gallons < cTier.target)
              ? `${me.gallons.toFixed(0)} / ${cTier.target} gal`
              : `${me.gallons.toFixed(0)} gal acumulados`}
          </div>
        </div>

        {/* Zona derecha: puntos grandes → Canjes (D34: doble zona táctil) */}
        <div
          onClick={(e) => { e.stopPropagation(); onPointsTap(e); }}
          style={{ textAlign: 'center', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingLeft: 12 }}
        >
          <div style={{ fontSize: shortScr ? 38 : 44, fontWeight: 800, letterSpacing: -1, lineHeight: 1, color: isBlack ? gold : 'inherit' }}>{points}</div>
          <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 2, color: isBlack ? gold : 'inherit' }}>Puntos</div>
        </div>
      </div>
    </div>
  );
}
