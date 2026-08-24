// src/components/ui/DmaxArt.jsx
// F6 E1.16 (24-ago-2026) — tanda PICOPS: vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/PICOPS/ISUZU, DMAX.png con el arnés trace-autos
// (anclas finas de rojo fusionadas, elipses de rin exentas de la
// sombra Y del despeckle, motas de líneas de panel absorbidas al
// vecino de color). Ensamblador PURO (decisión E1.9f); la capa de
// color recolorea vía el degradado -body del padre.
import { shade } from './vehicleArtUtils.js';
import { DMAX_TRACE as T } from './dmaxTrace.js';

export default function DmaxArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(27.2 22.5) scale(0.1203)">
        <path d={T.deep} fill={"#161615"} fillRule="evenodd" />
        <path d={T.char} fill={"#282827"} fillRule="evenodd" />
        <path d={T.gray} fill={"#353535"} fillRule="evenodd" />
        <path d={T.silver} fill={"#B6B5B5"} fillRule="evenodd" />
        <path d={T.darkred} fill={shade(color, -28)} fillRule="evenodd" />
        <path d={T.red2} fill={shade(color, -14)} fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
      </g>
    </g>
  );
}
