// src/components/ui/RioArt.jsx
// F6 E1.18 (24-ago-2026) — ronda de INTERPRETACIÓN (decisión del dueño:
// mostrar el modelo TAL CUAL la referencia): lámparas estructuradas
// (lente plata + destello blanco + elementos oscuros vía cajas de faro),
// degradado del cuerpo con TODAS las bandas finas de rojo (cada banda
// recolorea con shade(color, deltaR)) y ámbares fijos donde la
// referencia los tiene. GENERADO por gen-arts-auto.js — regenerar con
// el arnés, no editar a mano. Vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/AUTOS LIVIANOS/KIA, RIO.png.
import { shade } from './vehicleArtUtils.js';
import { RIO_TRACE as T } from './rioTrace.js';

export default function RioArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(23.7 21.8) scale(0.1234)">
        <path d={T.deep} fill={"#1E1E1D"} fillRule="evenodd" />
        <path d={T.dark} fill={"#323232"} fillRule="evenodd" />
        <path d={T.gray} fill={"#828181"} fillRule="evenodd" />
        <path d={T.glass} fill={"#B0B0B0"} fillRule="evenodd" />
        <path d={T.silver} fill={"#C9C8C8"} fillRule="evenodd" />
        <path d={T.lightgray} fill={"#D5D5D5"} fillRule="evenodd" />
        <path d={T.darkred} fill={shade(color, -13)} fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.lamp} fill={"#CCCBCB"} fillRule="evenodd" />
        <path d={T.white} fill={"#F9F8F8"} fillRule="evenodd" />
      </g>
    </g>
  );
}
