// src/components/ui/CrvArt.jsx
// F6 E1.18 (24-ago-2026) — ronda de INTERPRETACIÓN (decisión del dueño:
// mostrar el modelo TAL CUAL la referencia): lámparas estructuradas
// (lente plata + destello blanco + elementos oscuros vía cajas de faro),
// degradado del cuerpo con TODAS las bandas finas de rojo (cada banda
// recolorea con shade(color, deltaR)) y ámbares fijos donde la
// referencia los tiene. GENERADO por gen-arts-auto.js — regenerar con
// el arnés, no editar a mano. Vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/SUV/HONDA, CR-V.png.
import { shade } from './vehicleArtUtils.js';
import { CRV_TRACE as T } from './crvTrace.js';

export default function CrvArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(25.7 21.9) scale(0.1233)">
        <path d={T.tailred} fill={"#A51818"} fillRule="evenodd" />
        <path d={T.deep} fill={"#181818"} fillRule="evenodd" />
        <path d={T.char} fill={"#2C2C2C"} fillRule="evenodd" />
        <path d={T.silver} fill={"#BAB8B8"} fillRule="evenodd" />
        <path d={T.darkred} fill={shade(color, -14)} fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.lamp} fill={"#C4C2C2"} fillRule="evenodd" />
        <path d={T.white} fill={"#F0EFEF"} fillRule="evenodd" />
      </g>
    </g>
  );
}
