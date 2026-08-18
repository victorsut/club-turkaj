// src/components/ui/vehicle3d/NaviModel.js
// F6 E2-3D — Ensamblado three.js de la Honda Navi (estilo die-cast de
// colección). El perfil lateral sale de los contornos CALCADOS de la
// foto (naviShapes.js); llantas, resorte en hélice, guardafangos
// envolventes, horquilla y manubrio son geometría 3D real.
// buildNavi(color) → { group, recolor(hex) }.
import * as THREE from 'three';
import {
  P, K, shapeFrom, extrudeCentered, mufflerShape, annulusSector, tubeBetween,
  BODY, SEAT, BOX, MASK, CREST, FLOOR, TAIL_COWL, BEAM, ENGINE,
} from './naviShapes.js';

const M = (color, rough = 0.55, metal = 0.15) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });

export function buildNavi(colorHex = '#C62828') {
  const g = new THREE.Group();
  const add = (mesh, x = 0, y = 0, z = 0) => { mesh.position.set(x, y, z); g.add(mesh); return mesh; };
  const cast = (m) => { m.castShadow = true; return m; };

  // Materiales (los del cuerpo se registran para recolorear)
  const bodyMats = [];
  const bodyMat = () => { const m = M(colorHex, 0.32, 0.35); bodyMats.push(m); return m; };
  const rubber = M('#1A1B1E', 0.95, 0);
  const rimM = M('#212226', 0.42, 0.35);
  const blackP = M('#1B1C21', 0.6, 0.1);
  const darkG = M('#2E3036', 0.55, 0.12);
  const beamM = M('#4C4E56', 0.5, 0.25);
  const seatM = M('#1B1C21', 0.88, 0);
  const metal = M('#AEB3BB', 0.3, 0.9);
  const chrome = M('#D8DCE2', 0.15, 1);
  const springM = M('#D93B32', 0.4, 0.2);      // ROJO fijo, como el real
  const lensM = new THREE.MeshStandardMaterial({ color: '#EFEDE6', roughness: 0.1, metalness: 0.1, emissive: '#666055', emissiveIntensity: 0.35 });
  const amber = new THREE.MeshStandardMaterial({ color: '#F5A623', roughness: 0.3, emissive: '#8A5A00', emissiveIntensity: 0.5 });
  const tailR = new THREE.MeshStandardMaterial({ color: '#C4262B', roughness: 0.3, emissive: '#5A0E10', emissiveIntensity: 0.4 });

  // ── Ruedas: toro (llanta) + rin con 8 ranuras + maza ──
  const wheel = (cx, cy, tR, rR, w) => {
    const wg = new THREE.Group();
    const tube = 0.40;
    const tire = new THREE.Mesh(new THREE.TorusGeometry(tR - tube, tube, 18, 40), rubber);
    tire.scale.z = w / (tube * 2);
    cast(tire); wg.add(tire);
    const rim = cast(new THREE.Mesh(new THREE.CylinderGeometry(rR, rR, w * 0.42, 28), rimM));
    rim.rotation.x = Math.PI / 2; wg.add(rim);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.3;
      const slot = new THREE.Mesh(new THREE.CylinderGeometry(rR * 0.13, rR * 0.13, w * 0.46, 10), M('#0B0B0D', 0.8, 0));
      slot.rotation.x = Math.PI / 2;
      slot.position.set(Math.cos(a) * rR * 0.56, Math.sin(a) * rR * 0.56, 0);
      wg.add(slot);
    }
    const hub = cast(new THREE.Mesh(new THREE.CylinderGeometry(rR * 0.34, rR * 0.34, w * 0.62, 20), darkG));
    hub.rotation.x = Math.PI / 2; wg.add(hub);
    const capG = new THREE.CylinderGeometry(0.09, 0.09, w * 0.72, 12);
    const cap = new THREE.Mesh(capG, metal); cap.rotation.x = Math.PI / 2; wg.add(cap);
    wg.position.set(cx, cy, 0);
    return wg;
  };
  g.add(wheel(...K.rearAxle, K.rearTire, K.rearRim, 0.86));
  g.add(wheel(...K.frontAxle, K.frontTire, K.frontRim, 0.80));

  // ── Guardafangos envolventes (sector de anillo extruido) ──
  const fender = (axle, rIn, rOut, a0, a1, w, mat) => {
    const geo = extrudeCentered(annulusSector(rIn, rOut, a0, a1), w, { bevelThickness: 0.02, bevelSize: 0.02, curveSegments: 24 });
    const m = cast(new THREE.Mesh(geo, mat));
    m.position.set(axle[0], axle[1], 0);
    return m;
  };
  g.add(fender(K.frontAxle, 1.26, 1.40, THREE.MathUtils.degToRad(25), THREE.MathUtils.degToRad(150), 0.92, blackP));
  g.add(fender(K.rearAxle, 1.29, 1.41, THREE.MathUtils.degToRad(38), THREE.MathUtils.degToRad(152), 0.92, blackP));

  // ── Cuerpo en color (contorno calcado, extruido) ──
  const body = cast(new THREE.Mesh(extrudeCentered(shapeFrom(BODY), 0.56), bodyMat()));
  g.add(body);
  // disco lateral con aro (ambos lados)
  [1, -1].forEach(s => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.055, 12, 28), darkG);
    ring.position.set(...K.disc, s * 0.33); g.add(ring);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.1, 24), bodyMat());
    disc.rotation.x = Math.PI / 2; disc.position.set(...K.disc, s * 0.33); g.add(disc);
  });

  // ── Asiento + asa trasera en color ──
  g.add(cast(new THREE.Mesh(extrudeCentered(shapeFrom(SEAT), 0.54), seatM)));
  [1, -1].forEach(s => {
    const railPts = [P(182, 309), P(240, 330), P(306, 338)].map(([x, y]) => new THREE.Vector3(x, y, s * 0.26));
    const rail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(railPts), 12, 0.05, 10), bodyMat());
    g.add(cast(rail));
  });

  // ── Caja portaequipaje + motor + faldones ──
  g.add(cast(new THREE.Mesh(extrudeCentered(shapeFrom(BOX), 0.56), darkG)));
  g.add(cast(new THREE.Mesh(extrudeCentered(shapeFrom(ENGINE), 0.5), blackP)));
  const cvt = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.14, 26), darkG);
  cvt.rotation.x = Math.PI / 2; add(cvt, ...K.cvt, 0.32);
  const cvtCap = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.2, 18), M('#43454C', 0.4, 0.3));
  cvtCap.rotation.x = Math.PI / 2; add(cvtCap, ...K.cvt, 0.34);

  // ── Mofle (lado izquierdo) + piso + viga ──
  const muf = cast(new THREE.Mesh(extrudeCentered(mufflerShape(), 0.4, { bevelThickness: 0.05, bevelSize: 0.05 }), darkG));
  muf.position.z = 0.42; g.add(muf);
  const [mpx, mpy] = P(188, 546);
  const mufPlate = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.6, 0.06), blackP);
  add(mufPlate, mpx, mpy, 0.66);
  g.add(cast(new THREE.Mesh(extrudeCentered(shapeFrom(FLOOR), 0.6), blackP)));
  g.add(cast(new THREE.Mesh(extrudeCentered(shapeFrom(BEAM), 0.7), beamM)));

  // ── Amortiguador: barra + RESORTE ROJO en hélice real ──
  const st = new THREE.Vector3(...K.shockTop, 0.28), sb = new THREE.Vector3(...K.shockBottom, 0.28);
  g.add(tubeBetween(st, sb, 0.045, blackP));
  const coils = 7, helixPts = [];
  for (let i = 0; i <= coils * 16; i++) {
    const t = i / (coils * 16), a = t * coils * Math.PI * 2;
    const c = new THREE.Vector3().lerpVectors(st, sb, t);
    helixPts.push(new THREE.Vector3(c.x + Math.cos(a) * 0.12, c.y, c.z + Math.sin(a) * 0.12));
  }
  g.add(cast(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helixPts), coils * 16, 0.032, 8), springM)));

  // ── Cola: cowl + calavera + direccionales ──
  g.add(cast(new THREE.Mesh(extrudeCentered(shapeFrom(TAIL_COWL), 0.34), blackP)));
  const tl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.3), tailR);
  add(tl, K.tailLens[0] - 0.04, K.tailLens[1], 0);
  [1, -1].forEach(s => {
    add(new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 12), amber), K.rearSignal[0], K.rearSignal[1], s * 0.18);
    g.add(tubeBetween(new THREE.Vector3(P(180, 330)[0], P(180, 330)[1], s * 0.14),
      new THREE.Vector3(K.rearSignal[0], K.rearSignal[1] + 0.08, s * 0.18), 0.025, blackP));
  });

  // ── Horquilla (dos piernas) + tijera ──
  [1, -1].forEach(s => {
    const z = s * 0.17;
    g.add(cast(tubeBetween(new THREE.Vector3(...K.forkTop, z), new THREE.Vector3(...K.forkMid, z), 0.085, blackP)));
    g.add(cast(tubeBetween(new THREE.Vector3(...K.forkMid, z), new THREE.Vector3(...K.forkBottom, z), 0.105, M('#101014', 0.5, 0.2))));
  });
  const crown = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.5), blackP);
  add(crown, ...K.forkTop, 0);

  // ── Máscara + faro + cresta en color ──
  const mask = cast(new THREE.Mesh(extrudeCentered(shapeFrom(MASK), 0.5), blackP));
  g.add(mask);
  g.add(new THREE.Mesh(extrudeCentered(shapeFrom(CREST), 0.56), bodyMat()));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 10, 26), chrome);
  ring.rotation.y = Math.PI / 2; add(ring, K.lens[0] + 0.1, K.lens[1], 0);
  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 16), lensM);
  lens.scale.set(0.4, 1, 1); add(lens, K.lens[0] + 0.1, K.lens[1], 0);
  add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), amber), K.frontSignal[0] + 0.05, K.frontSignal[1], 0);

  // ── Manubrio + espejos + palanca ──
  const [bx, by] = K.barCenter;
  g.add(tubeBetween(new THREE.Vector3(...K.forkTop, 0), new THREE.Vector3(bx, by, 0), 0.06, blackP));
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.16, 12), blackP);
  bar.rotation.x = Math.PI / 2; add(bar, bx, by, 0);
  [1, -1].forEach(s => {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.2, 12), M('#0D0D10', 0.9, 0));
    grip.rotation.x = Math.PI / 2; add(grip, bx, by, s * 0.56);
    g.add(tubeBetween(new THREE.Vector3(bx, by, s * 0.44), new THREE.Vector3(bx - 0.35, by + 0.85, s * 0.5), 0.028, blackP));
    const mir = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), bodyMat());
    mir.scale.set(0.5, 1.15, 0.75); mir.rotation.z = -0.3;
    add(mir, bx - 0.38, by + 0.95, s * 0.5);
    const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.34, 8), chrome);
    lever.rotation.set(Math.PI / 2, 0, 0.5); add(lever, bx + 0.22, by + 0.05, s * 0.4);
  });

  // ── Caballete central ──
  [0.16, -0.16].forEach(z => {
    g.add(tubeBetween(new THREE.Vector3(P(603, 592)[0], P(603, 592)[1], z),
      new THREE.Vector3(P(589, 652)[0], P(589, 652)[1], z), 0.05, darkG));
  });

  const recolor = (hex) => bodyMats.forEach(m => m.color.set(hex));
  return { group: g, recolor };
}
