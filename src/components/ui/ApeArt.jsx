// src/components/ui/ApeArt.jsx
// F6 TANDA 9 (2-sep-2026) — micro bus / moto taxi / camión ligero.
// Cuerpo recoloreable por bandas PLANAS (regla E1.19: el sombreado ya
// viene codificado en las bandas de la referencia); cada banda extra
// recolorea con shade(color, delta). GENERADO por gen-arts-mix.cjs —
// regenerar con el arnés, no editar a mano. Vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/MOTO TAXIS/PIAGGIO, APE.png.
import { shade } from './vehicleArtUtils.js';
import { APE_TRACE as T } from './apeTrace.js';

export default function ApeArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(6.7 -6.4) scale(0.1388)">
        <path d={T.out} fill={"#1D1D1D"} fillRule="evenodd" />
        <path d={T.dk} fill={"#242424"} fillRule="evenodd" />
        <path d={T.hub} fill={"#5C5B5B"} fillRule="evenodd" />
        <path d={T.hub2} fill={"#969595"} fillRule="evenodd" />
        <path d={T.gG} fill={shade(color, -59)} fillRule="evenodd" />
        <path d={T.gF} fill={shade(color, -47)} fillRule="evenodd" />
        <path d={T.gE} fill={shade(color, -31)} fillRule="evenodd" />
        <path d={T.gD} fill={shade(color, -17)} fillRule="evenodd" />
        <path d={T.green} fill={color} fillRule="evenodd" />
        <path d={T.gB} fill={shade(color, 14)} fillRule="evenodd" />
        <path d={T.gA} fill={shade(color, 23)} fillRule="evenodd" />
        <path d={T.glass} fill={"#E0F1F8"} fillRule="evenodd" />
        <path d={T.amber} fill={"#F68103"} fillRule="evenodd" />
        <path d={T.redlamp} fill={"#DE4204"} fillRule="evenodd" />
        <path d={T.white} fill={"#FAFAFA"} fillRule="evenodd" />
      </g>
    </g>
  );
}
