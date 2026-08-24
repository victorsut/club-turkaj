// src/components/ui/TacomaArt.jsx
// F6 E1.18 (24-ago-2026) — ronda de INTERPRETACIÓN (decisión del dueño:
// mostrar el modelo TAL CUAL la referencia): lámparas estructuradas
// (lente plata + destello blanco + elementos oscuros vía cajas de faro),
// degradado del cuerpo con TODAS las bandas finas de rojo (cada banda
// recolorea con shade(color, deltaR)) y ámbares fijos donde la
// referencia los tiene. GENERADO por gen-arts-auto.js — regenerar con
// el arnés, no editar a mano. Vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/PICOPS/TOYOTA, TACOMA.png.
import { shade } from './vehicleArtUtils.js';
import { TACOMA_TRACE as T } from './tacomaTrace.js';

export default function TacomaArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(26.4 22.8) scale(0.1212)">
        <path d={T.deep} fill={"#0E0E0E"} fillRule="evenodd" />
        <path d={T.dark} fill={"#1E1E1E"} fillRule="evenodd" />
        <path d={T.gray} fill={"#323332"} fillRule="evenodd" />
        <path d={T.glass} fill={"#3E3E3E"} fillRule="evenodd" />
        <path d={T.silver} fill={"#C9C8C8"} fillRule="evenodd" />
        <path d={T.rF} fill={shade(color, -35)} fillRule="evenodd" />
        <path d={T.rG} fill={shade(color, -42)} fillRule="evenodd" />
        <path d={T.darkred} fill={shade(color, -28)} fillRule="evenodd" />
        <path d={T.rD} fill={shade(color, -21)} fillRule="evenodd" />
        <path d={T.red2} fill={shade(color, -14)} fillRule="evenodd" />
        <path d={T.rB} fill={shade(color, -7)} fillRule="evenodd" />
        <path d={T.red} fill={color} fillRule="evenodd" />
        <path d={T.lamp} fill={"#C9C8C8"} fillRule="evenodd" />
        <path d={T.white} fill={"#FAFAFA"} fillRule="evenodd" />
      </g>
    </g>
  );
}
