// src/components/ui/Cx5Art.jsx
// F6 E1.18 (24-ago-2026) — ronda de INTERPRETACIÓN (decisión del dueño:
// mostrar el modelo TAL CUAL la referencia): lámparas estructuradas
// (lente plata + destello blanco + elementos oscuros vía cajas de faro),
// degradado del cuerpo con TODAS las bandas finas de rojo (cada banda
// recolorea con shade(color, deltaR)) y ámbares fijos donde la
// referencia los tiene. GENERADO por gen-arts-auto.js — regenerar con
// el arnés, no editar a mano. Vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/SUV/MAZDA, CX-5.png.
import { shade } from './vehicleArtUtils.js';
import { CX5_TRACE as T } from './cx5Trace.js';

export default function Cx5Art({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(26.9 23) scale(0.1214)">
        <path d={T.deep} fill={"#151513"} fillRule="evenodd" />
        <path d={T.char} fill={"#2A2A29"} fillRule="evenodd" />
        <path d={T.gray2} fill={"#3D3D3D"} fillRule="evenodd" />
        <path d={T.trim} fill={"#4F4F4E"} fillRule="evenodd" />
        <path d={T.silver} fill={"#BEBDBD"} fillRule="evenodd" />
        <path d={T.rF} fill={shade(color, -31)} fillRule="evenodd" />
        <path d={T.darkred} fill={shade(color, -25)} fillRule="evenodd" />
        <path d={T.rD} fill={shade(color, -19)} fillRule="evenodd" />
        <path d={T.red2} fill={shade(color, -12)} fillRule="evenodd" />
        <path d={T.rB} fill={shade(color, -6)} fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.lamp} fill={"#C6C5C5"} fillRule="evenodd" />
        <path d={T.white} fill={"#E9E9E9"} fillRule="evenodd" />
      </g>
    </g>
  );
}
