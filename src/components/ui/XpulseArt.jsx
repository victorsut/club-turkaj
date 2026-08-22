// src/components/ui/XpulseArt.jsx
// F6 E1.12 (22-ago-2026) — HERO, XPULSE VECTORIZADA de la
// referencia del dueño (REFERENCIAS INTERFAZ/VEHÍCULOS/MOTOS/HERO, XPULSE.png)
// con el arnés paramétrico de calco (trace-motos): capas de color por
// anclas MEDIDAS + potrace. Ensamblador PURO: cada capa lleva su tono
// de referencia (cero profundidad dibujada — decisión E1.9f); la capa
// de color recolorea vía el degradado -body del padre.
import { XPULSE_TRACE as T } from './xpulseTrace.js';

export default function XpulseArt({ uid }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={98} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(19.8 5.9) scale(0.1291)">
        <path d={T.dark} fill="#313941" fillRule="evenodd" />
        <path d={T.cap} fill="#3C434B" fillRule="evenodd" />
        <path d={T.char} fill="#494E53" fillRule="evenodd" />
        <path d={T.gray} fill="#87888B" fillRule="evenodd" />
        <path d={T.silver} fill="#B5B4B4" fillRule="evenodd" />
        <path d={T.lightgray} fill="#D2D2D3" fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.taillight} fill="#D91F1E" fillRule="evenodd" />
        <path d={T.hubdot} fill="#D2D2D3" fillRule="evenodd" />
      </g>
    </g>
  );
}
