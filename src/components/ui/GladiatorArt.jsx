// src/components/ui/GladiatorArt.jsx
// F6 E1.16 (24-ago-2026) — tanda PICOPS: vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/PICOPS/JEEP, GLADIATOR.png con el arnés trace-autos
// (anclas finas de rojo fusionadas, elipses de rin exentas de la
// sombra Y del despeckle, motas de líneas de panel absorbidas al
// vecino de color). Ensamblador PURO (decisión E1.9f); la capa de
// color recolorea vía el degradado -body del padre.
import { shade } from './vehicleArtUtils.js';
import { GLADIATOR_TRACE as T } from './gladiatorTrace.js';

export default function GladiatorArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(30.1 24.8) scale(0.117)">
        <path d={T.deep} fill={"#171716"} fillRule="evenodd" />
        <path d={T.char} fill={"#292928"} fillRule="evenodd" />
        <path d={T.gray2} fill={"#3A3A3A"} fillRule="evenodd" />
        <path d={T.silver} fill={"#B4B3B3"} fillRule="evenodd" />
        <path d={T.darkred} fill={shade(color, -28)} fillRule="evenodd" />
        <path d={T.red2} fill={shade(color, -14)} fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
      </g>
    </g>
  );
}
