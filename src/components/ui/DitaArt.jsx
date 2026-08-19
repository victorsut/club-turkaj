// src/components/ui/DitaArt.jsx
// F6 E1.11 (19-ago-2026) — ITALIKA, D VECTORIZADA de la
// referencia del dueño (REFERENCIAS INTERFAZ/VEHÍCULOS/ITALIKA, D.png)
// con el arnés paramétrico de calco (trace-multi): capas de color por
// anclas MEDIDAS + potrace. Ensamblador PURO: cada capa lleva su tono
// de referencia (cero profundidad dibujada — decisión E1.9f); la capa
// de color recolorea vía el degradado -body del padre.
import { shade } from './vehicleArtUtils.js';
import { DITA_TRACE as T } from './ditaTrace.js';

export default function DitaArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={98} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(22.1 4.5) scale(0.1287)">
        <path d={T.dark} fill="#242C32" fillRule="evenodd" />
        <path d={T.char2} fill="#343840" fillRule="evenodd" />
        <path d={T.char1} fill="#444652" fillRule="evenodd" />
        <path d={T.xlight} fill="#DCDDDF" fillRule="evenodd" />
        <path d={T.darkteal} fill={shade(color, -18)} fillRule="evenodd" />
        <path d={T.teal} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.white} fill="#F2F3F3" fillRule="evenodd" />
        <path d={T.tailred} fill="#D02D32" fillRule="evenodd" />
        <path d={T.amber} fill="#EB962D" fillRule="evenodd" />
      </g>
    </g>
  );
}
