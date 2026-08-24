// src/components/ui/GladiatorArt.jsx
// F6 E1.18 (24-ago-2026) — ronda de INTERPRETACIÓN (decisión del dueño:
// mostrar el modelo TAL CUAL la referencia): lámparas estructuradas
// (lente plata + destello blanco + elementos oscuros vía cajas de faro),
// degradado del cuerpo con TODAS las bandas finas de rojo (cada banda
// recolorea con shade(color, deltaR)) y ámbares fijos donde la
// referencia los tiene. GENERADO por gen-arts-auto.js — regenerar con
// el arnés, no editar a mano. Vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/PICOPS/JEEP, GLADIATOR.png.
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
        <path d={T.rD} fill={shade(color, -21)} fillRule="evenodd" />
        <path d={T.red2} fill={shade(color, -14)} fillRule="evenodd" />
        <path d={T.rB} fill={shade(color, -7)} fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.lamp} fill={"#BEBDBD"} fillRule="evenodd" />
        <path d={T.white} fill={"#FAFAFA"} fillRule="evenodd" />
      </g>
    </g>
  );
}
