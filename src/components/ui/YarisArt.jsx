// src/components/ui/YarisArt.jsx
// F6 TANDA 9 (2-sep-2026) — micro bus / moto taxi / camión ligero.
// Cuerpo recoloreable por bandas PLANAS (regla E1.19: el sombreado ya
// viene codificado en las bandas de la referencia); cada banda extra
// recolorea con shade(color, delta). GENERADO por gen-arts-mix.cjs —
// regenerar con el arnés, no editar a mano. Vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/AUTOS LIVIANOS/TOYOTA, YARIS.png.
import { shade } from './vehicleArtUtils.js';
import { YARIS_TRACE as T } from './yarisTrace.js';

export default function YarisArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(20.2 15.7) scale(0.129)">
        <path d={T.glass} fill={"#CDCCCC"} fillRule="evenodd" />
        <path d={T.deep} fill={"#202122"} fillRule="evenodd" />
        <path d={T.dark} fill={"#2A2C2D"} fillRule="evenodd" />
        <path d={T.char} fill={"#323435"} fillRule="evenodd" />
        <path d={T.gray} fill={"#383A3B"} fillRule="evenodd" />
        <path d={T.mid} fill={"#434546"} fillRule="evenodd" />
        <path d={T.gF} fill={shade(color, -29)} fillRule="evenodd" />
        <path d={T.gE} fill={shade(color, -12)} fillRule="evenodd" />
        <path d={T.green} fill={color} fillRule="evenodd" />
        <path d={T.gA} fill={shade(color, 3)} fillRule="evenodd" />
        <path d={T.white} fill={"#E6E5E5"} fillRule="evenodd" />
        <path d={T.tailred} fill={"#9A1B1B"} fillRule="evenodd" />
      </g>
    </g>
  );
}
