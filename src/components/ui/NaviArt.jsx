// src/components/ui/NaviArt.jsx
// F6 E1.8 (18-ago-2026) — Honda Navi: contornos CALCADOS de la foto del
// dueño (REFERENCIAS INTERFAZ/VEHÍCULOS/HONDA, NAVI.png) + acabado
// LIMPIO de masas sólidas (feedback del dueño: le gustó más el estilo
// anterior; menos interpretación = geometría medida de la foto, pero
// sin marañas de trazos finos que ensucian en el tamaño real de la app).
// Se dibuja en COORDENADAS DE LA FOTO (1018×718, cuadrícula sharp) y un
// <g transform> lo escala al lienzo 240×150. REGLA: ningún trazo con
// significado mide menos de ~8px de foto (≈0.7px de pantalla en el
// preview de 190px — más delgado desaparece o aliasea).
// El COLOR del cuerpo es recoloreable (degradado `-body` del padre);
// el resorte del amortiguador es ROJO fijo, como en la moto real.
import { shade } from './vehicleArtUtils.js';

const INK = '#0B0B0D', BLK1 = '#131418', BLK2 = '#1B1C21', BLK3 = '#26272D';
const GRY1 = '#33353B', GRY2 = '#43454C', MET = '#9AA0A8';

// Rueda de la Navi: llanta gorda + rin de acero NEGRO de 8 ranuras.
const NaviWheel = ({ cx, cy, tR, rR }) => (
  <g>
    <circle cx={cx} cy={cy} r={tR} fill="#1A1B1E" />
    <circle cx={cx} cy={cy} r={tR - 4} fill="none" stroke="#0B0B0D" strokeWidth="8" />
    <circle cx={cx} cy={cy} r={rR + 9} fill="none" stroke="#0D0D10" strokeWidth="10" />
    <circle cx={cx} cy={cy} r={rR} fill="#212226" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
      <ellipse key={a} cx={cx} cy={cy - rR * 0.58} rx={rR * 0.135} ry={rR * 0.24} fill="#0A0A0C"
        transform={`rotate(${a + 22} ${cx} ${cy})`} />
    ))}
    <circle cx={cx} cy={cy} r={rR * 0.36} fill="#2C2D33" />
    <circle cx={cx} cy={cy} r={rR * 0.36} fill="none" stroke="#101114" strokeWidth="4" />
    <circle cx={cx} cy={cy} r={13} fill={GRY2} />
    <circle cx={cx} cy={cy} r={6} fill="#71757C" />
    <path d={`M ${cx - tR * 0.72} ${cy - tR * 0.58} A ${tR * 0.92} ${tR * 0.92} 0 0 1 ${cx + tR * 0.12} ${cy - tR * 0.9}`}
      stroke="rgba(255,255,255,.08)" strokeWidth="11" fill="none" strokeLinecap="round" />
  </g>
);

