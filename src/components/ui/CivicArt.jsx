// src/components/ui/CivicArt.jsx
// F6 E1.18 (24-ago-2026) — ronda de INTERPRETACIÓN (decisión del dueño:
// mostrar el modelo TAL CUAL la referencia): lámparas estructuradas
// (lente plata + destello blanco + elementos oscuros vía cajas de faro),
// degradado del cuerpo con TODAS las bandas finas de rojo (cada banda
// recolorea con shade(color, deltaR)) y ámbares fijos donde la
// referencia los tiene. GENERADO por gen-arts-auto.js — regenerar con
// el arnés, no editar a mano. Vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/AUTOS LIVIANOS/HONDA, CIVIC.png.
import { shade } from './vehicleArtUtils.js';
import { CIVIC_TRACE as T } from './civicTrace.js';

export default function CivicArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(25 22.8) scale(0.124)">
        <path d={T.black} fill={"#333537"} fillRule="evenodd" />
        <path d={T.dark} fill={"#3F4041"} fillRule="evenodd" />
        <path d={T.gray} fill={"#969696"} fillRule="evenodd" />
        <path d={T.silver} fill={"#C0C0C0"} fillRule="evenodd" />
        <path d={T.glass} fill={"#D4D4D4"} fillRule="evenodd" />
        <path d={T.darkred} fill={shade(color, -26)} fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.lamp} fill={"#D2D2D2"} fillRule="evenodd" />
        <path d={T.white} fill={"#FBFAFA"} fillRule="evenodd" />
      </g>
    </g>
  );
}
