// src/components/ui/RunnerArt.jsx
// F6 E1.18 (24-ago-2026) — ronda de INTERPRETACIÓN (decisión del dueño:
// mostrar el modelo TAL CUAL la referencia): lámparas estructuradas
// (lente plata + destello blanco + elementos oscuros vía cajas de faro),
// degradado del cuerpo con TODAS las bandas finas de rojo (cada banda
// recolorea con shade(color, deltaR)) y ámbares fijos donde la
// referencia los tiene. GENERADO por gen-arts-auto.js — regenerar con
// el arnés, no editar a mano. Vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/SUV/TOYOTA, 4RUNNER.png.
import { shade } from './vehicleArtUtils.js';
import { RUNNER_TRACE as T } from './runnerTrace.js';

export default function RunnerArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(22.3 17.4) scale(0.125)">
        <path d={T.deep} fill={"#161616"} fillRule="evenodd" />
        <path d={T.char} fill={"#282827"} fillRule="evenodd" />
        <path d={T.silver} fill={"#B7B6B6"} fillRule="evenodd" />
        <path d={T.rF} fill={shade(color, -32)} fillRule="evenodd" />
        <path d={T.rG} fill={shade(color, -38)} fillRule="evenodd" />
        <path d={T.darkred} fill={shade(color, -25)} fillRule="evenodd" />
        <path d={T.rD} fill={shade(color, -18)} fillRule="evenodd" />
        <path d={T.red2} fill={shade(color, -12)} fillRule="evenodd" />
        <path d={T.rB} fill={shade(color, -6)} fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.lamp} fill={"#C2C1C1"} fillRule="evenodd" />
        <path d={T.white} fill={"#FBFBFB"} fillRule="evenodd" />
      </g>
    </g>
  );
}
