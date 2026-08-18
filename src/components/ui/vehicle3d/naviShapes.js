// src/components/ui/vehicle3d/naviShapes.js
// F6 E2-3D (18-ago-2026) — Perfiles 2D de la Honda Navi para el modelo
// three.js. Son LOS MISMOS contornos calcados de la foto del dueño que
// usa NaviArt.jsx (coordenadas de foto 1018×718, cuadrícula sharp):
// aquí se convierten a THREE.Shape en coordenadas de mundo y el modelo
// los EXTRUYE — el perfil lateral queda fiel por construcción.
// Mundo: X = adelante (frente de la moto a +X), Y = arriba, Z = lado
// visible (izquierdo). 1 unidad ≈ 100 px de foto. Piso en Y=0.
import * as THREE from 'three';

const S = 0.01, CX = 544, GROUND = 672;
export const P = (x, y) => [(x - CX) * S, (GROUND - y) * S];

// Convierte una lista de comandos tipo path a THREE.Shape.
// cmds: ['M',x,y] | ['L',x,y] | ['Q',cx,cy,x,y] | ['C',c1x,c1y,c2x,c2y,x,y]
export function shapeFrom(cmds) {
  const sh = new THREE.Shape();
  for (const c of cmds) {
    if (c[0] === 'M') sh.moveTo(...P(c[1], c[2]));
    else if (c[0] === 'L') sh.lineTo(...P(c[1], c[2]));
    else if (c[0] === 'Q') sh.quadraticCurveTo(...P(c[1], c[2]), ...P(c[3], c[4]));
    else if (c[0] === 'C') sh.bezierCurveTo(...P(c[1], c[2]), ...P(c[3], c[4]), ...P(c[5], c[6]));
  }
  sh.closePath();
  return sh;
}

// ── Contornos calcados (idénticos a NaviArt.jsx) ─────────────
export const BODY = [
  ['M', 232, 325], ['C', 300, 320, 420, 306, 500, 298], ['L', 572, 292],
  ['C', 605, 280, 648, 274, 700, 270], ['Q', 722, 270, 726, 282], ['L', 728, 305],
  ['Q', 724, 322, 714, 338], ['L', 698, 388], ['Q', 692, 400, 686, 410],
  ['L', 640, 418], ['L', 600, 390], ['L', 500, 406], ['L', 470, 408],
  ['Q', 490, 430, 484, 462], ['Q', 470, 486, 442, 486], ['Q', 414, 482, 402, 458],
  ['Q', 396, 436, 406, 418], ['L', 370, 402], ['L', 300, 386], ['Q', 268, 372, 246, 344],
];

export const SEAT = [
  ['M', 178, 254], ['Q', 160, 258, 162, 276], ['L', 184, 300], ['Q', 254, 324, 340, 329],
  ['Q', 460, 320, 560, 306], ['L', 572, 292], ['Q', 520, 282, 450, 272],
  ['Q', 340, 260, 254, 256], ['Q', 200, 250, 178, 254],
];

export const BOX = [
  ['M', 490, 470], ['L', 515, 433], ['L', 645, 419], ['L', 697, 443],
  ['L', 694, 554], ['L', 562, 590], ['L', 504, 562],
];

export const MASK = [
  ['M', 763, 218], ['L', 827, 210], ['Q', 851, 220, 854, 252], ['L', 851, 302],
  ['Q', 847, 337, 825, 350], ['L', 803, 351], ['Q', 775, 343, 767, 312], ['L', 760, 256],
];

// Cresta en color: mitad superior del pod (extrusión un poco más ancha
// que la máscara para que asome por ambos lados)
export const CREST = [
  ['M', 763, 218], ['L', 827, 210], ['Q', 851, 220, 854, 252], ['L', 850, 268],
  ['Q', 810, 252, 770, 262],
];

export const FLOOR = [
  ['M', 505, 560], ['L', 690, 545], ['Q', 722, 545, 732, 562], ['L', 736, 586],
  ['Q', 640, 622, 520, 594],
];

export const TAIL_COWL = [
  ['M', 178, 262], ['Q', 158, 264, 156, 284], ['L', 164, 318], ['L', 192, 310], ['L', 184, 282],
];

export const BEAM = [
  ['M', 470, 408], ['L', 595, 383], ['L', 604, 416], ['L', 482, 447],
];

export const ENGINE = [
  ['M', 300, 470], ['L', 470, 460], ['L', 472, 610], ['Q', 400, 642, 342, 616],
  ['Q', 296, 586, 300, 470],
];

// Mofle: rect redondeado (74..302, 477..598) como Shape
export function mufflerShape() {
  const [x1, y1] = P(74, 598), [x2, y2] = P(302, 477); // y1 abajo, y2 arriba
  const r = 0.12, sh = new THREE.Shape();
  sh.moveTo(x1 + r, y1);
  sh.lineTo(x2 - r, y1); sh.quadraticCurveTo(x2, y1, x2, y1 + r);
  sh.lineTo(x2, y2 - r); sh.quadraticCurveTo(x2, y2, x2 - r, y2);
  sh.lineTo(x1 + r, y2); sh.quadraticCurveTo(x1, y2, x1, y2 - r);
  sh.lineTo(x1, y1 + r); sh.quadraticCurveTo(x1, y1, x1 + r, y1);
  sh.closePath();
  return sh;
}

// Sector de anillo (para guardafangos sólidos que envuelven la llanta)
export function annulusSector(rIn, rOut, a0, a1) {
  const sh = new THREE.Shape();
  sh.absarc(0, 0, rOut, a0, a1, false);
  sh.absarc(0, 0, rIn, a1, a0, true);
  sh.closePath();
  return sh;
}

// Extrusión centrada en Z con bisel suave
export function extrudeCentered(shape, depth, opts = {}) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03,
    bevelSegments: 2, curveSegments: 12, ...opts,
  });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

// Cilindro entre dos puntos 3D (horquilla, tubos)
export function tubeBetween(v1, v2, r, mat, radialSegments = 14) {
  const dir = new THREE.Vector3().subVectors(v2, v1);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(r, r, len, radialSegments);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(v1).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return mesh;
}

// Puntos clave (foto) que usa el ensamblado
export const K = {
  rearAxle: P(222, 550), frontAxle: P(866, 549),
  rearTire: 1.25, rearRim: 0.78, frontTire: 1.23, frontRim: 0.70,
  disc: P(450, 432),
  cvt: P(357, 556),
  forkTop: P(792, 240), forkMid: P(838, 432), forkBottom: P(866, 545),
  barCenter: P(778, 176),
  lens: P(846, 300),
  frontSignal: P(839, 368), rearSignal: P(189, 402),
  tailLens: P(170, 312),
  shockTop: P(279, 390), shockBottom: P(272, 466),
};
