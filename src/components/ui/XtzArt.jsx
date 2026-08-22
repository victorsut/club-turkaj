// src/components/ui/XtzArt.jsx
// F6 E1.13 (22-ago-2026) — YAMAHA, XTZ recalcada con las
// correcciones del dueño (REFERENCIAS INTERFAZ/VEHÍCULOS/MOTOS/YAMAHA, XTZ.png):
// arnés trace-motos con anclas finas fusionadas (mergeInto), whiteBox
// con tope superior (el fondo IA 250-253 ya no se pinta de blanco) y
// despeckle de islas blancas. Ensamblador PURO (decisión E1.9f); la
// capa de color recolorea vía el degradado -body del padre.
import { XTZ_TRACE as T } from './xtzTrace.js';

export default function XtzArt({ uid }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={98} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(19.6 3.3) scale(0.1304)">
        <path d={T.black} fill="#30343A" fillRule="evenodd" />
        <path d={T.slate} fill="#363A48" fillRule="evenodd" />
        <path d={T.silver} fill="#A9AAAD" fillRule="evenodd" />
        <path d={T.silver2} fill="#BBBCBF" fillRule="evenodd" />
        <path d={T.lightgray} fill="#CCCED0" fillRule="evenodd" />
        <path d={T.xlight} fill="#DBDCDE" fillRule="evenodd" />
        <path d={T.blue} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.tailred} fill="#D72D30" fillRule="evenodd" />
        <path d={T.amber} fill="#F0A028" fillRule="evenodd" />
      </g>
    </g>
  );
}
