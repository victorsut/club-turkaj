// src/components/ui/Mazda3Art.jsx
// F6 TANDA 9 (2-sep-2026) — micro bus / moto taxi / camión ligero.
// Cuerpo recoloreable por bandas PLANAS (regla E1.19: el sombreado ya
// viene codificado en las bandas de la referencia); cada banda extra
// recolorea con shade(color, delta). GENERADO por gen-arts-mix.cjs —
// regenerar con el arnés, no editar a mano. Vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/AUTOS LIVIANOS/MAZDA, MAZDA 3.png.
import { shade } from './vehicleArtUtils.js';
import { MAZDA3_TRACE as T } from './mazda3Trace.js';

export default function Mazda3Art({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(26.3 21.6) scale(0.1225)">
        <path d={T.glass} fill={"#CFCECE"} fillRule="evenodd" />
        <path d={T.deep} fill={"#212223"} fillRule="evenodd" />
        <path d={T.dark} fill={"#2D2E2F"} fillRule="evenodd" />
        <path d={T.char} fill={"#333435"} fillRule="evenodd" />
        <path d={T.gray} fill={"#3B3B3B"} fillRule="evenodd" />
        <path d={T.mid} fill={"#5B5B5C"} fillRule="evenodd" />
        <path d={T.mid2} fill={"#7A7B7C"} fillRule="evenodd" />
        <path d={T.gF} fill={shade(color, -19)} fillRule="evenodd" />
        <path d={T.gE} fill={shade(color, -10)} fillRule="evenodd" />
        <path d={T.green} fill={color} fillRule="evenodd" />
        <path d={T.gA} fill={shade(color, 5)} fillRule="evenodd" />
        <path d={T.white} fill={"#EAEAEA"} fillRule="evenodd" />
        <path d={T.tailred} fill={"#812422"} fillRule="evenodd" />
      </g>
    </g>
  );
}
