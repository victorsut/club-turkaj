// src/components/ui/ZetaArt.jsx
// F6 E1.13 (22-ago-2026) — ITALIKA, Z recalcada con las
// correcciones del dueño (REFERENCIAS INTERFAZ/VEHÍCULOS/MOTOS/ITALIKA, Z.png):
// arnés trace-motos con anclas finas fusionadas (mergeInto), whiteBox
// con tope superior (el fondo IA 250-253 ya no se pinta de blanco) y
// despeckle de islas blancas. Ensamblador PURO (decisión E1.9f); la
// capa de color recolorea vía el degradado -body del padre.
import { ZETA_TRACE as T } from './zetaTrace.js';

export default function ZetaArt({ uid }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={98} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(16.9 2.2) scale(0.1314)">
        <path d={T.tire} fill="#20282A" fillRule="evenodd" />
        <path d={T.dark} fill="#2E3436" fillRule="evenodd" />
        <path d={T.charcoal} fill="#3E4244" fillRule="evenodd" />
        <path d={T.gray} fill="#787A7E" fillRule="evenodd" />
        <path d={T.silver} fill="#A9AAAD" fillRule="evenodd" />
        <path d={T.lightgray} fill="#CCCDD2" fillRule="evenodd" />
        <path d={T.xlight} fill="#DDDEE0" fillRule="evenodd" />
        <path d={T.green} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.white} fill="#EDEDED" fillRule="evenodd" />
      </g>
    </g>
  );
}
