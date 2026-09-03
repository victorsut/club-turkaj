// E1.15 ronda 2: (a) SUVs/Scion — banda de sombra [650-690, 920] y th
// 95-118 (los tonos de UNIÓN sombra-llanta 120-155 quedaban vivos como
// migas y el destello de suelo subía arriba del inicio de banda);
// (b) continuos de rojo → anclas FINAS (paso 6-8) fusionadas a 3 salidas
// (el moteado de puertas/techo era flicker entre 3 anclas separadas 15-20).
const fs = require('fs');
const p = __dirname + '/trace-autos.js';
let s = fs.readFileSync(p, 'utf8');

function replaceModel(key, cfg) {
  const start = s.indexOf('  ' + key + ': {\n    file: ');
  if (start < 0) throw new Error('no ' + key);
  const end = s.indexOf('\n  },', start) + 5;
  s = s.slice(0, start) + cfg + s.slice(end);
}

function fineReds(list, groups) {
  // list: [[name, rgb...], ...] — groups: {extraName: groupName}
  return { list, groups };
}

const R = (name, r, g, b) => `      { name: '${name}', rgb: [${r}, ${g}, ${b}] },`;

replaceModel('xb', `  xb: {
    file: 'AUTOS LIVIANOS/SCION, XB.png', minPx: 500,
    // continuo de rojos 179-230 → 7 anclas finas fusionadas a 3 tonos
    classes: [
${R('red', 230, 9, 15)}
${R('rB', 222, 10, 15)}
${R('red2', 214, 11, 16)}
${R('rD', 206, 11, 16)}
${R('rE', 198, 12, 16)}
${R('darkred', 190, 12, 16)}
${R('rG', 182, 13, 16)}
${R('black', 29, 29, 29)}
${R('dark', 45, 45, 44)}
${R('silver', 185, 184, 184)}
${R('lightgray', 200, 200, 200)}
    ],
    mergeInto: { rB: 'red', rD: 'red2', rE: 'red2', rG: 'darkred' },
    fixed: [],
    shadow: { band: [660, 920], th: 118, exceptMax: 228, exceptEllipses: [[781, 709, 62, 95], [1341, 652, 43, 78]] },
    order: ['black', 'dark', 'silver', 'lightgray', 'darkred', 'red2', 'red'],
    fills: { red: '#E60A0F', rB: '#DE0A0F', red2: '#D60B10', rD: '#CE0B10', rE: '#C60C10', darkred: '#BE0C10', rG: '#B60D10', black: '#1D1D1D', dark: '#2D2D2C', silver: '#B9B8B8', lightgray: '#C8C8C8' },
  },`);

replaceModel('xd', `  xd: {
    file: 'AUTOS LIVIANOS/SCION, XD.png', minPx: 500,
    classes: [
${R('red', 226, 12, 15)}
${R('rB', 219, 11, 14)}
${R('red2', 212, 10, 13)}
${R('rD', 205, 9, 12)}
${R('rE', 198, 9, 11)}
${R('darkred', 190, 8, 10)}
${R('rG', 183, 8, 10)}
${R('rH', 175, 7, 9)}
${R('black', 19, 19, 19)}
${R('dark', 31, 31, 31)}
${R('char', 40, 40, 40)}
${R('silver', 185, 184, 184)}
${R('lightgray', 222, 221, 221)}
    ],
    mergeInto: { rB: 'red', rD: 'red2', rE: 'red2', rG: 'darkred', rH: 'darkred', dark: 'black' },
    fixed: [],
    shadow: { band: [680, 920], th: 95, exceptMax: 228, exceptEllipses: [[788, 704, 65, 100], [1387, 649, 44, 83]] },
    order: ['black', 'char', 'silver', 'lightgray', 'darkred', 'red2', 'red'],
    fills: { red: '#DE0B0E', rB: '#D80B0E', red2: '#D20A0D', rD: '#CC090C', rE: '#C6090B', darkred: '#BE080A', rG: '#B70809', rH: '#AF0709', black: '#131313', dark: '#1F1F1F', char: '#282828', silver: '#B9B8B8', lightgray: '#DEDDDD' },
  },`);

