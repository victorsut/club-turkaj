// src/components/ui/GnArt.jsx
// F6 E1.10 (19-ago-2026) — Suzuki GN125 / GN125F VECTORIZADA de la
// referencia del dueño (REFERENCIAS INTERFAZ/VEHÍCULOS/SUZUKI, GN125 y
// GN125F.png, 1536×1024) con el pipeline de calco E1.9g: capas de color
// clasificadas por anclas MEDIDAS + mayoría 5×5 con voto de fondo
// calificado + despeckle por componentes + potrace (gnTrace.js, generado).
// Este componente es un ensamblador PURO: asigna a cada capa su tono de
// referencia (sin profundidad dibujada — decisión del dueño E1.9f).
// Recolorear = la capa red (tanque + panel) usa el degradado `-body` del
// padre; la calavera es roja FIJA; ámbar y plateados no cambian.
import { GN_TRACE as T } from './gnTrace.js';

export default function GnArt({ uid }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      {/* bbox medido del calco: x 86-1496, fondo y=932 → centrado y
          asentado sobre la sombra (932·0.1223 + 9 ≈ 123) */}
      <g transform="translate(23.3 9) scale(0.1223)">
        {/* orden de pintado = el del arnés (la dilatación de 2px por capa
            se esconde bajo la capa siguiente); fillRule evenodd OBLIGATORIO */}
        <path d={T.tire} fill="#1A1B1C" fillRule="evenodd" />
        <path d={T.black} fill="#2B2C2E" fillRule="evenodd" />
        <path d={T.midgray} fill="#666870" fillRule="evenodd" />
        <path d={T.gray} fill="#98999C" fillRule="evenodd" />
        <path d={T.silver} fill="#A9AAAD" fillRule="evenodd" />
        <path d={T.silver2} fill="#BBBCBF" fillRule="evenodd" />
        <path d={T.lightgray} fill="#CCCDD0" fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.taillight} fill="#D02427" fillRule="evenodd" />
        <path d={T.amber} fill="#F49C1F" fillRule="evenodd" />
      </g>
    </g>
  );
}
