// src/components/ui/TucsonArt.jsx
// F6 E1.15 (24-ago-2026) — tanda AUTOS LIVIANOS + SUV: vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/SUV/HYUNDAI, TUCSON.png con el arnés trace-autos
// (anclas finas de rojo fusionadas, sombra de piso por banda con
// elipses de rin exentas, blancos de faros por whiteBox espacial).
// Ensamblador PURO (decisión E1.9f); la capa de color recolorea vía
// el degradado -body del padre.
import { shade } from './vehicleArtUtils.js';
import { TUCSON_TRACE as T } from './tucsonTrace.js';

export default function TucsonArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(24.9 21) scale(0.1247)">
        <path d={T.deep} fill={"#161614"} fillRule="evenodd" />
        <path d={T.char} fill={"#292929"} fillRule="evenodd" />
        <path d={T.silver} fill={"#BAB8B8"} fillRule="evenodd" />
        <path d={T.darkred} fill={shade(color, -24)} fillRule="evenodd" />
        <path d={T.red2} fill={shade(color, -12)} fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.white} fill={"#E9E8E8"} fillRule="evenodd" />
      </g>
    </g>
  );
}
