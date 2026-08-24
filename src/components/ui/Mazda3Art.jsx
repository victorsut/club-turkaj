// src/components/ui/Mazda3Art.jsx
// F6 E1.18 (24-ago-2026) — ronda de INTERPRETACIÓN (decisión del dueño:
// mostrar el modelo TAL CUAL la referencia): lámparas estructuradas
// (lente plata + destello blanco + elementos oscuros vía cajas de faro),
// degradado del cuerpo con TODAS las bandas finas de rojo (cada banda
// recolorea con shade(color, deltaR)) y ámbares fijos donde la
// referencia los tiene. GENERADO por gen-arts-auto.js — regenerar con
// el arnés, no editar a mano. Vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/AUTOS LIVIANOS/MAZDA, MAZDA 3.png.
import { shade } from './vehicleArtUtils.js';
import { MAZDA3_TRACE as T } from './mazda3Trace.js';

export default function Mazda3Art({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(26.3 23.7) scale(0.1226)">
        <path d={T.tailred} fill={"#C21F20"} fillRule="evenodd" />
        <path d={T.black} fill={"#313335"} fillRule="evenodd" />
        <path d={T.dark} fill={"#3F4041"} fillRule="evenodd" />
        <path d={T.gray} fill={"#969696"} fillRule="evenodd" />
        <path d={T.glass} fill={"#CBCBCB"} fillRule="evenodd" />
        <path d={T.silver} fill={"#D4D4D4"} fillRule="evenodd" />
        <path d={T.darkred} fill={shade(color, -18)} fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.lamp} fill={"#8E8F91"} fillRule="evenodd" />
        <path d={T.white} fill={"#E4E4E4"} fillRule="evenodd" />
      </g>
    </g>
  );
}
