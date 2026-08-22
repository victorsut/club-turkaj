// src/components/ui/EcoArt.jsx
// F6 E1.13 (22-ago-2026) — HERO, ECO recalcada con las
// correcciones del dueño (REFERENCIAS INTERFAZ/VEHÍCULOS/MOTOS/HERO, ECO.png):
// arnés trace-motos con anclas finas fusionadas (mergeInto), whiteBox
// con tope superior (el fondo IA 250-253 ya no se pinta de blanco) y
// despeckle de islas blancas. Ensamblador PURO (decisión E1.9f); la
// capa de color recolorea vía el degradado -body del padre.
import { ECO_TRACE as T } from './ecoTrace.js';

export default function EcoArt({ uid }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={98} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(19.3 8.6) scale(0.1288)">
        <path d={T.black} fill="#363A3D" fillRule="evenodd" />
        <path d={T.char} fill="#44494C" fillRule="evenodd" />
        <path d={T.midgray} fill="#7D7E80" fillRule="evenodd" />
        <path d={T.gray} fill="#A0A0A1" fillRule="evenodd" />
        <path d={T.silver} fill="#B5B5B5" fillRule="evenodd" />
        <path d={T.silver2} fill="#C8C8C8" fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.springsilver} fill="#A6A6A7" fillRule="evenodd" />
        <path d={T.amber} fill="#ED7727" fillRule="evenodd" />
      </g>
    </g>
  );
}