export default function NaviArt({ uid, color }) {
  return (
    <g>
      <ellipse cx={120} cy={132} rx={96} ry={8} fill="rgba(0,0,0,.20)" />
      <g transform="translate(24 -3.2) scale(0.1863)">
        <defs>
          <radialGradient id={`${uid}-nlens`} cx="42%" cy="38%" r="70%">
            <stop offset="0%" stopColor="#F7F5EC" />
            <stop offset="55%" stopColor="#DDE0E4" />
            <stop offset="100%" stopColor="#AEB3BB" />
          </radialGradient>
          <linearGradient id={`${uid}-nblk`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34363D" />
            <stop offset="55%" stopColor="#1F2025" />
            <stop offset="100%" stopColor="#121316" />
          </linearGradient>
          <linearGradient id={`${uid}-nmet`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C9CDD3" />
            <stop offset="100%" stopColor="#7E838B" />
          </linearGradient>
        </defs>

        {/* sombras de contacto */}
        <ellipse cx={222} cy={674} rx={96} ry={11} fill="rgba(0,0,0,.25)" />
        <ellipse cx={866} cy={672} rx={94} ry={11} fill="rgba(0,0,0,.25)" />

        {/* ── RUEDA TRASERA ── */}
        <NaviWheel cx={222} cy={550} tR={125} rR={78} />

        {/* guardafango trasero interior + mudflap (masas limpias) */}
        <path d="M110 495 A 150 150 0 0 1 334 468 L 322 486 A 130 130 0 0 0 128 510 Z" fill={BLK2} />
        <path d="M96 540 L 70 600 Q 68 612 80 612 L 112 606 L 128 552 Z" fill={BLK1} />

        {/* ── MOFLE: caja grande + banda superior + placa + tapa ── */}
        <path d="M150 462 Q 230 438 308 468 L 302 500 Q 228 470 158 494 Z" fill="#23242A" />
        <ellipse cx={82} cy={536} rx={12} ry={30} fill="#0E0E11" />
        <path d="M84 480 Q 74 484 74 502 L 76 570 Q 76 590 98 592 L 276 598 Q 298 598 300 578 L 302 506 Q 302 488 282 486 L 104 477 Q 92 476 84 480 Z" fill="#2F3138" />
        <path d="M84 486 L 298 496 L 297 514 L 82 504 Z" fill="#3C3F46" />
        <rect x="96" y="516" width="176" height="64" rx="11" fill="#1A1B1F" />
        <circle cx={114} cy={532} r={7} fill={MET} />
        <circle cx={254} cy={566} r={7} fill={MET} />

        {/* ── MOTOR + CVT ── */}
        <path d="M300 470 L 470 460 L 472 610 Q 400 642 342 616 Q 296 586 300 470 Z" fill="#1E1F24" />
        <path d="M420 558 L 472 552 L 474 606 L 426 612 Z" fill="#878C93" />
        <circle cx={357} cy={556} r={46} fill="#2B2C32" stroke="#121215" strokeWidth="5" />
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(a => (
          <path key={a} d="M357 513 L357 529" stroke="#15161A" strokeWidth="8"
            transform={`rotate(${a} 357 556)`} />
        ))}
        <circle cx={357} cy={556} r={17} fill={GRY2} />

        {/* basculante hacia el eje */}
        <path d="M300 560 L 224 550" stroke={BLK3} strokeWidth="18" strokeLinecap="round" />

        {/* ── AMORTIGUADOR: copelas + barra + RESORTE ROJO (fijo) ── */}
        <path d="M281 386 L 268 470" stroke={BLK2} strokeWidth="10" strokeLinecap="round" />
        <rect x="260" y="380" width="38" height="16" rx="7" fill={BLK3} />
        <path d="M252 400 L 296 410 L 253 417 L 297 427 L 254 434 L 298 444 L 255 451 L 299 461"
          stroke="#8E1E1B" strokeWidth="10" strokeLinejoin="round" strokeLinecap="round" fill="none" />
        <path d="M252 398 L 296 408 L 253 415 L 297 425 L 254 432 L 298 442 L 255 449 L 299 459"
          stroke="#D93B32" strokeWidth="8" strokeLinejoin="round" strokeLinecap="round" fill="none" />
        <rect x="242" y="458" width="38" height="15" rx="7" fill={BLK3} />

        {/* ── BASTIDOR delantero: dos tubos limpios ── */}
        <path d="M734 300 L 708 430" stroke={BLK3} strokeWidth="16" strokeLinecap="round" />
        <path d="M722 380 Q 712 470 754 542" stroke="#202127" strokeWidth="12" fill="none" strokeLinecap="round" />

        {/* ── CAJA PORTAEQUIPAJE facetada ── */}
        <path d="M490 470 L 515 433 L 645 419 L 697 443 L 694 554 L 562 590 L 504 562 Z"
          fill="#2E3036" stroke="#101014" strokeWidth="5" />
        <path d="M515 433 L 645 419 L 690 445 L 562 455 Z" fill="#3A3D44" />
        <path d="M562 455 L 690 445 L 688 550 L 566 584 Z" fill="#26282D" />
        <path d="M490 470 L 515 433 L 562 455 L 566 584 L 504 560 Z" fill="#222327" />
        <rect x="596" y="472" width="72" height="26" rx="12" fill="#17181C" />
        <rect x="602" y="520" width="60" height="17" rx="8" fill={GRY1} />

        {/* faldón oscuro entre motor y caja */}
        <path d="M420 470 Q 398 540 452 602 L 522 590 L 506 470 Z" fill="#212227" />

        {/* piso + posapiés + caballete central */}
        <path d="M505 560 L 690 545 Q 722 545 732 562 L 736 586 Q 640 622 520 594 Z" fill="#17181C" />
        <rect x="610" y="584" width="56" height="16" rx="8" fill={`url(#${uid}-nmet)`} transform="rotate(-4 638 592)" />
        <path d="M603 592 L 589 652" stroke={BLK3} strokeWidth="13" strokeLinecap="round" />
        <path d="M575 652 L 609 656" stroke={BLK3} strokeWidth="10" strokeLinecap="round" />

        {/* ── VIGA GRIS del bastidor con ranura ── */}
        <path d="M470 408 L 595 383 L 604 416 L 482 447 Z" fill="#4C4E56" stroke="#2E2F35" strokeWidth="4" />
        <rect x="504" y="396" width="66" height="20" rx="10" fill="#26272C" transform="rotate(-11 537 406)" />

        {/* ── CUERPO en color (contorno calcado de la foto) ── */}
        <path d={'M232 325 C 300 320 420 306 500 298 L 572 292 C 605 280 648 274 700 270 Q 722 270 726 282 L 728 305 Q 724 322 714 338 L 698 388 Q 692 400 686 410 L 640 418 L 600 390 L 500 406 L 470 408 Q 490 430 484 462 Q 470 486 442 486 Q 414 482 402 458 Q 396 436 406 418 L 370 402 L 300 386 Q 268 372 246 344 Z'}
          fill={`url(#${uid}-body)`} stroke={shade(color, -56)} strokeWidth="4" />
        {/* luz ancha arriba + pliegue lateral + sombra del faldón trasero */}
        <path d="M290 322 C 390 312 500 301 578 292 C 618 282 658 276 694 274 L 693 281 C 652 284 610 290 580 298 C 502 306 392 317 292 327 Z"
          fill="rgba(255,255,255,.11)" />
        <path d="M600 336 Q 520 360 452 394 L 446 386 Q 516 352 596 328 Z" fill={shade(color, -46)} />
        <path d="M255 342 Q 300 362 350 376 L 340 390 Q 288 374 252 350 Z" fill={shade(color, -32)} />

        {/* DISCO con aro gris grueso */}
        <circle cx={450} cy={432} r={43} fill="#3E4047" />
        <circle cx={450} cy={432} r={43} fill="none" stroke="#22232A" strokeWidth="5" />
        <circle cx={450} cy={432} r={29} fill={`url(#${uid}-body)`} stroke={shade(color, -48)} strokeWidth="4" />
        <circle cx={450} cy={432} r={12} fill={shade(color, -22)} />

        {/* ── ASIENTO (calcado, masas limpias) ── */}
        <path d={'M178 254 Q 160 258 162 276 L 184 300 Q 254 324 340 329 Q 460 320 560 306 L 572 292 Q 520 282 450 272 Q 340 260 254 256 Q 200 250 178 254 Z'}
          fill={BLK2} />
        <path d="M200 264 Q 380 276 540 286" stroke="rgba(255,255,255,.16)" strokeWidth="5" strokeDasharray="16 12" fill="none" />
        <path d="M188 290 Q 360 308 545 300" stroke="#0D0D10" strokeWidth="6" fill="none" />

        {/* ASA/riel trasero en color */}
        <path d="M182 309 Q 242 334 308 342" stroke={shade(color, -40)} strokeWidth="16" strokeLinecap="round" fill="none" />
        <path d="M180 306 Q 240 330 306 338" stroke={shade(color, -2)} strokeWidth="11" strokeLinecap="round" fill="none" />
        <path d="M246 323 L 242 339" stroke={BLK2} strokeWidth="9" />

        {/* ── COLA: cowl + calavera + direccional ámbar ── */}
        <path d="M178 262 Q 158 264 156 284 L 164 318 L 192 310 L 184 282 Z" fill="#17181C" />
        <rect x="156" y="302" width="36" height="27" rx="7" fill="#C4262B" stroke="#7E1418" strokeWidth="3" transform="rotate(-8 174 315)" />
        <path d="M180 328 L 176 380" stroke="#17181C" strokeWidth="11" strokeLinecap="round" />
        <circle cx={189} cy={402} r={14} fill="#F5A623" stroke="#B87708" strokeWidth="3" />
        <circle cx={184} cy={397} r={4.5} fill="rgba(255,255,255,.55)" />

        {/* ── RUEDA DELANTERA + guardafango + horquilla ── */}
        <NaviWheel cx={866} cy={549} tR={123} rR={70} />
        {/* guardafango montado a la horquilla (flota sobre la llanta) */}
        <path d={'M772 505 Q 778 458 812 440 Q 858 424 906 442 Q 948 462 962 502 L 972 528 Q 974 539 962 541 L 948 542 Q 938 488 890 466 Q 842 450 802 470 Q 782 484 780 510 Z'}
          fill={`url(#${uid}-nblk)`} stroke="#0C0C0E" strokeWidth="4" />
        <path d="M948 542 L 958 580 Q 958 590 946 588 L 934 582 L 928 544 Z" fill={BLK1} />

        {/* horquilla (tras la máscara, hasta el eje) */}
        <path d="M792 240 L 838 432" stroke="#202127" strokeWidth="21" strokeLinecap="round" />
        <path d="M799 248 L 840 424" stroke="#42464E" strokeWidth="6" strokeLinecap="round" />
        <path d="M838 430 L 866 545" stroke="#101014" strokeWidth="26" strokeLinecap="round" />
        {/* cable de freno único y limpio */}
        <path d="M712 202 Q 776 306 844 472 Q 858 514 868 542" stroke="#17181C" strokeWidth="6" fill="none" />

        {/* ── MÁSCARA: el ROJO domina el pod, V negra al centro ── */}
        <path d={'M763 218 L 827 210 Q 851 220 854 252 L 851 302 Q 847 337 825 350 L 803 351 Q 775 343 767 312 L 760 256 Z'}
          fill={`url(#${uid}-nblk)`} stroke="#0B0B0D" strokeWidth="4" />
        <path d="M768 226 L 806 219 L 813 248 L 782 272 L 770 258 Z"
          fill={`url(#${uid}-body)`} stroke={shade(color, -52)} strokeWidth="3" />
        <path d="M818 222 Q 845 231 847 262 L 842 294 Q 830 268 814 250 Z"
          fill={`url(#${uid}-body)`} stroke={shade(color, -52)} strokeWidth="3" />
        {/* FARO: aro cromado + lente + reflejo */}
        <circle cx={839} cy={306} r={35} fill="#0F0F12" />
        <circle cx={839} cy={306} r={30} fill={`url(#${uid}-nlens)`} stroke="#C7CBD2" strokeWidth="5" />
        <path d="M821 294 A 23 23 0 0 1 845 283" stroke="rgba(255,255,255,.85)" strokeWidth="6" fill="none" strokeLinecap="round" />
        {/* direccional delantera ámbar */}
        <path d="M833 356 Q 826 378 839 385 Q 852 378 845 356 Q 839 347 833 356 Z"
          fill="#F5A623" stroke="#B87708" strokeWidth="3" />

        {/* ── MANUBRIO, ESPEJOS y MANDOS ── */}
        <path d="M794 222 L 786 185" stroke="#17181C" strokeWidth="13" strokeLinecap="round" />
        <circle cx={784} cy={181} r={10} fill={BLK3} />
        <path d="M784 179 Q 742 167 680 175" stroke="#1B1C20" strokeWidth="12" strokeLinecap="round" fill="none" />
        <path d="M676 175 L 630 182" stroke="#0D0D10" strokeWidth="16" strokeLinecap="round" />
        <path d="M660 167 Q 680 149 712 145" stroke="#B9BDC4" strokeWidth="7" strokeLinecap="round" fill="none" />
        <ellipse cx={768} cy={189} rx={16} ry={10} fill="#17181C" />
        {/* espejo de GOTA en color (alto) */}
        <path d="M756 172 Q 750 142 740 129" stroke="#17181C" strokeWidth="8" strokeLinecap="round" fill="none" />
        <path d="M740 129 Q 710 109 716 81 Q 725 59 749 68 Q 770 77 763 110 Q 760 124 740 129 Z"
          fill={`url(#${uid}-body)`} stroke={shade(color, -50)} strokeWidth="4" />
        <path d="M726 93 Q 730 77 744 75" stroke="rgba(255,255,255,.30)" strokeWidth="6" fill="none" strokeLinecap="round" />
        {/* espejo bajo con luna plateada */}
        <path d="M736 182 Q 708 165 694 156" stroke="#17181C" strokeWidth="7" strokeLinecap="round" fill="none" />
        <ellipse cx={677} cy={146} rx={27} ry={21} fill="#17181C" transform="rotate(-25 677 146)" />
        <ellipse cx={677} cy={146} rx={19} ry={13} fill="#CDD2D8" transform="rotate(-25 677 146)" />
      </g>
    </g>
  );
}
