// src/components/ui/AccentArt.jsx
// F6 E1.15 (24-ago-2026) — tanda AUTOS LIVIANOS + SUV: vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/AUTOS LIVIANOS/HYUNDAI, ACCENT.png con el arnés trace-autos
// (anclas finas de rojo fusionadas, sombra de piso por banda con
// elipses de rin exentas, blancos de faros por whiteBox espacial).
// Ensamblador PURO (decisión E1.9f); la capa de color recolorea vía
// el degradado -body del padre.
import { shade } from './vehicleArtUtils.js';
import { ACCENT_TRACE as T } from './accentTrace.js';

export default function AccentArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(23.8 22.4) scale(0.1233)">
        <path d={T.black} fill={"#313333"} fillRule="evenodd" />
        <path d={T.dark} fill={"#3E3F40"} fillRule="evenodd" />
        <path d={T.gray} fill={"#969696"} fillRule="evenodd" />
        <path d={T.silver} fill={"#BFBEBE"} fillRule="evenodd" />
        <path d={T.glass} fill={"#CFCECE"} fillRule="evenodd" />
        <path d={T.darkred} fill={shade(color, -18)} fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.white} fill={"#FAF9F9"} fillRule="evenodd" />
      </g>
    </g>
  );
}
