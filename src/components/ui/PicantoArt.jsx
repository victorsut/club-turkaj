// src/components/ui/PicantoArt.jsx
// F6 E1.15 (24-ago-2026) — tanda AUTOS LIVIANOS + SUV: vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/AUTOS LIVIANOS/KIA, PICANTO.png con el arnés trace-autos
// (anclas finas de rojo fusionadas, sombra de piso por banda con
// elipses de rin exentas, blancos de faros por whiteBox espacial).
// Ensamblador PURO (decisión E1.9f); la capa de color recolorea vía
// el degradado -body del padre.
import { shade } from './vehicleArtUtils.js';
import { PICANTO_TRACE as T } from './picantoTrace.js';

export default function PicantoArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(20.4 14.4) scale(0.1285)">
        <path d={T.black} fill={"#2A2A29"} fillRule="evenodd" />
        <path d={T.dark} fill={"#363635"} fillRule="evenodd" />
        <path d={T.gray} fill={"#848483"} fillRule="evenodd" />
        <path d={T.glass} fill={"#BEBEBE"} fillRule="evenodd" />
        <path d={T.silver} fill={"#D3D3D3"} fillRule="evenodd" />
        <path d={T.darkred} fill={shade(color, -13)} fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.white} fill={"#F8F8F8"} fillRule="evenodd" />
      </g>
    </g>
  );
}
