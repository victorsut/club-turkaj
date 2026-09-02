// src/components/ui/PregioArt.jsx
// F6 TANDA 9 (2-sep-2026) — micro bus / moto taxi / camión ligero.
// Cuerpo recoloreable por bandas PLANAS (regla E1.19: el sombreado ya
// viene codificado en las bandas de la referencia); cada banda extra
// recolorea con shade(color, delta). GENERADO por gen-arts-mix.cjs —
// regenerar con el arnés, no editar a mano. Vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/MICRO BUS/KIA, PREGIO.png.
import { shade } from './vehicleArtUtils.js';
import { PREGIO_TRACE as T } from './pregioTrace.js';

export default function PregioArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(28.4 16.3) scale(0.1195)">
        <path d={T.deep} fill={"#040404"} fillRule="evenodd" />
        <path d={T.dark2} fill={"#141413"} fillRule="evenodd" />
        <path d={T.win} fill={"#242423"} fillRule="evenodd" />
        <path d={T.win3} fill={"#343434"} fillRule="evenodd" />
        <path d={T.bump} fill={"#4A4949"} fillRule="evenodd" />
        <path d={T.silver} fill={"#949393"} fillRule="evenodd" />
        <path d={T.gG} fill={shade(color, -29)} fillRule="evenodd" />
        <path d={T.gF} fill={shade(color, -15)} fillRule="evenodd" />
        <path d={T.gE} fill={shade(color, -7)} fillRule="evenodd" />
        <path d={T.green} fill={color} fillRule="evenodd" />
        <path d={T.gC} fill={shade(color, 6)} fillRule="evenodd" />
        <path d={T.gB} fill={shade(color, 12)} fillRule="evenodd" />
        <path d={T.gA} fill={shade(color, 18)} fillRule="evenodd" />
        <path d={T.tailred} fill={"#9B0F0E"} fillRule="evenodd" />
        <path d={T.lamp} fill={"#DAD9D9"} fillRule="evenodd" />
        <path d={T.white} fill={"#F0F0F0"} fillRule="evenodd" />
      </g>
    </g>
  );
}
