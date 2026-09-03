// E1.18 "interpretación" — transforma trace-autos.js:
// (1) exporta MODELS y guarda el main (los generadores lo requieren);
// (2) LÁMPARAS estructuradas: clase 'lamp' + whiteBoxes a th 235 (solo
//     blancos reales) + fixed de clases claras→lamp dentro de la caja
//     (lente plata + destello blanco + elementos oscuros = como la ref);
// (3) bandas de rojo SIN fusionar (degradado fiel);
// (4) ámbar xB/xD + blotchBox bajo la franja del techo.
const fs = require('fs');
const p = __dirname + '/trace-autos.js';
let s = fs.readFileSync(p, 'utf8');

// ── (1) export + main guard
const mainStart = s.indexOf('const key = process.argv[2];');
if (mainStart < 0) throw new Error('main start');
s = s.slice(0, mainStart) +
`// E1.18: transformación de LÁMPARAS y bandas de rojo (ver LAMPS/REDFINE)
applyE118();

module.exports = { MODELS };
if (require.main === module) {
` + s.slice(mainStart).replace(/\n$/, '\n}\n');

// indent existing main? No es necesario: JS permite el bloque sin indentar.

// ── (2..4) appendix con las tablas, insertado ANTES del bloque export
const appendix = `
// ── E1.18 (24-ago): INTERPRETACIÓN — lámparas estructuradas y degradados
// fieles (decisión del dueño: mostrar el modelo TAL CUAL la referencia).
const LAMPS = {
  civic:    { fill: '#D2D2D2', boxes: [[455, 483, 690, 556]], extra: [[100, 483, 150, 538, 237, 256]] },
  accent:   { fill: '#CDCCCC', boxes: [[452, 466, 758, 572]] },
  picanto:  { fill: '#C8C8C8', boxes: [[530, 392, 782, 538]] },
  rio:      { fill: '#CCCBCB', boxes: [[438, 458, 730, 570]] },
  mazda3:   { fill: '#8E8F91', boxes: [[473, 488, 705, 578]] },
  corolla:  { fill: '#CFCECE', boxes: [[488, 488, 740, 560]] },
  yaris:    { fill: '#CFCECE', boxes: [[465, 483, 712, 570]], extra: [[132, 484, 181, 542, 237, 256]] },
  xb:       { fill: '#C6C5C5', boxes: [[478, 468, 620, 545], [118, 456, 195, 532]] },
  xd:       { fill: '#C9C8C8', boxes: [[476, 428, 715, 530]] },
  crv:      { fill: '#C4C2C2', boxes: [[405, 440, 675, 542], [90, 435, 142, 528]] },
  tucson:   { fill: '#C2C0C0', boxes: [[382, 458, 590, 542]] },
  sportage: { fill: '#C6C5C5', boxes: [[448, 425, 658, 575], [90, 428, 132, 522]] },
  cx5:      { fill: '#C6C5C5', boxes: [[483, 462, 662, 532]] },
  runner:   { fill: '#C2C1C1', boxes: [[418, 425, 668, 512], [93, 410, 175, 492], [530, 578, 585, 632]], extra: [[798, 173, 1285, 205, 240, 256]] },
  rav4:     { fill: '#C6C5C5', boxes: [[393, 422, 672, 532], [92, 432, 146, 522]] },
  dmax:     { fill: '#C0BFBF', boxes: [[440, 434, 662, 524], [62, 426, 120, 506]] },
  gladiator:{ fill: '#BEBDBD', boxes: [[413, 430, 472, 509], [153, 424, 197, 500], [482, 483, 568, 517]] },
  l200:     { fill: '#C4C4C4', boxes: [[418, 426, 650, 526], [88, 416, 150, 512]] },
  frontier: { fill: '#C6C6C6', boxes: [[414, 423, 610, 513], [80, 410, 125, 496]] },
  hilux:    { fill: '#CCCCCC', boxes: [[440, 407, 680, 494], [102, 408, 152, 482]] },
  tacoma:   { fill: '#C9C8C8', boxes: [[444, 431, 634, 510], [72, 421, 122, 501]] },
};
// modelos cuyo continuo de rojo sale SIN fusionar (todas las bandas finas)
const REDFINE = ['xb', 'xd', 'tucson', 'sportage', 'cx5', 'runner', 'rav4',
  'dmax', 'gladiator', 'l200', 'frontier', 'r22', 'hilux', 'tacoma'];
const isRedFamily = (c) => c.rgb && c.rgb[0] - c.rgb[1] > 60;

function applyE118() {
  for (const [key, L] of Object.entries(LAMPS)) {
    const M = MODELS[key];
    if (!M) continue;
    // clase lamp (por región vía fixed; el despeckle la respeta por nombre)
    if (!M.classes.some(c => c.name === 'lamp')) {
      M.classes.push({ name: 'lamp', rgb: null });
    }
    // whiteBoxes: cajas de lámpara con th 235 (solo blancos reales) + extras
    M.whiteBoxes = [
      ...L.boxes.map(B => [B[0], B[1], B[2], B[3], 235, 256]),
      ...(L.extra || []),
    ];
    // si el modelo no tenía clase white, dársela (destellos de lámpara)
    if (!M.classes.some(c => c.name === 'white')) {
      M.classes.push({ name: 'white', rgb: [250, 250, 250] });
      M.fills.white = '#FAFAFA';
      if (!M.order.includes('white')) M.order.push('white');
    }
    // fixed: clases claras NEUTRAS → lamp dentro de cada caja de lámpara
    const lights = M.classes.filter(c => c.rgb && !isRedFamily(c)
      && Math.min(...c.rgb) >= 110
      && !['white', 'amber', 'lamp'].includes(c.name)).map(c => c.name);
    M.fixed = (M.fixed || []).filter(f => f.to !== 'lamp');
    for (const B of L.boxes) {
      for (const from of lights) M.fixed.push({ from, to: 'lamp', box: B });
    }
    M.fills.lamp = L.fill;
    if (!M.order.includes('lamp')) {
      M.order.splice(M.order.indexOf('white') >= 0 ? M.order.indexOf('white') : M.order.length, 0, 'lamp');
    }
  }
  // bandas de rojo sin fusionar
  for (const key of REDFINE) {
    const M = MODELS[key];
    if (!M || !M.mergeInto) continue;
    const redNames = new Set(M.classes.filter(isRedFamily).map(c => c.name));
    for (const [a, b] of Object.entries(M.mergeInto)) {
      if (redNames.has(a) && redNames.has(b)) {
        delete M.mergeInto[a];
        // insertar la banda en order junto a su grupo
        if (!M.order.includes(a)) M.order.splice(M.order.indexOf(b), 0, a);
      }
    }
  }
  // ámbar de xB/xD (piezas medidas con ambers.js) + blotchBox bajo la
  // franja ROJA del techo (el absorbedor la mordía)
  if (MODELS.xb) {
    if (!MODELS.xb.classes.some(c => c.name === 'amber')) {
      MODELS.xb.classes.push({ name: 'amber', rgb: [218, 112, 38] });
      MODELS.xb.fills.amber = '#DA7026';
      MODELS.xb.order.push('amber');
    }
    MODELS.xb.blotchBox = [180, 190, 660, 300];
  }
  if (MODELS.xd) {
    if (!MODELS.xd.classes.some(c => c.name === 'amber')) {
      MODELS.xd.classes.push({ name: 'amber', rgb: [227, 149, 90] });
      MODELS.xd.fills.amber = '#E39555';
      MODELS.xd.order.push('amber');
    }
    MODELS.xd.blotchBox = [170, 185, 700, 290];
  }
}

`;
s = s.replace('// E1.18: transformación de LÁMPARAS', appendix + '// E1.18: transformación de LÁMPARAS');
fs.writeFileSync(p, s);
console.log('e118 aplicado');
