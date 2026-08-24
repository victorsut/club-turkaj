// src/components/ui/FrontierArt.jsx
// F6 E1.16 (24-ago-2026) — tanda PICOPS: vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/PICOPS/NISSAN, FRONTIER.png con el arnés trace-autos
// (anclas finas de rojo fusionadas, elipses de rin exentas de la
// sombra Y del despeckle, motas de líneas de panel absorbidas al
// vecino de color). Ensamblador PURO (decisión E1.9f); la capa de
// color recolorea vía el degradado -body del padre.
import { shade } from './vehicleArtUtils.js';
import { FRONTIER_TRACE as T } from './frontierTrace.js';

export default function FrontierArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(26.4 24.8) scale(0.1197)">
        <path d={T.deep} fill={"#151515"} fillRule="evenodd" />
        <path d={T.char} fill={"#282828"} fillRule="evenodd" />
        <path d={T.gray2} fill={"#3B3B3A"} fillRule="evenodd" />
        <path d={T.glass} fill={"#515150"} fillRule="evenodd" />
        <path d={T.silver} fill={"#C3C3C3"} fillRule="evenodd" />
        <path d={T.darkred} fill={shade(color, -24)} fillRule="evenodd" />
        <path d={T.red2} fill={shade(color, -12)} fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
      </g>
    </g>
  );
}
