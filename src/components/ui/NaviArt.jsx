// src/components/ui/NaviArt.jsx
// F6 E1.9 (18-ago-2026) — Honda Navi VECTORIZADA de la nueva referencia
// del dueño (REFERENCIAS INTERFAZ/VEHÍCULOS/HONDA, NAVI.png; pidió:
// "ya no hace falta interpretar nada — mismas dimensiones y estructura,
// con profundidad estilo 3D y color cambiable"). CERO interpretación:
// la imagen se separó por CAPAS DE COLOR y cada capa se calcó con
// potrace (naviTrace.js, generado — ver comentario ahí; E1.9b: a
// resolución COMPLETA con filtro de mayoría 5×5 y DILATACIÓN 2px por
// capa — sin bordes rasgados ni piezas flotantes); este
// componente solo asigna rellenos; la sensación 3D viene de los
// degradados verticales por material (E1.9e: rines, mazas, CVT y cárter
// ya vienen CALCADOS en las capas engray/wheelgray — no se dibuja
// estructura a mano; E1.9f: sin brillos de trazo — las líneas arqueadas
// no existen en la referencia). Recolorear = capas red/darkred usan el degradado
// `-body` del padre y shade(); el RESORTE y la CALAVERA quedan rojos
// FIJOS (capas propias), ámbar y lentes no cambian.
import { shade } from './vehicleArtUtils.js';
import { NAVI_TRACE as T } from './naviTrace.js';

export default function NaviArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={96} ry={8} fill="rgba(0,0,0,.20)" />
      {/* ty 6.6 asienta las llantas (fondo real y≈952) sobre la sombra */}
      <g transform="translate(25.2 6.6) scale(0.1223)">
        <defs>
          <linearGradient id={`${uid}-nsofa`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3A3B42" />
            <stop offset="45%" stopColor="#26272C" />
            <stop offset="100%" stopColor="#191A1E" />
          </linearGradient>
          <linearGradient id={`${uid}-ngray`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4E4F57" />
            <stop offset="100%" stopColor="#34353C" />
          </linearGradient>
          {/* E1.9e: tonos medidos de la referencia — engray (40,42,44) y
              wheelgray (45,46,48) — con degradado vertical suave */}
          <linearGradient id={`${uid}-nen`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2D2F33" />
            <stop offset="100%" stopColor="#232527" />
          </linearGradient>
          <linearGradient id={`${uid}-nwheel`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#35363C" />
            <stop offset="100%" stopColor="#27282C" />
          </linearGradient>
        </defs>

        {/* ── capas calcadas de la referencia (orden de pintado) ──
            ⚠️ fillRule="evenodd" OBLIGATORIO: potrace emite los agujeros
            interiores con esa regla; con nonzero (default) los huecos se
            RELLENAN y zonas enteras se funden (causa raíz de los
            "elementos fuera de lugar" de POR CORREGIR/img3.png) */}
        <path d={T.black} fill={`url(#${uid}-nsofa)`} fillRule="evenodd" />
        {/* E1.9e: rines/mazas/horquilla/CVT/cárter CALCADOS con clase propia
            (antes se fundían con black y un kit dibujado a mano quedaba
            fuera de lugar — POR CORREGIR/img1.png del 19-ago) */}
        <path d={T.engray} fill={`url(#${uid}-nen)`} fillRule="evenodd" />
        <path d={T.wheelgray} fill={`url(#${uid}-nwheel)`} fillRule="evenodd" />
        <path d={T.darkgray} fill="#3A3B41" fillRule="evenodd" />
        <path d={T.midgray} fill={`url(#${uid}-ngray)`} fillRule="evenodd" />
        <path d={T.darkred} fill={shade(color, -34)} fillRule="evenodd" />
        <path d={T.red} fill={`url(#${uid}-body)`} fillRule="evenodd" />
        <path d={T.spring} fill="#E02A28" fillRule="evenodd" />
        <path d={T.taillight} fill="#D02427" fillRule="evenodd" />
        <path d={T.white} fill="#F2F2EF" fillRule="evenodd" />
        <path d={T.amber} fill="#F49C1F" fillRule="evenodd" />

        {/* E1.9f: SIN brillos de trazo (pedido del dueño 19-ago — las
            líneas arqueadas grises sobre asiento/ruedas/faro no existen
            en la referencia). La sensación 3D queda SOLO en los
            degradados verticales por material de las capas de arriba. */}
      </g>
    </g>
  );
}
