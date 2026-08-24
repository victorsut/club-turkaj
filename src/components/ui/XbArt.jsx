// src/components/ui/XbArt.jsx
// F6 E1.18 (24-ago-2026) — ronda de INTERPRETACIÓN (decisión del dueño:
// mostrar el modelo TAL CUAL la referencia): lámparas estructuradas
// (lente plata + destello blanco + elementos oscuros vía cajas de faro),
// degradado del cuerpo con TODAS las bandas finas de rojo (cada banda
// recolorea con shade(color, deltaR)) y ámbares fijos donde la
// referencia los tiene. GENERADO por gen-arts-auto.js — regenerar con
// el arnés, no editar a mano. Vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/AUTOS LIVIANOS/SCION, XB.png.
import { shade } from './vehicleArtUtils.js';
import { XB_TRACE as T } from './xbTrace.js';

export default function XbArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(22.2 15.2) scale(0.1282)">
        <path d={T.black} fill={"#1D1D1D"} fillRule="evenodd" />
        <path d={T.dark} fill={"#2D2D2C"} fillRule="evenodd" />
        <path d={T.silver} fill={"#B9B8B8"} fillRule="evenodd" />
        <path d={T.lightgray} fill={"#C8C8C8"} fillRule="evenodd" />
        <path d={T.rG} fill={shade(color, -48)} fillRule="evenodd" />
        <path d={T.darkred} fill={shade(color, -40)} fillRule="evenodd" />
        <path d={T.rD} fill={shade(color, -24)} fillRule="evenodd" />
        <path d={T.rE} fill={shade(color, -32)} fillRule="evenodd" />
        <path d={T.red2} fill={shade(color, -16)} fillRule="evenodd" />
        <path d={T.rB} fill={shade(color, -8)} fillRule="evenodd" />
        <path d={T.red} fill={color} fillRule="evenodd" />
        <path d={T.lamp} fill={"#C6C5C5"} fillRule="evenodd" />
        <path d={T.white} fill={"#F2F2F2"} fillRule="evenodd" />
        <path d={T.amber} fill={shade(color, -12)} fillRule="evenodd" />
      </g>
    </g>
  );
}
