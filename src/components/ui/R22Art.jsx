// src/components/ui/R22Art.jsx
// F6 E1.18 (24-ago-2026) — ronda de INTERPRETACIÓN (decisión del dueño:
// mostrar el modelo TAL CUAL la referencia): lámparas estructuradas
// (lente plata + destello blanco + elementos oscuros vía cajas de faro),
// degradado del cuerpo con TODAS las bandas finas de rojo (cada banda
// recolorea con shade(color, deltaR)) y ámbares fijos donde la
// referencia los tiene. GENERADO por gen-arts-auto.js — regenerar con
// el arnés, no editar a mano. Vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/PICOPS/TOYOTA, 22R.png.
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
        <path d={T.rF} fill={shade(color, -40)} fillRule="evenodd" />
        <path d={T.rG} fill={shade(color, -49)} fillRule="evenodd" />
        <path d={T.rH} fill={shade(color, -64)} fillRule="evenodd" />
        <path d={T.darkred} fill={shade(color, -32)} fillRule="evenodd" />
        <path d={T.rD} fill={shade(color, -24)} fillRule="evenodd" />
        <path d={T.red2} fill={shade(color, -16)} fillRule="evenodd" />
        <path d={T.rB} fill={shade(color, -8)} fillRule="evenodd" />
        <path d={T.red} fill={color} fillRule="evenodd" />
        <path d={T.amber} fill={"#C4540F"} fillRule="evenodd" />
        <path d={T.white} fill={"#FCFCFC"} fillRule="evenodd" />
      </g>
    </g>
  );
}