replaceModel('crv', `  crv: {
    file: 'SUV/HONDA, CR-V.png', minPx: 500,
    classes: [
${R('red', 216, 17, 21)}
${R('darkred', 202, 16, 19)}
${R('deep', 21, 21, 21)}
${R('black', 30, 30, 29)}
${R('char', 41, 41, 41)}
${R('gray', 51, 51, 50)}
${R('silver', 186, 184, 184)}
    ],
    mergeInto: { black: 'deep', gray: 'char' },
    fixed: [],
    shadow: { band: [650, 920], th: 118, exceptMax: 228, exceptEllipses: [[777, 683, 61, 94], [1347, 642, 45, 81]] },
    order: ['deep', 'char', 'silver', 'darkred', 'red'],
    fills: { red: '#D81115', darkred: '#CA1013', deep: '#181818', black: '#1E1E1D', char: '#2C2C2C', gray: '#333332', silver: '#BAB8B8' },
  },`);

replaceModel('tucson', `  tucson: {
    file: 'SUV/HYUNDAI, TUCSON.png', minPx: 500,
    classes: [
${R('red', 211, 14, 21)}
${R('rB', 205, 13, 19)}
${R('red2', 199, 12, 18)}
${R('rD', 193, 12, 17)}
${R('darkred', 187, 12, 16)}
${R('rF', 180, 12, 16)}
${R('rG', 173, 11, 15)}
${R('deep', 21, 21, 20)}
${R('black', 30, 30, 30)}
${R('char', 41, 41, 41)}
${R('gray', 50, 50, 50)}
${R('silver', 186, 184, 184)}
    ],
    mergeInto: { rB: 'red', rD: 'red2', rF: 'darkred', rG: 'darkred', black: 'deep', gray: 'char' },
    fixed: [],
    shadow: { band: [650, 920], th: 118, exceptMax: 228, exceptEllipses: [[755, 678, 62, 97], [1340, 636, 46, 83]] },
    order: ['deep', 'char', 'silver', 'darkred', 'red2', 'red'],
    fills: { red: '#D30E15', rB: '#CD0D13', red2: '#C70C12', rD: '#C10C11', darkred: '#BB0C10', rF: '#B40C10', rG: '#AD0B0F', deep: '#161614', black: '#1E1E1E', char: '#292929', gray: '#323232', silver: '#BAB8B8' },
  },`);

replaceModel('sportage', `  sportage: {
    file: 'SUV/KIA, SPORTAGE.png', minPx: 500,
    classes: [
${R('red', 215, 13, 19)}
${R('rB', 209, 13, 19)}
${R('red2', 203, 13, 18)}
${R('rD', 196, 13, 17)}
${R('darkred', 189, 12, 16)}
${R('rF', 182, 12, 15)}
${R('rG', 175, 11, 14)}
${R('deep', 20, 20, 19)}
${R('black', 30, 30, 29)}
${R('char', 42, 42, 41)}
${R('gray', 50, 50, 50)}
${R('silver', 187, 186, 186)}
    ],
    mergeInto: { rB: 'red', rD: 'red2', rF: 'darkred', rG: 'darkred', black: 'deep', gray: 'char' },
    fixed: [],
    shadow: { band: [650, 920], th: 118, exceptMax: 228, exceptEllipses: [[762, 676, 62, 98], [1347, 633, 47, 84]] },
    order: ['deep', 'char', 'silver', 'darkred', 'red2', 'red'],
    fills: { red: '#D50D13', rB: '#CF0D13', red2: '#C90D12', rD: '#C30D11', darkred: '#BD0C10', rF: '#B60C0F', rG: '#AF0B0E', deep: '#151513', black: '#1E1E1D', char: '#2A2A29', gray: '#323232', silver: '#BBBABA' },
  },`);

