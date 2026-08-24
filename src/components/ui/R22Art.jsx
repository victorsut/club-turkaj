// src/components/ui/R22Art.jsx
// F6 E1.16 (24-ago-2026) — tanda PICOPS: vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/PICOPS/TOYOTA, 22R.png con el arnés trace-autos
// (anclas finas de rojo fusionadas, elipses de rin exentas de la
// sombra Y del despeckle, motas de líneas de panel absorbidas al
// vecino de color). Ensamblador PURO (decisión E1.9f); la capa de
// color recolorea vía el degradado -body del padre.
import { shade } from './vehicleArtUtils.js';
import { R22_TRACE as T } from './r22Trace.js';

export default function R22Art({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(28.3 24.1) scale(0.1196)">
        <path d={T.deep} fill={"#131313"} fillRule="evenodd" />
        <path d={T.char} fill={"#282828"} fillRule="evenodd" />
        <path d={T.gray} fill={"#333333"} fillRule="evenodd" />
        <path d={T.silver} fill={"#C8C8C8"} fillRule="evenodd" />
        <path d={T.darkred} fill={shade(color, -32)} fillRule="evenodd" />
        <path d={T.red2} fill={shade(color, -16)} fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.amber} fill={"#E69426"} fillRule="evenodd" />
        <path d={T.white} fill={"#FCFCFC"} fillRule="evenodd" />
      </g>
    </g>
  );
}
