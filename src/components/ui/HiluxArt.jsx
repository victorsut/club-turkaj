// src/components/ui/HiluxArt.jsx
// F6 E1.16 (24-ago-2026) — tanda PICOPS: vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/PICOPS/TOYOTA, HILUX.png con el arnés trace-autos
// (anclas finas de rojo fusionadas, elipses de rin exentas de la
// sombra Y del despeckle, motas de líneas de panel absorbidas al
// vecino de color). Ensamblador PURO (decisión E1.9f); la capa de
// color recolorea vía el degradado -body del padre.
import { shade } from './vehicleArtUtils.js';
import { HILUX_TRACE as T } from './hiluxTrace.js';

export default function HiluxArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(23.1 22.4) scale(0.123)">
        <path d={T.deep} fill={"#141414"} fillRule="evenodd" />
        <path d={T.char} fill={"#282828"} fillRule="evenodd" />
        <path d={T.glass} fill={"#797979"} fillRule="evenodd" />
        <path d={T.silver} fill={"#CBCBCB"} fillRule="evenodd" />
        <path d={T.darkred} fill={shade(color, -28)} fillRule="evenodd" />
        <path d={T.red2} fill={shade(color, -14)} fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
      </g>
    </g>
  );
}
