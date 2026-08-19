// src/components/ui/PulsarArt.jsx
// F6 E1.11 (19-ago-2026) — BAJAJ, PULSAR VECTORIZADA de la
// referencia del dueño (REFERENCIAS INTERFAZ/VEHÍCULOS/BAJAJ, PULSAR.png)
// con el arnés paramétrico de calco (trace-multi): capas de color por
// anclas MEDIDAS + potrace. Ensamblador PURO: cada capa lleva su tono
// de referencia (cero profundidad dibujada — decisión E1.9f); la capa
// de color recolorea vía el degradado -body del padre.
import { PULSAR_TRACE as T } from './pulsarTrace.js';

export default function PulsarArt({ uid }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={98} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(22.4 9.7) scale(0.1242)">
        <path d={T.black} fill="#1E252A" fillRule="evenodd" />
        <path d={T.dark2} fill="#2D3235" fillRule="evenodd" />
        <path d={T.slate} fill="#484B50" fillRule="evenodd" />
        <path d={T.midslate} fill="#6C6E71" fillRule="evenodd" />
        <path d={T.gray} fill="#85878A" fillRule="evenodd" />
        <path d={T.silver} fill="#B1B2B4" fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.spring} fill="#E02A28" fillRule="evenodd" />
      </g>
    </g>
  );
}
