// src/components/ui/ZetaArt.jsx
// F6 E1.11 (19-ago-2026) — ITALIKA, Z VECTORIZADA de la
// referencia del dueño (REFERENCIAS INTERFAZ/VEHÍCULOS/ITALIKA, Z.png)
// con el arnés paramétrico de calco (trace-multi): capas de color por
// anclas MEDIDAS + potrace. Ensamblador PURO: cada capa lleva su tono
// de referencia (cero profundidad dibujada — decisión E1.9f); la capa
// de color recolorea vía el degradado -body del padre.
import { ZETA_TRACE as T } from './zetaTrace.js';

export default function ZetaArt({ uid }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={98} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(16.9 2.2) scale(0.1314)">
        <path d={T.tire} fill="#20282A" fillRule="evenodd" />
        <path d={T.dark} fill="#2E3436" fillRule="evenodd" />
        <path d={T.charcoal} fill="#3E4244" fillRule="evenodd" />
        <path d={T.gray} fill="#787A7E" fillRule="evenodd" />
        <path d={T.silver} fill="#A9AAAD" fillRule="evenodd" />
        <path d={T.lightgray} fill="#CCCDD2" fillRule="evenodd" />
        <path d={T.xlight} fill="#DDDEE0" fillRule="evenodd" />
        <path d={T.green} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.white} fill="#F2F3F3" fillRule="evenodd" />
      </g>
    </g>
  );
}
