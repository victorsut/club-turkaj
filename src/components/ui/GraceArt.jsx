// src/components/ui/GraceArt.jsx
// F6 TANDA 9 (2-sep-2026) — micro bus / moto taxi / camión ligero.
// Cuerpo recoloreable por bandas PLANAS (regla E1.19: el sombreado ya
// viene codificado en las bandas de la referencia); cada banda extra
// recolorea con shade(color, delta). GENERADO por gen-arts-mix.cjs —
// regenerar con el arnés, no editar a mano. Vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/MICRO BUS/HYUNDAI, GRACE.png.
import { shade } from './vehicleArtUtils.js';
import { GRACE_TRACE as T } from './graceTrace.js';

export default function GraceArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(29 18.2) scale(0.118)">
        <path d={T.deep} fill={"#040403"} fillRule="evenodd" />
        <path d={T.dark2} fill={"#141414"} fillRule="evenodd" />
        <path d={T.win} fill={"#242423"} fillRule="evenodd" />
        <path d={T.win3} fill={"#383837"} fillRule="evenodd" />
        <path d={T.bump} fill={"#4A4949"} fillRule="evenodd" />
        <path d={T.silver} fill={"#B3B2B2"} fillRule="evenodd" />
        <path d={T.gG} fill={shade(color, -26)} fillRule="evenodd" />
        <path d={T.gF} fill={shade(color, -17)} fillRule="evenodd" />
        <path d={T.gE} fill={shade(color, -8)} fillRule="evenodd" />
        <path d={T.green} fill={color} fillRule="evenodd" />
        <path d={T.gD} fill={shade(color, 8)} fillRule="evenodd" />
        <path d={T.gC} fill={shade(color, 15)} fillRule="evenodd" />
        <path d={T.gB} fill={shade(color, 21)} fillRule="evenodd" />
        <path d={T.gA} fill={shade(color, 28)} fillRule="evenodd" />
        <path d={T.tailred} fill={"#910F0F"} fillRule="evenodd" />
        <path d={T.lamp} fill={"#DAD9D9"} fillRule="evenodd" />
        <path d={T.white} fill={"#F0F0F0"} fillRule="evenodd" />
      </g>
    </g>
  );
}
