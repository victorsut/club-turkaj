// src/components/ui/YbrArt.jsx
// F6 E1.12 (22-ago-2026) — YAMAHA, YBR VECTORIZADA de la
// referencia del dueño (REFERENCIAS INTERFAZ/VEHÍCULOS/MOTOS/YAMAHA, YBR.png)
// con el arnés paramétrico de calco (trace-motos): capas de color por
// anclas MEDIDAS + potrace. Ensamblador PURO: cada capa lleva su tono
// de referencia (cero profundidad dibujada — decisión E1.9f); la capa
// de color recolorea vía el degradado -body del padre.
import { YBR_TRACE as T } from './ybrTrace.js';

export default function YbrArt({ uid }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={98} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(18.9 5.2) scale(0.1304)">
        <path d={T.black} fill="#313538" fillRule="evenodd" />
        <path d={T.char} fill="#383D42" fillRule="evenodd" />
        <path d={T.darkgray} fill="#6F7073" fillRule="evenodd" />
        <path d={T.gray} fill="#949494" fillRule="evenodd" />
        <path d={T.silver} fill="#B5B5B6" fillRule="evenodd" />
        <path d={T.silver2} fill="#BEBEBF" fillRule="evenodd" />
        <path d={T.silver3} fill="#C5C5C6" fillRule="evenodd" />
        <path d={T.orange} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.tailred} fill="#C91D20" fillRule="evenodd" />
        <path d={T.amber} fill="#E05E0E" fillRule="evenodd" />
      </g>
    </g>
  );
}
