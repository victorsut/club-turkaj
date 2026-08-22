// src/components/ui/EcoArt.jsx
// F6 E1.12 (22-ago-2026) — HERO, ECO VECTORIZADA de la
// referencia del dueño (REFERENCIAS INTERFAZ/VEHÍCULOS/MOTOS/HERO, ECO.png)
// con el arnés paramétrico de calco (trace-motos): capas de color por
// anclas MEDIDAS + potrace. Ensamblador PURO: cada capa lleva su tono
// de referencia (cero profundidad dibujada — decisión E1.9f); la capa
// de color recolorea vía el degradado -body del padre.
import { ECO_TRACE as T } from './ecoTrace.js';

export default function EcoArt({ uid }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={98} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(19.3 8.6) scale(0.1288)">
        <path d={T.dark} fill="#2E3235" fillRule="evenodd" />
        <path d={T.black} fill="#363A3D" fillRule="evenodd" />
        <path d={T.char2} fill="#3D4245" fillRule="evenodd" />
        <path d={T.char} fill="#44494C" fillRule="evenodd" />
        <path d={T.midgray} fill="#7D7E80" fillRule="evenodd" />
        <path d={T.gray} fill="#A0A0A1" fillRule="evenodd" />
        <path d={T.silver} fill="#B5B5B5" fillRule="evenodd" />
        <path d={T.silver2} fill="#C8C8C8" fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.springsilver} fill="#A6A6A7" fillRule="evenodd" />
        <path d={T.amber} fill="#ED7727" fillRule="evenodd" />
      </g>
    </g>
  );
}
