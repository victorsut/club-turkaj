// src/components/ui/H100Art.jsx
// F6 TANDA 9 (2-sep-2026) — micro bus / moto taxi / camión ligero.
// Cuerpo recoloreable por bandas PLANAS (regla E1.19: el sombreado ya
// viene codificado en las bandas de la referencia); cada banda extra
// recolorea con shade(color, delta). GENERADO por gen-arts-mix.cjs —
// regenerar con el arnés, no editar a mano. Vectorizada de
// REFERENCIAS INTERFAZ/VEHÍCULOS/CAMIÓN LIGERO/HYUNDAI, H100.png.
import { shade } from './vehicleArtUtils.js';
import { H100_TRACE as T } from './h100Trace.js';

export default function H100Art({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(16.4 5.9) scale(0.1316)">
        <path d={T.glass} fill={"#AFD1E9"} fillRule="evenodd" />
        <path d={T.glass2} fill={"#8FB8D4"} fillRule="evenodd" />
        <path d={T.glint} fill={"#F7F7F7"} fillRule="evenodd" />
        <path d={T.deep} fill={"#161616"} fillRule="evenodd" />
        <path d={T.dark} fill={"#242323"} fillRule="evenodd" />
        <path d={T.char} fill={"#363535"} fillRule="evenodd" />
        <path d={T.gray} fill={"#444342"} fillRule="evenodd" />
        <path d={T.wG} fill={shade(color, -56)} fillRule="evenodd" />
        <path d={T.wF} fill={shade(color, -41)} fillRule="evenodd" />
        <path d={T.wE} fill={shade(color, -24)} fillRule="evenodd" />
        <path d={T.wD} fill={shade(color, -12)} fillRule="evenodd" />
        <path d={T.body} fill={color} fillRule="evenodd" />
        <path d={T.wB} fill={shade(color, 7)} fillRule="evenodd" />
        <path d={T.wA} fill={shade(color, 13)} fillRule="evenodd" />
        <path d={T.rim} fill={"#CECDCE"} fillRule="evenodd" />
        <path d={T.amber} fill={"#E16A1D"} fillRule="evenodd" />
        <path d={T.redlamp} fill={"#CE480C"} fillRule="evenodd" />
        <path d={T.lamp} fill={"#F4F3F1"} fillRule="evenodd" />
      </g>
    </g>
  );
}
