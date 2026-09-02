// src/components/ui/ToritoArt.jsx
// F6 TANDA 9 (2-sep-2026) — micro bus / moto taxi / camión ligero.
// Cuerpo recoloreable por bandas PLANAS (regla E1.19: el sombreado ya
// viene codificado en las bandas de la referencia); cada banda extra
// recolorea con shade(color, delta). GENERADO por gen-arts-mix.cjs —
// regenerar con el arnés, no editar a mano. Vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/MOTO TAXIS/BAJAJ, TORITO.png.
import { shade } from './vehicleArtUtils.js';
import { TORITO_TRACE as T } from './toritoTrace.js';

export default function ToritoArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(18.5 -2.6) scale(0.1317)">
        <path d={T.out} fill={"#1D1E1D"} fillRule="evenodd" />
        <path d={T.dk} fill={"#252525"} fillRule="evenodd" />
        <path d={T.roof} fill={"#353534"} fillRule="evenodd" />
        <path d={T.hub} fill={"#5C5B5B"} fillRule="evenodd" />
        <path d={T.hub2} fill={"#969595"} fillRule="evenodd" />
        <path d={T.gG} fill={shade(color, -64)} fillRule="evenodd" />
        <path d={T.gF} fill={shade(color, -46)} fillRule="evenodd" />
        <path d={T.gE} fill={shade(color, -29)} fillRule="evenodd" />
        <path d={T.gD} fill={shade(color, -10)} fillRule="evenodd" />
        <path d={T.green} fill={color} fillRule="evenodd" />
        <path d={T.gB} fill={shade(color, 9)} fillRule="evenodd" />
        <path d={T.gA} fill={shade(color, 26)} fillRule="evenodd" />
        <path d={T.glass} fill={"#DAEBF4"} fillRule="evenodd" />
        <path d={T.amber} fill={"#F99904"} fillRule="evenodd" />
        <path d={T.white} fill={"#FAFAFA"} fillRule="evenodd" />
      </g>
    </g>
  );
}
