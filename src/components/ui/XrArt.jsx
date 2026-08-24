// src/components/ui/XrArt.jsx
// F6 E1.14 (24-ago-2026) — HONDA, XR recalcada desde cero con anclas
// RE-MEDIDAS (las viejas estaban corridas y aplanaban el arte): llantas
// 57-61, mofle 66-69 (clase propia — antes desaparecía en el negro),
// motor anillo 80-86 + bloque 104-110, whiteBoxes ampliadas (el blanco
// de pieza 241 fuera de caja se volvía hueco → parches oscuros sobre la
// tarjeta) y darkred = sombra roja de la máscara (SHADE del cuerpo).
// Ensamblador PURO (decisión E1.9f); la capa de color recolorea vía el
// degradado -body del padre.
import { shade } from './vehicleArtUtils.js';
import { XR_TRACE as T } from './xrTrace.js';

export default function XrArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={98} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(23.7 7.4) scale(0.1259)">
        <path d={T.black} fill="#2F3032" fillRule="evenodd" />
        <path d={T.tire} fill="#3A3B3D" fillRule="evenodd" />
        <path d={T.muffler} fill="#434444" fillRule="evenodd" />
        <path d={T.engdark} fill="#515254" fillRule="evenodd" />
        <path d={T.engmid} fill="#6A6B6C" fillRule="evenodd" />
        <path d={T.gray} fill="#77787A" fillRule="evenodd" />
        <path d={T.silver} fill="#BEBEC0" fillRule="evenodd" />
        <path d={T.lightgray} fill="#D3D3D4" fillRule="evenodd" />
        <path d={T.xlight} fill="#E3E3E3" fillRule="evenodd" />
        <path d={T.darkred} fill={shade(color, -40)} fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.white} fill="#F1F1F1" fillRule="evenodd" />
      </g>
    </g>
  );
}
