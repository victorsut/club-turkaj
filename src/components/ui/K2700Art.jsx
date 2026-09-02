// src/components/ui/K2700Art.jsx
// F6 TANDA 9 (2-sep-2026) — micro bus / moto taxi / camión ligero.
// Cuerpo recoloreable por bandas PLANAS (regla E1.19: el sombreado ya
// viene codificado en las bandas de la referencia); cada banda extra
// recolorea con shade(color, delta). GENERADO por gen-arts-mix.cjs —
// regenerar con el arnés, no editar a mano. Vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/CAMIÓN LIGERO/KIA, 2700.png.
import { shade } from './vehicleArtUtils.js';
import { K2700_TRACE as T } from './k2700Trace.js';

export default function K2700Art({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(18 8.6) scale(0.1318)">
        <path d={T.glass} fill={"#BAD9EF"} fillRule="evenodd" />
        <path d={T.glass2} fill={"#9AC0DE"} fillRule="evenodd" />
        <path d={T.deep} fill={"#141414"} fillRule="evenodd" />
        <path d={T.dark} fill={"#242423"} fillRule="evenodd" />
        <path d={T.char} fill={"#343434"} fillRule="evenodd" />
        <path d={T.gray} fill={"#424241"} fillRule="evenodd" />
        <path d={T.wH} fill={shade(color, -63)} fillRule="evenodd" />
        <path d={T.wG} fill={shade(color, -49)} fillRule="evenodd" />
        <path d={T.wF} fill={shade(color, -36)} fillRule="evenodd" />
        <path d={T.wE} fill={shade(color, -21)} fillRule="evenodd" />
        <path d={T.wD} fill={shade(color, -10)} fillRule="evenodd" />
        <path d={T.body} fill={color} fillRule="evenodd" />
        <path d={T.wB} fill={shade(color, 7)} fillRule="evenodd" />
        <path d={T.wA} fill={shade(color, 13)} fillRule="evenodd" />
        <path d={T.rim} fill={"#CECDCE"} fillRule="evenodd" />
        <path d={T.amber} fill={"#F77D06"} fillRule="evenodd" />
        <path d={T.redlamp} fill={"#DC4B06"} fillRule="evenodd" />
        <path d={T.lamp} fill={"#F5F5F5"} fillRule="evenodd" />
      </g>
    </g>
  );
}
