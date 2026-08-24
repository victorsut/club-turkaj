// src/components/ui/L200Art.jsx
// F6 E1.16 (24-ago-2026) — tanda PICOPS: vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/PICOPS/MITSUBISHI, L200.png con el arnés trace-autos
// (anclas finas de rojo fusionadas, elipses de rin exentas de la
// sombra Y del despeckle, motas de líneas de panel absorbidas al
// vecino de color). Ensamblador PURO (decisión E1.9f); la capa de
// color recolorea vía el degradado -body del padre.
import { shade } from './vehicleArtUtils.js';
import { L200_TRACE as T } from './l200Trace.js';

export default function L200Art({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(25 21.5) scale(0.1223)">
        <path d={T.deep} fill={"#1D1D1C"} fillRule="evenodd" />
        <path d={T.char} fill={"#282828"} fillRule="evenodd" />
        <path d={T.gray2} fill={"#3B3B3B"} fillRule="evenodd" />
        <path d={T.glass} fill={"#4A4A4A"} fillRule="evenodd" />
        <path d={T.silver} fill={"#BDBDBD"} fillRule="evenodd" />
        <path d={T.darkred} fill={shade(color, -28)} fillRule="evenodd" />
        <path d={T.red2} fill={shade(color, -14)} fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
      </g>
    </g>
  );
}
