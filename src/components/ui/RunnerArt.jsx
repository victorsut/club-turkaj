// src/components/ui/RunnerArt.jsx
// F6 E1.15 (24-ago-2026) — tanda AUTOS LIVIANOS + SUV: vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/SUV/TOYOTA, 4RUNNER.png con el arnés trace-autos
// (anclas finas de rojo fusionadas, sombra de piso por banda con
// elipses de rin exentas, blancos de faros por whiteBox espacial).
// Ensamblador PURO (decisión E1.9f); la capa de color recolorea vía
// el degradado -body del padre.
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
        <path d={T.darkred} fill={shade(color, -25)} fillRule="evenodd" />
        <path d={T.red2} fill={shade(color, -12)} fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.white} fill={"#FBFBFB"} fillRule="evenodd" />
      </g>
    </g>
  );
}
