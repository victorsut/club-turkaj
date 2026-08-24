// src/components/ui/Rav4Art.jsx
// F6 E1.15 (24-ago-2026) — tanda AUTOS LIVIANOS + SUV: vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/SUV/TOYOTA, RAV4.png con el arnés trace-autos
// (anclas finas de rojo fusionadas, sombra de piso por banda con
// elipses de rin exentas, blancos de faros por whiteBox espacial).
// Ensamblador PURO (decisión E1.9f); la capa de color recolorea vía
// el degradado -body del padre.
import { shade } from './vehicleArtUtils.js';
import { RAV4_TRACE as T } from './rav4Trace.js';

export default function Rav4Art({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(25.3 21.5) scale(0.1227)">
        <path d={T.deep} fill={"#151515"} fillRule="evenodd" />
        <path d={T.char} fill={"#292929"} fillRule="evenodd" />
        <path d={T.glass} fill={"#3A3A3A"} fillRule="evenodd" />
        <path d={T.silver} fill={"#BBBABA"} fillRule="evenodd" />
        <path d={T.darkred} fill={shade(color, -27)} fillRule="evenodd" />
        <path d={T.red2} fill={shade(color, -13)} fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.white} fill={"#EFEFEF"} fillRule="evenodd" />
      </g>
    </g>
  );
}