replaceModel('cx5', `  cx5: {
    file: 'SUV/MAZDA, CX-5.png', minPx: 500,
    classes: [
${R('red', 209, 14, 18)}
${R('rB', 203, 13, 17)}
${R('red2', 197, 13, 16)}
${R('rD', 190, 12, 15)}
${R('darkred', 184, 12, 15)}
${R('rF', 178, 11, 14)}
${R('deep', 20, 20, 19)}
${R('black', 30, 30, 29)}
${R('char', 41, 41, 41)}
${R('gray', 49, 49, 49)}
${R('gray2', 61, 61, 61)}
${R('trim', 79, 79, 78)}
${R('silver', 190, 189, 189)}
    ],
    mergeInto: { rB: 'red', rD: 'red2', rF: 'darkred', black: 'deep', gray: 'char' },
    fixed: [],
    shadow: { band: [650, 920], th: 118, exceptMax: 228, exceptEllipses: [[734, 682, 70, 101], [1372, 635, 46, 85]] },
    order: ['deep', 'char', 'gray2', 'trim', 'silver', 'darkred', 'red2', 'red'],
    fills: { red: '#D10E12', rB: '#CB0D11', red2: '#C50D10', rD: '#BE0C0F', darkred: '#B80C0F', rF: '#B20B0E', deep: '#151513', black: '#1E1E1D', char: '#2A2A29', gray: '#313131', gray2: '#3D3D3D', trim: '#4F4F4E', silver: '#BEBDBD' },
  },`);

replaceModel('runner', `  runner: {
    file: 'SUV/TOYOTA, 4RUNNER.png', minPx: 500,
    classes: [
${R('red', 208, 25, 27)}
${R('rB', 202, 22, 24)}
${R('red2', 196, 20, 21)}
${R('rD', 190, 18, 19)}
${R('darkred', 183, 16, 17)}
${R('rF', 176, 14, 15)}
${R('rG', 170, 12, 13)}
${R('deep', 21, 21, 21)}
${R('black', 31, 31, 30)}
${R('char', 40, 40, 39)}
${R('gray', 48, 48, 47)}
${R('silver', 183, 182, 182)}
${R('white', 251, 251, 251)}
    ],
    mergeInto: { rB: 'red', rD: 'red2', rF: 'darkred', rG: 'darkred', black: 'deep', gray: 'char' },
    fixed: [],
    whiteBoxes: [[798, 173, 1285, 205, 240, 256]],
    shadow: { band: [660, 920], th: 118, exceptMax: 228, exceptEllipses: [[786, 702, 65, 93], [1337, 641, 42, 77]] },
    order: ['deep', 'char', 'silver', 'darkred', 'red2', 'red', 'white'],
    fills: { red: '#D01A1B', rB: '#CA1618', red2: '#C41415', rD: '#BE1213', darkred: '#B71011', rF: '#B00E0F', rG: '#AA0C0D', deep: '#161616', black: '#1F1F1E', char: '#282827', gray: '#30302F', silver: '#B7B6B6', white: '#FBFBFB' },
  },`);

replaceModel('rav4', `  rav4: {
    file: 'SUV/TOYOTA, RAV4.png', minPx: 500,
    classes: [
${R('red', 218, 17, 20)}
${R('rB', 212, 16, 19)}
${R('red2', 205, 16, 18)}
${R('rD', 198, 15, 17)}
${R('darkred', 191, 14, 17)}
${R('rF', 184, 13, 16)}
${R('rG', 178, 13, 16)}
${R('deep', 20, 20, 20)}
${R('black', 29, 30, 29)}
${R('char', 41, 41, 41)}
${R('gray', 50, 50, 50)}
${R('glass', 58, 58, 58)}
${R('silver', 187, 186, 186)}
    ],
    mergeInto: { rB: 'red', rD: 'red2', rF: 'darkred', rG: 'darkred', black: 'deep', gray: 'char' },
    fixed: [],
    shadow: { band: [650, 920], th: 118, exceptMax: 228, exceptEllipses: [[762, 691, 62, 95], [1348, 647, 46, 82]] },
    order: ['deep', 'char', 'glass', 'silver', 'darkred', 'red2', 'red'],
    fills: { red: '#DA1114', red2: '#CD1012', rB: '#D41013', rD: '#C60F11', darkred: '#BF0E11', rF: '#B80D10', rG: '#B20D10', deep: '#151515', black: '#1D1E1D', char: '#292929', gray: '#323232', glass: '#3A3A3A', silver: '#BBBABA' },
  },`);

fs.writeFileSync(p, s);
console.log('8 modelos actualizados');
