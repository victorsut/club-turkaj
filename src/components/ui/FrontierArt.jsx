// src/components/ui/FrontierArt.jsx
// F6 E1.18 (24-ago-2026) — ronda de INTERPRETACIÓN (decisión del dueño:
// mostrar el modelo TAL CUAL la referencia): lámparas estructuradas
// (lente plata + destello blanco + elementos oscuros vía cajas de faro),
// degradado del cuerpo con TODAS las bandas finas de rojo (cada banda
// recolorea con shade(color, deltaR)) y ámbares fijos donde la
// referencia los tiene. GENERADO por gen-arts-auto.js — regenerar con
// el arnés, no editar a mano. Vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/PICOPS/NISSAN, FRONTIER.png.
import { shade } from './vehicleArtUtils.js';
import { FRONTIER_TRACE as T } from './frontierTrace.js';

export default function FrontierArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(26.4 24.8) scale(0.1197)">
        <path d={T.deep} fill={"#151515"} fillRule="evenodd" />
        <path d={T.char} fill={"#282828"} fillRule="evenodd" />
        <path d={T.gray2} fill={"#3B3B3A"} fillRule="evenodd" />
        <path d={T.glass} fill={"#515150"} fillRule="evenodd" />
        <path d={T.silver} fill={"#C3C3C3"} fillRule="evenodd" />
        <path d={T.rF} fill={shade(color, -30)} fillRule="evenodd" />
        <path d={T.darkred} fill={shade(color, -24)} fillRule="evenodd" />
        <path d={T.rD} fill={shade(color, -18)} fillRule="evenodd" />
        <path d={T.red2} fill={shade(color, -12)} fillRule="evenodd" />
        <path d={T.rB} fill={shade(color, -6)} fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.lamp} fill={"#C6C6C6"} fillRule="evenodd" />
        <path d={T.white} fill={"#FAFAFA"} fillRule="evenodd" />
      </g>
    </g>
  );
}
