// src/components/ui/TacomaArt.jsx
// F6 E1.16 (24-ago-2026) — tanda PICOPS: vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/PICOPS/TOYOTA, TACOMA.png con el arnés trace-autos
// (anclas finas de rojo fusionadas, elipses de rin exentas de la
// sombra Y del despeckle, motas de líneas de panel absorbidas al
// vecino de color). Ensamblador PURO (decisión E1.9f); la capa de
// color recolorea vía el degradado -body del padre.
import { shade } from './vehicleArtUtils.js';
import { TACOMA_TRACE as T } from './tacomaTrace.js';

export default function TacomaArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(26.4 22.8) scale(0.1212)">
        <path d={T.deep} fill={"#0E0E0E"} fillRule="evenodd" />
        <path d={T.dark} fill={"#1E1E1E"} fillRule="evenodd" />
        <path d={T.gray} fill={"#323332"} fillRule="evenodd" />
        <path d={T.glass} fill={"#3E3E3E"} fillRule="evenodd" />
        <path d={T.silver} fill={"#C9C8C8"} fillRule="evenodd" />
        <path d={T.darkred} fill={shade(color, -28)} fillRule="evenodd" />
        <path d={T.red2} fill={shade(color, -14)} fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
      </g>
    </g>
  );
}
