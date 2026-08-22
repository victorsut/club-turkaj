// src/components/ui/XrArt.jsx
// F6 E1.13 (22-ago-2026) — HONDA, XR recalcada con las
// correcciones del dueño (REFERENCIAS INTERFAZ/VEHÍCULOS/MOTOS/HONDA, XR.png):
// arnés trace-motos con anclas finas fusionadas (mergeInto), whiteBox
// con tope superior (el fondo IA 250-253 ya no se pinta de blanco) y
// despeckle de islas blancas. Ensamblador PURO (decisión E1.9f); la
// capa de color recolorea vía el degradado -body del padre.
import { XR_TRACE as T } from './xrTrace.js';

export default function XrArt({ uid }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={98} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(23.7 7.4) scale(0.1259)">
        <path d={T.tire} fill="#20232B" fillRule="evenodd" />
        <path d={T.black} fill="#343639" fillRule="evenodd" />
        <path d={T.darkgray} fill="#64666A" fillRule="evenodd" />
        <path d={T.gray} fill="#787A7E" fillRule="evenodd" />
        <path d={T.silver} fill="#BBBCBF" fillRule="evenodd" />
        <path d={T.lightgray} fill="#CCCDD0" fillRule="evenodd" />
        <path d={T.xlight} fill="#DDDEE0" fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.white} fill="#F2F3F3" fillRule="evenodd" />
      </g>
    </g>
  );
}
