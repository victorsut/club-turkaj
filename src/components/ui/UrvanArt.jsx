// src/components/ui/UrvanArt.jsx
// F6 TANDA 9 (2-sep-2026) — micro bus / moto taxi / camión ligero.
// Cuerpo recoloreable por bandas PLANAS (regla E1.19: el sombreado ya
// viene codificado en las bandas de la referencia); cada banda extra
// recolorea con shade(color, delta). GENERADO por gen-arts-mix.cjs —
// regenerar con el arnés, no editar a mano. Vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/MICRO BUS/NISSAN, URVAN.png.
import { shade } from './vehicleArtUtils.js';
import { URVAN_TRACE as T } from './urvanTrace.js';

export default function UrvanArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(28.2 15.8) scale(0.119)">
        <path d={T.deep} fill={"#050505"} fillRule="evenodd" />
        <path d={T.dark2} fill={"#141413"} fillRule="evenodd" />
        <path d={T.win} fill={"#242424"} fillRule="evenodd" />
        <path d={T.win3} fill={"#333332"} fillRule="evenodd" />
        <path d={T.bump} fill={"#444343"} fillRule="evenodd" />
        <path d={T.silver} fill={"#9C9B9B"} fillRule="evenodd" />
        <path d={T.gG} fill={shade(color, -34)} fillRule="evenodd" />
        <path d={T.gF} fill={shade(color, -18)} fillRule="evenodd" />
        <path d={T.gE} fill={shade(color, -7)} fillRule="evenodd" />
        <path d={T.green} fill={color} fillRule="evenodd" />
        <path d={T.gC} fill={shade(color, 6)} fillRule="evenodd" />
        <path d={T.gB} fill={shade(color, 12)} fillRule="evenodd" />
        <path d={T.gA} fill={shade(color, 18)} fillRule="evenodd" />
        <path d={T.tailred} fill={"#920809"} fillRule="evenodd" />
        <path d={T.lamp} fill={"#D5D4D4"} fillRule="evenodd" />
        <path d={T.white} fill={"#F0F0F0"} fillRule="evenodd" />
      </g>
    </g>
  );
}
