// src/components/ui/CrfArt.jsx
// F6 E1.13 (22-ago-2026) — HONDA, CRF recalcada con las
// correcciones del dueño (REFERENCIAS INTERFAZ/VEHÍCULOS/MOTOS/HONDA, CRF.png):
// arnés trace-motos con anclas finas fusionadas (mergeInto), whiteBox
// con tope superior (el fondo IA 250-253 ya no se pinta de blanco) y
// despeckle de islas blancas. Ensamblador PURO (decisión E1.9f); la
// capa de color recolorea vía el degradado -body del padre.
import { shade } from './vehicleArtUtils.js';
import { CRF_TRACE as T } from './crfTrace.js';

export default function CrfArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={98} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(23.5 11.4) scale(0.1241)">
        <path d={T.black} fill="#343639" fillRule="evenodd" />
        <path d={T.darkgray} fill="#444649" fillRule="evenodd" />
        <path d={T.navy} fill="#32344A" fillRule="evenodd" />
        <path d={T.mid} fill="#787A7E" fillRule="evenodd" />
        <path d={T.gray} fill="#98999C" fillRule="evenodd" />
        <path d={T.silver} fill="#BBBCBF" fillRule="evenodd" />
        <path d={T.lightgray} fill="#CCCDD0" fillRule="evenodd" />
        <path d={T.xlight} fill="#DDDEE0" fillRule="evenodd" />
        <path d={T.darkred} fill={shade(color, -14)} fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.white} fill="#F4F5F5" fillRule="evenodd" />
      </g>
    </g>
  );
}
