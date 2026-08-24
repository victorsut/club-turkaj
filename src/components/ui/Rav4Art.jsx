// src/components/ui/Rav4Art.jsx
// F6 E1.18 (24-ago-2026) — ronda de INTERPRETACIÓN (decisión del dueño:
// mostrar el modelo TAL CUAL la referencia): lámparas estructuradas
// (lente plata + destello blanco + elementos oscuros vía cajas de faro),
// degradado del cuerpo con TODAS las bandas finas de rojo (cada banda
// recolorea con shade(color, deltaR)) y ámbares fijos donde la
// referencia los tiene. GENERADO por gen-arts-auto.js — regenerar con
// el arnés, no editar a mano. Vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/SUV/TOYOTA, RAV4.png.
import { shade } from './vehicleArtUtils.js';
import { RAV4_TRACE as T } from './rav4Trace.js';

export default function Rav4Art({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(25.3 21.5) scale(0.1227)">
        <path d={T.deep} fill={"#151515"} fillRule="evenodd" />
        <path d={T.char} fill={"#292929"} fillRule="evenodd" />
        <path d={T.glass} fill={"#3A3A3A"} fillRule="evenodd" />
        <path d={T.silver} fill={"#BBBABA"} fillRule="evenodd" />
        <path d={T.rF} fill={shade(color, -34)} fillRule="evenodd" />
        <path d={T.rG} fill={shade(color, -40)} fillRule="evenodd" />
        <path d={T.darkred} fill={shade(color, -27)} fillRule="evenodd" />
        <path d={T.rD} fill={shade(color, -20)} fillRule="evenodd" />
        <path d={T.red2} fill={shade(color, -13)} fillRule="evenodd" />
        <path d={T.rB} fill={shade(color, -6)} fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.lamp} fill={"#C6C5C5"} fillRule="evenodd" />
        <path d={T.white} fill={"#EFEFEF"} fillRule="evenodd" />
      </g>
    </g>
  );
}
