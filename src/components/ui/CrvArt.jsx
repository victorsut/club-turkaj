// src/components/ui/CrvArt.jsx
// F6 E1.15 (24-ago-2026) — tanda AUTOS LIVIANOS + SUV: vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/SUV/HONDA, CR-V.png con el arnés trace-autos
// (anclas finas de rojo fusionadas, sombra de piso por banda con
// elipses de rin exentas, blancos de faros por whiteBox espacial).
// Ensamblador PURO (decisión E1.9f); la capa de color recolorea vía
// el degradado -body del padre.
import { shade } from './vehicleArtUtils.js';
import { CRV_TRACE as T } from './crvTrace.js';

export default function CrvArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(25.7 21.9) scale(0.1233)">
        <path d={T.deep} fill={"#181818"} fillRule="evenodd" />
        <path d={T.char} fill={"#2C2C2C"} fillRule="evenodd" />
        <path d={T.silver} fill={"#BAB8B8"} fillRule="evenodd" />
        <path d={T.darkred} fill={shade(color, -14)} fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
      </g>
    </g>
  );
}
