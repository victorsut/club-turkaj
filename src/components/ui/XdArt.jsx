// src/components/ui/XdArt.jsx
// F6 E1.18 (24-ago-2026) — ronda de INTERPRETACIÓN (decisión del dueño:
// mostrar el modelo TAL CUAL la referencia): lámparas estructuradas
// (lente plata + destello blanco + elementos oscuros vía cajas de faro),
// degradado del cuerpo con TODAS las bandas finas de rojo (cada banda
// recolorea con shade(color, deltaR)) y ámbares fijos donde la
// referencia los tiene. GENERADO por gen-arts-auto.js — regenerar con
// el arnés, no editar a mano. Vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/AUTOS LIVIANOS/SCION, XD.png.
import { shade } from './vehicleArtUtils.js';
import { XD_TRACE as T } from './xdTrace.js';

export default function XdArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(23.9 18.8) scale(0.1239)">
        <path d={T.black} fill={"#131313"} fillRule="evenodd" />
        <path d={T.char} fill={"#282828"} fillRule="evenodd" />
        <path d={T.silver} fill={"#B9B8B8"} fillRule="evenodd" />
        <path d={T.lightgray} fill={"#DEDDDD"} fillRule="evenodd" />
        <path d={T.rG} fill={shade(color, -43)} fillRule="evenodd" />
        <path d={T.rH} fill={shade(color, -51)} fillRule="evenodd" />
        <path d={T.darkred} fill={shade(color, -36)} fillRule="evenodd" />
        <path d={T.rD} fill={shade(color, -21)} fillRule="evenodd" />
        <path d={T.rE} fill={shade(color, -28)} fillRule="evenodd" />
        <path d={T.red2} fill={shade(color, -14)} fillRule="evenodd" />
        <path d={T.rB} fill={shade(color, -7)} fillRule="evenodd" />
        <path d={T.red} fill={color} fillRule="evenodd" />
        <path d={T.lamp} fill={"#C9C8C8"} fillRule="evenodd" />
        <path d={T.white} fill={"#F4F4F4"} fillRule="evenodd" />
        <path d={T.amber} fill={shade(color, 1)} fillRule="evenodd" />
      </g>
    </g>
  );
}
