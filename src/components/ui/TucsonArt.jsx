// src/components/ui/TucsonArt.jsx
// F6 E1.18 (24-ago-2026) — ronda de INTERPRETACIÓN (decisión del dueño:
// mostrar el modelo TAL CUAL la referencia): lámparas estructuradas
// (lente plata + destello blanco + elementos oscuros vía cajas de faro),
// degradado del cuerpo con TODAS las bandas finas de rojo (cada banda
// recolorea con shade(color, deltaR)) y ámbares fijos donde la
// referencia los tiene. GENERADO por gen-arts-auto.js — regenerar con
// el arnés, no editar a mano. Vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/SUV/HYUNDAI, TUCSON.png.
import { shade } from './vehicleArtUtils.js';
import { TUCSON_TRACE as T } from './tucsonTrace.js';

export default function TucsonArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(24.9 21) scale(0.1247)">
        <path d={T.deep} fill={"#161614"} fillRule="evenodd" />
        <path d={T.char} fill={"#292929"} fillRule="evenodd" />
        <path d={T.silver} fill={"#BAB8B8"} fillRule="evenodd" />
        <path d={T.rF} fill={shade(color, -31)} fillRule="evenodd" />
        <path d={T.rG} fill={shade(color, -38)} fillRule="evenodd" />
        <path d={T.darkred} fill={shade(color, -24)} fillRule="evenodd" />
        <path d={T.rD} fill={shade(color, -18)} fillRule="evenodd" />
        <path d={T.red2} fill={shade(color, -12)} fillRule="evenodd" />
        <path d={T.rB} fill={shade(color, -6)} fillRule="evenodd" />
        <path d={T.red} fill={color} fillRule="evenodd" />
        <path d={T.lamp} fill={"#C2C0C0"} fillRule="evenodd" />
        <path d={T.white} fill={"#E9E8E8"} fillRule="evenodd" />
      </g>
    </g>
  );
}
