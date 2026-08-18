// src/components/ui/NaviArt.jsx
// F6 E1.7 (18-ago-2026) — Honda Navi REALISTA, calcada de la foto del
// dueño (REFERENCIAS INTERFAZ/VEHÍCULOS/HONDA, NAVI.png). Pedido del
// dueño: "olvidar el estilo animado, recrear el diseño real; usar la
// imagen para estructura, dimensiones y formas; omitir marcas y textos".
// TÉCNICA: se dibuja en COORDENADAS DE LA FOTO (1018×718, medidas
// leídas sobre una cuadrícula compuesta con sharp) y un <g transform>
// lo escala al lienzo común 240×150 de VehicleArt. El COLOR del cuerpo
// sigue siendo recoloreable (usa el degradado `-body` del padre); el
// resorte del amortiguador es ROJO fijo como en la moto real.
import { shade } from './vehicleArtUtils.js';

const INK = '#0B0B0D', BLK1 = '#131418', BLK2 = '#1B1C21', BLK3 = '#26272D';
const GRY1 = '#33353B', GRY2 = '#43454C', MET = '#9AA0A8';

// Rueda de la Navi: llanta gorda + rin de acero NEGRO de 8 ranuras.
const NaviWheel = ({ cx, cy, tR, rR }) => (
  <g>
    <circle cx={cx} cy={cy} r={tR} fill="#17181B" />
    <circle cx={cx} cy={cy} r={tR - 3} fill="none" stroke="#0A0A0C" strokeWidth="7" />
    {[...Array(14)].map((_, i) => (
      <path key={i} d={`M ${cx} ${cy - tR + 2} l 0 12`} stroke="#060608" strokeWidth="7"
        transform={`rotate(${i * (360 / 14) + 8} ${cx} ${cy})`} />
    ))}
    <circle cx={cx} cy={cy} r={rR + (tR - rR) * 0.55} fill="none" stroke="#212226" strokeWidth="5" opacity=".9" />
    <circle cx={cx} cy={cy} r={rR + 7} fill="none" stroke="#0C0C0E" strokeWidth="9" />
    <circle cx={cx} cy={cy} r={rR} fill="#1B1C20" />
    <circle cx={cx} cy={cy} r={rR - 2} fill="none" stroke="#31333A" strokeWidth="3" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
      <ellipse key={a} cx={cx} cy={cy - rR * 0.58} rx={rR * 0.13} ry={rR * 0.23} fill="#08080A"
        transform={`rotate(${a + 22} ${cx} ${cy})`} />
    ))}
    <circle cx={cx} cy={cy} r={rR * 0.36} fill="#26272D" />
    <circle cx={cx} cy={cy} r={rR * 0.36} fill="none" stroke="#0E0E11" strokeWidth="3" />
    {[0, 90, 180, 270].map(a => (
      <circle key={a} cx={cx} cy={cy - rR * 0.22} r={4.5} fill="#5A5D64"
        transform={`rotate(${a + 45} ${cx} ${cy})`} />
    ))}
    <circle cx={cx} cy={cy} r={13} fill={GRY2} />
    <circle cx={cx} cy={cy} r={6} fill="#6B6E75" />
    <path d={`M ${cx - tR * 0.75} ${cy - tR * 0.55} A ${tR * 0.93} ${tR * 0.93} 0 0 1 ${cx + tR * 0.15} ${cy - tR * 0.92}`}
      stroke="rgba(255,255,255,.07)" strokeWidth="10" fill="none" />
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
            <stop offset="0%" stopColor="#33343B" />
            <stop offset="55%" stopColor="#1E1F24" />
            <stop offset="100%" stopColor="#101114" />
          </linearGradient>
          <linearGradient id={`${uid}-nmet`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C9CDD3" />
            <stop offset="100%" stopColor="#7E838B" />
          </linearGradient>
        </defs>

        {/* sombras de contacto */}
        <ellipse cx={222} cy={674} rx={96} ry={11} fill="rgba(0,0,0,.28)" />
        <ellipse cx={866} cy={672} rx={94} ry={11} fill="rgba(0,0,0,.28)" />

        {/* ── RUEDA TRASERA ── */}
        <NaviWheel cx={222} cy={550} tR={125} rR={78} />

        {/* guardafango trasero interior (banda concéntrica a la llanta) */}
        <path d="M110 495 A 150 150 0 0 1 334 468 L 322 486 A 130 130 0 0 0 128 510 Z" fill={BLK2} />
        {/* mudflap trasero */}
        <path d="M96 540 L 70 600 Q 68 612 80 612 L 112 606 L 128 552 Z" fill={BLK1} />
        <path d="M92 560 L 116 566 M 86 578 L 110 584" stroke="#060608" strokeWidth="5" />

        {/* ── MOFLE (caja grande con placa atornillada) ── */}
        <path d="M150 462 Q 230 438 308 468 L 302 500 Q 228 470 158 494 Z" fill="#202127" />
        <ellipse cx={82} cy={536} rx={12} ry={30} fill="#0E0E11" />
        <path d="M84 480 Q 74 484 74 502 L 76 570 Q 76 590 98 592 L 276 598 Q 298 598 300 578 L 302 506 Q 302 488 282 486 L 104 477 Q 92 476 84 480 Z" fill="#2C2D33" />
        <path d="M84 486 L 298 496 L 297 512 L 82 502 Z" fill="#3A3C43" opacity=".85" />
        <path d="M104 490 L 276 498" stroke="#1B1C21" strokeWidth="5" strokeDasharray="16 12" />
        <rect x="96" y="514" width="176" height="66" rx="11" fill="#17181C" />
        <circle cx={114} cy={530} r={6} fill={MET} />
        <circle cx={254} cy={566} r={6} fill={MET} />
        <path d="M112 566 L 256 574" stroke="#0C0C0E" strokeWidth="4" opacity=".7" />

        {/* ── MOTOR + CVT ── */}
        <path d="M300 470 L 470 460 L 472 610 Q 400 642 342 616 Q 296 586 300 470 Z" fill="#1D1E23" />
        <path d="M420 560 L 472 554 L 474 606 L 426 612 Z" fill="#84898F" />
        <path d="M428 570 L 466 566 M 430 586 L 468 582" stroke="#5B5F66" strokeWidth="5" />
        <circle cx={357} cy={556} r={46} fill="#2A2B31" stroke="#121215" strokeWidth="4" />
        {[...Array(12)].map((_, i) => (
          <path key={i} d="M357 514 L357 528" stroke="#15161A" strokeWidth="6"
            transform={`rotate(${i * 30} 357 556)`} />
        ))}
        <circle cx={357} cy={556} r={17} fill={GRY2} />
        <circle cx={357} cy={556} r={7} fill="#61656C" />
        <path d="M332 610 Q 362 642 404 646" stroke={MET} strokeWidth="8" strokeLinecap="round" fill="none" />
        <circle cx={406} cy={646} r={8} fill={GRY1} />

        {/* basculante hacia el eje */}
        <path d="M300 560 L 224 550" stroke={BLK3} strokeWidth="18" strokeLinecap="round" />

        {/* ── AMORTIGUADOR con RESORTE ROJO (rojo fijo, como el real) ── */}
        <path d="M281 386 L 268 470" stroke={BLK2} strokeWidth="9" strokeLinecap="round" />
        <rect x="262" y="382" width="34" height="14" rx="6" fill={BLK3} />
        <path d="M252 400 L 296 410 L 253 417 L 297 427 L 254 434 L 298 444 L 255 451 L 299 461"
          stroke="#8E1E1B" strokeWidth="9" strokeLinejoin="round" strokeLinecap="round" fill="none" />
        <path d="M252 398 L 296 408 L 253 415 L 297 425 L 254 432 L 298 442 L 255 449 L 299 459"
          stroke="#D23B34" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" fill="none" />
        <rect x="244" y="458" width="34" height="13" rx="6" fill={BLK3} />

        {/* ── BASTIDOR delantero visible (celosía con huecos reales) ── */}
        <path d="M734 300 L 708 430" stroke={BLK3} strokeWidth="16" strokeLinecap="round" />
        <path d="M722 380 Q 712 470 754 542" stroke="#202127" strokeWidth="11" fill="none" strokeLinecap="round" />
        <path d="M778 348 L 758 520" stroke={BLK2} strokeWidth="9" strokeLinecap="round" />
        <path d="M710 432 L 780 452" stroke={BLK2} strokeWidth="7" strokeLinecap="round" />
        <path d="M722 470 L 766 486" stroke="#17181C" strokeWidth="6" strokeLinecap="round" />

        {/* ── CAJA PORTAEQUIPAJE facetada ── */}
        <path d="M490 470 L 515 433 L 645 419 L 697 443 L 694 554 L 562 590 L 504 562 Z"
          fill="#292A30" stroke="#101014" strokeWidth="4" />
        <path d="M515 433 L 645 419 L 690 445 L 562 455 Z" fill="#34363D" />
        <path d="M562 455 L 690 445 L 688 550 L 566 584 Z" fill="#232429" />
        <path d="M490 470 L 515 433 L 562 455 L 566 584 L 504 560 Z" fill="#1F2025" />
        <rect x="596" y="472" width="72" height="26" rx="12" fill="#17181C" stroke="#3A3C42" strokeWidth="2" />
        <rect x="602" y="520" width="60" height="17" rx="8" fill={GRY1} opacity=".9" />

        {/* faldón oscuro entre motor y caja */}
        <path d="M420 470 Q 398 540 452 602 L 522 590 L 506 470 Z" fill="#212227" />

        {/* piso + posapiés + pata lateral */}
        <path d="M505 560 L 690 545 Q 722 545 732 562 L 736 586 Q 640 622 520 594 Z" fill="#17181C" />
        <rect x="610" y="584" width="56" height="15" rx="7" fill={`url(#${uid}-nmet)`} transform="rotate(-4 638 591)" />
        {/* caballete central */}
        <path d="M603 592 L 589 652" stroke={BLK3} strokeWidth="12" strokeLinecap="round" />
        <path d="M619 592 L 611 650" stroke={BLK2} strokeWidth="8" strokeLinecap="round" opacity=".7" />
        <path d="M575 652 L 609 656" stroke={BLK3} strokeWidth="9" strokeLinecap="round" />

        {/* ── VIGA GRIS del bastidor con ranura ── */}
        <path d="M470 408 L 595 383 L 604 416 L 482 447 Z" fill="#4A4C54" stroke="#2E2F35" strokeWidth="3" />
        <rect x="504" y="396" width="66" height="19" rx="9.5" fill="#26272C" transform="rotate(-11 537 405)" />

        {/* ── CUERPO en color (tanque + banda + quilla + lóbulo del disco) ── */}
        <path d={'M232 325 C 300 320 420 306 500 298 L 572 292 C 605 280 648 274 700 270 Q 722 270 726 282 L 728 305 Q 724 322 714 338 L 698 388 Q 692 400 686 410 L 640 418 L 600 390 L 500 406 L 470 408 Q 490 430 484 462 Q 470 486 442 486 Q 414 482 402 458 Q 396 436 406 418 L 370 402 L 300 386 Q 268 372 246 344 Z'}
          fill={`url(#${uid}-body)`} stroke={shade(color, -56)} strokeWidth="3" />
        {/* brillos y pliegues del plástico */}
        <path d="M585 294 Q 630 280 692 276" stroke={shade(color, 56)} strokeWidth="7" opacity=".8" fill="none" strokeLinecap="round" />
        <path d="M300 336 Q 420 320 540 304" stroke={shade(color, 34)} strokeWidth="5" opacity=".5" fill="none" />
        <path d="M600 336 Q 520 360 448 394" stroke={shade(color, -60)} strokeWidth="5" opacity=".8" fill="none" />
        <path d="M604 344 Q 528 366 456 398" stroke={shade(color, 40)} strokeWidth="3" opacity=".45" fill="none" />
        <path d="M688 284 Q 698 316 684 352 L 698 316 Z" fill="rgba(255,255,255,.20)" />
        <path d="M255 342 Q 300 362 350 376 L 340 390 Q 288 374 252 350 Z" fill={shade(color, -34)} opacity=".8" />

        {/* DISCO con aro gris grueso */}
        <circle cx={450} cy={432} r={43} fill="#3B3D44" />
        <circle cx={450} cy={432} r={43} fill="none" stroke="#22232A" strokeWidth="4" />
        <circle cx={450} cy={432} r={30} fill={`url(#${uid}-body)`} stroke={shade(color, -48)} strokeWidth="3.5" />
        <circle cx={450} cy={432} r={12} fill={shade(color, -22)} />
        <circle cx={430} cy={412} r={4} fill="#5A5D64" />
        <circle cx={470} cy={452} r={4} fill="#5A5D64" />

        {/* ── ASIENTO ── */}
        <path d={'M178 254 Q 160 258 162 276 L 184 300 Q 254 324 340 329 Q 460 320 560 306 L 572 292 Q 520 282 450 272 Q 340 260 254 256 Q 200 250 178 254 Z'}
          fill={BLK2} />
        <path d="M200 264 Q 380 276 540 286" stroke="rgba(255,255,255,.15)" strokeWidth="4" strokeDasharray="14 11" fill="none" />
        <path d="M185 290 Q 360 308 545 300" stroke="#0D0D10" strokeWidth="4" opacity=".7" fill="none" />
        <path d="M180 252 Q 330 252 500 268" stroke="#31333A" strokeWidth="4" fill="none" />

        {/* ASA/riel trasero en color (tubo con sombra) */}
        <path d="M182 309 Q 242 334 308 342" stroke={shade(color, -40)} strokeWidth="15" strokeLinecap="round" fill="none" />
        <path d="M180 306 Q 240 330 306 338" stroke={shade(color, -2)} strokeWidth="11" strokeLinecap="round" fill="none" />
        <path d="M246 324 L 242 338" stroke={BLK2} strokeWidth="8" />

        {/* ── COLA: cowl + calavera + soporte + direccional ── */}
        <path d="M178 262 Q 158 264 156 284 L 164 318 L 192 310 L 184 282 Z" fill="#17181C" />
        <rect x="156" y="302" width="36" height="27" rx="7" fill="#C4262B" stroke="#7E1418" strokeWidth="2.5" transform="rotate(-8 174 315)" />
        <path d="M162 308 L 188 304" stroke="rgba(255,255,255,.35)" strokeWidth="3" />
        <path d="M180 328 L 176 376" stroke="#17181C" strokeWidth="11" strokeLinecap="round" />
        <rect x="160" y="366" width="42" height="24" rx="5" fill="#1D1E23" />
        <circle cx={189} cy={402} r={13} fill="#F5A623" stroke="#B87708" strokeWidth="2.5" />
        <circle cx={185} cy={398} r={4} fill="rgba(255,255,255,.55)" />

        {/* ── RUEDA DELANTERA + guardafango + horquilla ── */}
        <NaviWheel cx={866} cy={549} tR={123} rR={70} />
        {/* guardafango montado a la horquilla (flota sobre la llanta) */}
        <path d={'M772 505 Q 778 458 812 440 Q 858 424 906 442 Q 948 462 962 502 L 972 528 Q 974 539 962 541 L 948 542 Q 938 488 890 466 Q 842 450 802 470 Q 782 484 780 510 Z'}
          fill={`url(#${uid}-nblk)`} stroke="#0C0C0E" strokeWidth="3" />
        <path d="M792 458 Q 846 434 908 456" stroke="#3A3C43" strokeWidth="4" fill="none" />
        <path d="M948 542 L 958 580 Q 958 590 946 588 L 934 582 L 928 544 Z" fill={BLK1} />

        {/* horquilla (tras la máscara, hasta el eje) */}
        <path d="M792 240 L 838 432" stroke="#202127" strokeWidth="21" strokeLinecap="round" />
        <path d="M799 248 L 840 424" stroke="#3F434B" strokeWidth="5" strokeLinecap="round" />
        <path d="M838 430 L 866 545" stroke="#101014" strokeWidth="25" strokeLinecap="round" />
        <path d="M840 448 L 862 454 M 844 466 L 866 472 M 848 484 L 870 490" stroke="#06070A" strokeWidth="6" strokeLinecap="round" />
        {/* cables de freno/velocímetro */}
        <path d="M712 202 Q 776 306 844 472 Q 858 514 868 542" stroke="#17181C" strokeWidth="5" fill="none" />
        <path d="M730 200 Q 708 276 734 338" stroke="#17181C" strokeWidth="5" fill="none" />
        <path d="M740 202 Q 724 278 744 342" stroke="#101114" strokeWidth="4" fill="none" />

        {/* ── MÁSCARA del faro ── */}
        <path d={'M763 218 L 827 210 Q 851 220 854 252 L 851 302 Q 847 337 825 350 L 803 351 Q 775 343 767 312 L 760 256 Z'}
          fill={`url(#${uid}-nblk)`} stroke="#0B0B0D" strokeWidth="3" />
        {/* cresta en V en color, partida al centro */}
        <path d="M768 224 L 822 215 Q 844 226 846 255 L 829 267 Q 808 239 776 252 Z"
          fill={`url(#${uid}-body)`} stroke={shade(color, -52)} strokeWidth="2.5" />
        <path d="M808 217 L 824 265" stroke="#15161A" strokeWidth="9" />
        <path d="M774 228 L 805 222" stroke={shade(color, 50)} strokeWidth="4" opacity=".8" />
        {/* FARO: aro cromado + lente con reflejos */}
        <circle cx={839} cy={306} r={35} fill="#0F0F12" />
        <circle cx={839} cy={306} r={31} fill={`url(#${uid}-nlens)`} stroke="#C7CBD2" strokeWidth="4" />
        <path d="M820 294 A 24 24 0 0 1 845 283" stroke="rgba(255,255,255,.85)" strokeWidth="5" fill="none" strokeLinecap="round" />
        <circle cx={845} cy={312} r={7} fill="#AEB2BA" opacity=".7" />
        {/* direccional delantera ámbar */}
        <path d="M833 356 Q 826 378 839 385 Q 852 378 845 356 Q 839 347 833 356 Z"
          fill="#F5A623" stroke="#B87708" strokeWidth="2" />

        {/* ── MANUBRIO, ESPEJOS y MANDOS ── */}
        <path d="M794 222 L 786 185" stroke="#17181C" strokeWidth="12" strokeLinecap="round" />
        <circle cx={784} cy={181} r={9} fill={BLK3} />
        <path d="M784 179 Q 742 167 680 175" stroke="#1B1C20" strokeWidth="11" strokeLinecap="round" fill="none" />
        <path d="M676 175 L 630 182" stroke="#0D0D10" strokeWidth="15" strokeLinecap="round" />
        <circle cx={625} cy={183} r={8} fill={GRY1} />
        <path d="M660 167 Q 680 149 712 145" stroke="#B9BDC4" strokeWidth="6" strokeLinecap="round" fill="none" />
        <rect x="698" y="163" width="27" height="18" rx="5" fill={BLK3} transform="rotate(-5 711 172)" />
        <ellipse cx={768} cy={189} rx={16} ry={10} fill="#17181C" />
        {/* espejo de GOTA en color (alto) */}
        <path d="M756 172 Q 750 142 740 129" stroke="#17181C" strokeWidth="7" strokeLinecap="round" fill="none" />
        <path d="M740 129 Q 710 109 716 81 Q 725 59 749 68 Q 770 77 763 110 Q 760 124 740 129 Z"
          fill={`url(#${uid}-body)`} stroke={shade(color, -50)} strokeWidth="3" />
        <path d="M726 93 Q 730 77 744 75" stroke="rgba(255,255,255,.30)" strokeWidth="5" fill="none" strokeLinecap="round" />
        {/* espejo bajo con luna plateada */}
        <path d="M736 182 Q 708 165 694 156" stroke="#17181C" strokeWidth="6" strokeLinecap="round" fill="none" />
        <ellipse cx={677} cy={146} rx={27} ry={21} fill="#17181C" transform="rotate(-25 677 146)" />
        <ellipse cx={677} cy={146} rx={19} ry={13} fill="#CBD0D6" transform="rotate(-25 677 146)" />
        <path d="M668 139 Q 676 133 686 137" stroke="rgba(255,255,255,.8)" strokeWidth="3" fill="none" />
      </g>
    </g>
  );
}
