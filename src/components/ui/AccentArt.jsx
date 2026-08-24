// src/components/ui/AccentArt.jsx
// F6 E1.18 (24-ago-2026) — ronda de INTERPRETACIÓN (decisión del dueño:
// mostrar el modelo TAL CUAL la referencia): lámparas estructuradas
// (lente plata + destello blanco + elementos oscuros vía cajas de faro),
// degradado del cuerpo con TODAS las bandas finas de rojo (cada banda
// recolorea con shade(color, deltaR)) y ámbares fijos donde la
// referencia los tiene. GENERADO por gen-arts-auto.js — regenerar con
// el arnés, no editar a mano. Vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/AUTOS LIVIANOS/HYUNDAI, ACCENT.png.
import { shade } from './vehicleArtUtils.js';
import { ACCENT_TRACE as T } from './accentTrace.js';

export default function AccentArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(23.8 22.4) scale(0.1233)">
        <path d={T.black} fill={"#313333"} fillRule="evenodd" />
        <path d={T.dark} fill={"#3E3F40"} fillRule="evenodd" />
        <path d={T.gray} fill={"#969696"} fillRule="evenodd" />
        <path d={T.silver} fill={"#BFBEBE"} fillRule="evenodd" />
        <path d={T.glass} fill={"#CFCECE"} fillRule="evenodd" />
        <path d={T.darkred} fill={shade(color, -18)} fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.lamp} fill={"#CDCCCC"} fillRule="evenodd" />
        <path d={T.white} fill={"#FAF9F9"} fillRule="evenodd" />
      </g>
    </g>
  );
}
