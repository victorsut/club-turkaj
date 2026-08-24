// src/components/ui/DitaArt.jsx
// F6 E1.14 (24-ago-2026) — ITALIKA, D recalcada por 3ª vez (feedback del
// dueño: frente y faro con las formas mal): whiteBox frontal ampliada a
// [1010,190,1345,660] (la VENTANA blanca de la máscara teal y el borde
// alto del delantal quedaban fuera → huecos que rasgaban el frente) y
// aro del rin unificado a UNA clase (los fixed ahora aplican también
// sobre white — antes el aro se partía white/ring y salía grumoso).
// Ensamblador PURO (decisión E1.9f); la capa de color recolorea vía el
// degradado -body del padre.
import { shade } from './vehicleArtUtils.js';
import { DITA_TRACE as T } from './ditaTrace.js';

export default function DitaArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={98} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(22.1 4.5) scale(0.1287)">
        <path d={T.dk1} fill="#343B40" fillRule="evenodd" />
        <path d={T.dk5} fill="#434B52" fillRule="evenodd" />
        <path d={T.xlight} fill="#DCDCDC" fillRule="evenodd" />
        <path d={T.darkteal} fill={shade(color, -18)} fillRule="evenodd" />
        <path d={T.teal} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.white} fill="#EBEBEB" fillRule="evenodd" />
        <path d={T.ring} fill="#DCDCDC" fillRule="evenodd" />
        <path d={T.tailred} fill="#D13C3C" fillRule="evenodd" />
        <path d={T.amber} fill="#EB962D" fillRule="evenodd" />
      </g>
    </g>
  );
}
