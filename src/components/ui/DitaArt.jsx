// src/components/ui/DitaArt.jsx
// F6 E1.13 (22-ago-2026) — ITALIKA, D recalcada con las
// correcciones del dueño (REFERENCIAS INTERFAZ/VEHÍCULOS/MOTOS/ITALIKA, D.png):
// arnés trace-motos con anclas finas fusionadas (mergeInto), whiteBox
// con tope superior (el fondo IA 250-253 ya no se pinta de blanco) y
// despeckle de islas blancas. Ensamblador PURO (decisión E1.9f); la
// capa de color recolorea vía el degradado -body del padre.
import { shade } from './vehicleArtUtils.js';
import { DITA_TRACE as T } from './ditaTrace.js';

export default function DitaArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={98} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(22.1 4.5) scale(0.1287)">
        <path d={T.dk1} fill="#343B40" fillRule="evenodd" />
        <path d={T.dk5} fill="#434B52" fillRule="evenodd" />
        <path d={T.xlight} fill="#DCDCDC" fillRule="evenodd" />
        <path d={T.darkteal} fill={shade(color, -18)} fillRule="evenodd" />
        <path d={T.teal} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.white} fill="#EBEBEB" fillRule="evenodd" />
        <path d={T.ring} fill="#DCDCDC" fillRule="evenodd" />
        <path d={T.tailred} fill="#D13C3C" fillRule="evenodd" />
        <path d={T.amber} fill="#EB962D" fillRule="evenodd" />
      </g>
    </g>
  );
}
