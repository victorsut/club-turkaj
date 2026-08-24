// src/components/ui/CorollaArt.jsx
// F6 E1.15 (24-ago-2026) — tanda AUTOS LIVIANOS + SUV: vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/AUTOS LIVIANOS/TOYOTA, COROLLA.png con el arnés trace-autos
// (anclas finas de rojo fusionadas, sombra de piso por banda con
// elipses de rin exentas, blancos de faros por whiteBox espacial).
// Ensamblador PURO (decisión E1.9f); la capa de color recolorea vía
// el degradado -body del padre.
import { COROLLA_TRACE as T } from './corollaTrace.js';

export default function CorollaArt({ uid }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(19.5 18.3) scale(0.13)">
        <path d={T.slate} fill={"#2F363B"} fillRule="evenodd" />
        <path d={T.slate2} fill={"#3A4043"} fillRule="evenodd" />
        <path d={T.gray} fill={"#969696"} fillRule="evenodd" />
        <path d={T.glass} fill={"#CCCBCB"} fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.white} fill={"#FCFBFB"} fillRule="evenodd" />
      </g>
    </g>
  );
}
