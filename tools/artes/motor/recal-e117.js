// E1.17 — recalibración de los 15 livianos/SUV: cajas de FARO con umbral
// bajo (aplanan el interior de la lámpara a un tono), blotchSrc (reflejos
// del cuerpo en el parabrisas se funden al vidrio) y clase white donde
// faltaba. Se apoya en que estos 15 se re-trazan con el arnés E1.16
// (elipses de rin exentas del despeckle + toda clase vota).
const fs = require('fs');
const p = __dirname + '/trace-autos.js';
let s = fs.readFileSync(p, 'utf8');

function inModel(key, fn) {
  const start = s.indexOf('  ' + key + ': {\n    file: ');
  if (start < 0) throw new Error('no ' + key);
  const end = s.indexOf('\n  },', start) + 5;
  let block = s.slice(start, end);
  block = fn(block);
  s = s.slice(0, start) + block + s.slice(end);
}

const setBoxes = (block, boxesStr) => {
  if (block.includes('whiteBoxes:')) {
    return block.replace(/whiteBoxes: \[[^\]]*(?:\][^\]]*)*?\],\n/, 'whiteBoxes: ' + boxesStr + ',\n');
  }
  return block.replace('    fixed: [],\n', '    fixed: [],\n    whiteBoxes: ' + boxesStr + ',\n');
};
const addBlotch = (block, list) =>
  block.replace('    fixed: [],', `    blotchSrc: [${list.map(n => `'${n}'`).join(', ')}],\n    fixed: [],`);
const addWhiteClass = (block, fill) => {
  // agrega clase white al final de classes, al final de order y su fill
  block = block.replace(/(\n    \],\n(?:    mergeInto)?)/, (m, g) => m); // noop guard
  block = block.replace(/\n    \],\n/, `\n      { name: 'white',   rgb: [252, 252, 252] },\n    ],\n`);
  block = block.replace(/order: \[([^\]]*)\]/, (m, inner) => `order: [${inner}, 'white']`);
  block = block.replace(/fills: \{ /, `fills: { white: '${fill}', `);
  return block;
};

// ── sedanes: reemplazar la caja de "flash" por la caja de FARO completa
inModel('civic', b => addBlotch(setBoxes(b, `[
      [455, 483, 690, 556, 170, 256], // FARO completo (th bajo = lámpara sólida)
      [100, 483, 150, 538, 237, 256],
    ]`), ['red', 'darkred']));
inModel('accent', b => addBlotch(setBoxes(b, `[
      [452, 466, 758, 572, 170, 256],
    ]`), ['red', 'darkred']));
inModel('picanto', b => addBlotch(setBoxes(b, `[
      [530, 392, 782, 538, 170, 256],
    ]`), ['red', 'darkred']));
inModel('rio', b => addBlotch(setBoxes(b, `[
      [438, 458, 730, 570, 170, 256],
    ]`), ['red', 'darkred']));
inModel('mazda3', b => addBlotch(setBoxes(b, `[
      [473, 488, 705, 578, 88, 256], // interior del faro 97-136 → th MUY bajo
    ]`), ['red', 'darkred']).replace("white: '#F9F9F9'", "white: '#E4E4E4'"));
inModel('corolla', b => addBlotch(setBoxes(b, `[
      [488, 488, 740, 560, 170, 256],
    ]`), ['red']));
inModel('yaris', b => addBlotch(setBoxes(b, `[
      [465, 483, 712, 570, 170, 256],
      [132, 484, 181, 542, 237, 256],
    ]`), ['red']));

// ── Scion + SUV: clase white nueva + cajas de faro + blotchSrc
inModel('xb', b => addBlotch(setBoxes(addWhiteClass(b, '#F2F2F2'), `[
      [478, 468, 620, 545, 170, 256],
      [118, 456, 195, 532, 170, 256],
    ]`), ['red', 'rB', 'red2', 'rD', 'rE', 'darkred', 'rG']));
inModel('xd', b => addBlotch(setBoxes(addWhiteClass(b, '#F4F4F4'), `[
      [476, 428, 715, 530, 170, 256],
    ]`), ['red', 'rB', 'red2', 'rD', 'rE', 'darkred', 'rG', 'rH']));
inModel('crv', b => addBlotch(setBoxes(addWhiteClass(b, '#F0EFEF'), `[
      [405, 440, 675, 542, 165, 256],
      [90, 435, 142, 528, 165, 256],
    ]`), ['red', 'darkred']));
inModel('tucson', b => addBlotch(setBoxes(addWhiteClass(b, '#E9E8E8'), `[
      [382, 458, 590, 542, 150, 256],
    ]`), ['red', 'rB', 'red2', 'rD', 'darkred', 'rF', 'rG']));
inModel('sportage', b => addBlotch(setBoxes(addWhiteClass(b, '#EFEFEF'), `[
      [448, 425, 658, 575, 160, 256],
      [90, 428, 132, 522, 160, 256],
    ]`), ['red', 'rB', 'red2', 'rD', 'darkred', 'rF', 'rG']));
inModel('cx5', b => addBlotch(setBoxes(addWhiteClass(b, '#E9E9E9'), `[
      [483, 462, 662, 532, 145, 256],
    ]`), ['red', 'rB', 'red2', 'rD', 'darkred', 'rF']));
inModel('runner', b => addBlotch(setBoxes(b, `[
      [798, 173, 1285, 205, 240, 256],
      [418, 425, 668, 512, 160, 256],
      [93, 410, 175, 492, 160, 256],
      [530, 578, 585, 632, 160, 256], // faro de niebla
    ]`), ['red', 'rB', 'red2', 'rD', 'darkred', 'rF', 'rG']));
inModel('rav4', b => addBlotch(setBoxes(addWhiteClass(b, '#EFEFEF'), `[
      [393, 422, 672, 532, 160, 256],
      [92, 432, 146, 522, 160, 256],
    ]`), ['red', 'rB', 'red2', 'rD', 'darkred', 'rF', 'rG']));

fs.writeFileSync(p, s);
console.log('15 configs recalibradas');
