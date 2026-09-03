// E1.16 — tanda PICOPS (7 modelos, categoría picop). Mismas reglas de la
// serie de autos 3/4: anclas finas de rojo fusionadas, elipses de rin
// exentas de la banda de sombra, whiteBoxes solo espaciales (el 22R es el
// único con núcleos blancos de faro <250px y ámbar fijo por ancla).
const fs = require('fs');
const p = __dirname + '/trace-autos.js';
let s = fs.readFileSync(p, 'utf8');
const anchor = 'const key = process.argv[2];';
const block = `
// ── E1.16 (24-ago): tanda PICOPS — categoría picop de la app.
Object.assign(MODELS, {
  dmax: {
    file: 'PICOPS/ISUZU, DMAX.png', minPx: 500,
    classes: [
      { name: 'red',     rgb: [208, 21, 27] },
      { name: 'rB',      rgb: [201, 20, 26] },
      { name: 'red2',    rgb: [194, 19, 24] },
      { name: 'rD',      rgb: [187, 19, 23] },
      { name: 'darkred', rgb: [180, 18, 22] },
      { name: 'rF',      rgb: [172, 16, 20] },
      { name: 'deep',    rgb: [22, 22, 21] },
      { name: 'black',   rgb: [30, 30, 29] },
      { name: 'char',    rgb: [40, 40, 39] },
      { name: 'gray',    rgb: [53, 53, 53] },
      { name: 'silver',  rgb: [182, 181, 181] },
    ],
    mergeInto: { rB: 'red', rD: 'red2', rF: 'darkred', black: 'deep' },
    fixed: [],
    shadow: { band: [660, 920], th: 118, exceptMax: 228, exceptEllipses: [[764, 700, 54, 86], [1333, 640, 38, 74]] },
    order: ['deep', 'char', 'gray', 'silver', 'darkred', 'red2', 'red'],
    fills: { red: '#D0151B', rB: '#C9141A', red2: '#C21318', rD: '#BB1317', darkred: '#B41216', rF: '#AC1014', deep: '#161615', black: '#1E1E1D', char: '#282827', gray: '#353535', silver: '#B6B5B5' },
  },
  gladiator: {
    file: 'PICOPS/JEEP, GLADIATOR.png', minPx: 500,
    classes: [
      { name: 'red',     rgb: [218, 21, 27] },
      { name: 'rB',      rgb: [211, 20, 26] },
      { name: 'red2',    rgb: [204, 19, 24] },
      { name: 'rD',      rgb: [197, 18, 22] },
      { name: 'darkred', rgb: [190, 17, 21] },
      { name: 'deep',    rgb: [23, 23, 22] },
      { name: 'black',   rgb: [30, 30, 29] },
      { name: 'char',    rgb: [41, 41, 40] },
      { name: 'gray',    rgb: [49, 49, 48] },
      { name: 'gray2',   rgb: [58, 58, 58] },
      { name: 'silver',  rgb: [180, 179, 179] },
    ],
    mergeInto: { rB: 'red', rD: 'red2', black: 'deep', gray: 'char' },
    fixed: [],
    shadow: { band: [660, 920], th: 118, exceptMax: 228, exceptEllipses: [[664, 696, 58, 88], [1335, 639, 40, 73]] },
    order: ['deep', 'char', 'gray2', 'silver', 'darkred', 'red2', 'red'],
    fills: { red: '#DA151B', rB: '#D31419', red2: '#CC1318', rD: '#C51216', darkred: '#BE1115', deep: '#171716', black: '#1E1E1D', char: '#292928', gray: '#313130', gray2: '#3A3A3A', silver: '#B4B3B3' },
  },
  l200: {
    file: 'PICOPS/MITSUBISHI, L200.png', minPx: 500,
    classes: [
      { name: 'red',     rgb: [218, 23, 26] },
      { name: 'rB',      rgb: [211, 22, 25] },
      { name: 'red2',    rgb: [204, 20, 23] },
      { name: 'rD',      rgb: [197, 19, 22] },
      { name: 'darkred', rgb: [190, 18, 20] },
      { name: 'deep',    rgb: [29, 29, 28] },
      { name: 'char',    rgb: [40, 40, 40] },
      { name: 'gray',    rgb: [48, 47, 47] },
      { name: 'gray2',   rgb: [59, 59, 59] },
      { name: 'glass',   rgb: [74, 74, 74] },
      { name: 'silver',  rgb: [189, 189, 189] },
    ],
    mergeInto: { rB: 'red', rD: 'red2', gray: 'char' },
    fixed: [],
    shadow: { band: [660, 920], th: 118, exceptMax: 228, exceptEllipses: [[756, 698, 53, 85], [1335, 636, 39, 72]] },
    order: ['deep', 'char', 'gray2', 'glass', 'silver', 'darkred', 'red2', 'red'],
    fills: { red: '#DA171A', rB: '#D31619', red2: '#CC1417', rD: '#C51316', darkred: '#BE1214', deep: '#1D1D1C', char: '#282828', gray: '#302F2F', gray2: '#3B3B3B', glass: '#4A4A4A', silver: '#BDBDBD' },
  },
  frontier: {
    file: 'PICOPS/NISSAN, FRONTIER.png', minPx: 500,
    classes: [
      { name: 'red',     rgb: [199, 22, 26] },
      { name: 'rB',      rgb: [193, 21, 24] },
      { name: 'red2',    rgb: [187, 20, 23] },
      { name: 'rD',      rgb: [181, 19, 22] },
      { name: 'darkred', rgb: [175, 18, 21] },
      { name: 'rF',      rgb: [169, 17, 20] },
      { name: 'deep',    rgb: [21, 21, 21] },
      { name: 'black',   rgb: [30, 30, 30] },
      { name: 'char',    rgb: [40, 40, 40] },
      { name: 'gray',    rgb: [48, 48, 48] },
      { name: 'gray2',   rgb: [59, 59, 58] },
      { name: 'glass',   rgb: [81, 81, 80] },
      { name: 'silver',  rgb: [195, 195, 195] },
    ],
    mergeInto: { rB: 'red', rD: 'red2', rF: 'darkred', black: 'deep', gray: 'char' },
    fixed: [],
    shadow: { band: [655, 920], th: 118, exceptMax: 228, exceptEllipses: [[736, 685, 56, 87], [1339, 639, 39, 73]] },
    order: ['deep', 'char', 'gray2', 'glass', 'silver', 'darkred', 'red2', 'red'],
    fills: { red: '#C7161A', rB: '#C11518', red2: '#BB1417', rD: '#B51316', darkred: '#AF1215', rF: '#A91114', deep: '#151515', black: '#1E1E1E', char: '#282828', gray: '#303030', gray2: '#3B3B3A', glass: '#515150', silver: '#C3C3C3' },
  },
  r22: {
    file: 'PICOPS/TOYOTA, 22R.png', minPx: 500,
    // clásico: ÁMBAR fijo (esquineros + bumper) por ancla; faros con
    // núcleo blanco chico → whiteBoxes; continuo de rojos MUY ancho
    classes: [
      { name: 'red',     rgb: [227, 15, 28] },
      { name: 'rB',      rgb: [219, 13, 25] },
      { name: 'red2',    rgb: [211, 12, 21] },
      { name: 'rD',      rgb: [203, 11, 19] },
      { name: 'darkred', rgb: [195, 11, 18] },
      { name: 'rF',      rgb: [187, 10, 16] },
      { name: 'rG',      rgb: [178, 9, 14] },
      { name: 'rH',      rgb: [163, 8, 12] },
      { name: 'deep',    rgb: [19, 19, 19] },
      { name: 'black',   rgb: [30, 30, 30] },
      { name: 'char',    rgb: [40, 40, 40] },
      { name: 'gray',    rgb: [51, 51, 51] },
      { name: 'silver',  rgb: [200, 200, 200] },
      { name: 'amber',   rgb: [230, 148, 38] },
      { name: 'white',   rgb: [252, 252, 252] },
    ],
    mergeInto: { rB: 'red', rD: 'red2', rF: 'darkred', rG: 'darkred', rH: 'darkred', black: 'deep' },
    fixed: [],
    whiteBoxes: [[55, 460, 135, 575, 235, 256], [430, 460, 545, 560, 235, 256]],
    shadow: { band: [655, 915], th: 118, exceptMax: 228, exceptEllipses: [[703, 690, 54, 85], [1281, 616, 30, 57]] },
    order: ['deep', 'char', 'gray', 'silver', 'darkred', 'red2', 'red', 'amber', 'white'],
    fills: { red: '#E30F1C', rB: '#DB0D19', red2: '#D30C15', rD: '#CB0B13', darkred: '#C30B12', rF: '#BB0A10', rG: '#B2090E', rH: '#A3080C', deep: '#131313', black: '#1E1E1E', char: '#282828', gray: '#333333', silver: '#C8C8C8', amber: '#E69426', white: '#FCFCFC' },
  },
  hilux: {
    file: 'PICOPS/TOYOTA, HILUX.png', minPx: 500,
    classes: [
      { name: 'red',     rgb: [221, 25, 26] },
      { name: 'rB',      rgb: [214, 22, 23] },
      { name: 'red2',    rgb: [207, 20, 21] },
      { name: 'rD',      rgb: [200, 18, 19] },
      { name: 'darkred', rgb: [193, 17, 18] },
      { name: 'deep',    rgb: [20, 20, 20] },
      { name: 'black',   rgb: [28, 28, 28] },
      { name: 'char',    rgb: [40, 40, 40] },
      { name: 'gray',    rgb: [51, 51, 50] },
      { name: 'glass',   rgb: [121, 121, 121] },
      { name: 'silver',  rgb: [203, 203, 203] },
    ],
    mergeInto: { rB: 'red', rD: 'red2', black: 'deep', gray: 'char' },
    fixed: [],
    shadow: { band: [645, 915], th: 118, exceptMax: 228, exceptEllipses: [[777, 683, 55, 89], [1339, 617, 39, 73]] },
    order: ['deep', 'char', 'glass', 'silver', 'darkred', 'red2', 'red'],
    fills: { red: '#DD191A'.slice(0, 7), rB: '#D61617', red2: '#CF1415', rD: '#C81213', darkred: '#C11112', deep: '#141414', black: '#1C1C1C', char: '#282828', gray: '#333332', glass: '#797979', silver: '#CBCBCB' },
  },
  tacoma: {
    file: 'PICOPS/TOYOTA, TACOMA.png', minPx: 500,
    classes: [
      { name: 'red',     rgb: [218, 19, 26] },
      { name: 'rB',      rgb: [211, 18, 24] },
      { name: 'red2',    rgb: [204, 17, 23] },
      { name: 'rD',      rgb: [197, 15, 20] },
      { name: 'darkred', rgb: [190, 13, 18] },
      { name: 'rF',      rgb: [183, 12, 17] },
      { name: 'rG',      rgb: [176, 12, 16] },
      { name: 'deep',    rgb: [14, 14, 14] },
      { name: 'black',   rgb: [20, 20, 20] },
      { name: 'dark',    rgb: [30, 30, 30] },
      { name: 'char',    rgb: [38, 38, 38] },
      { name: 'gray',    rgb: [50, 51, 50] },
      { name: 'glass',   rgb: [62, 62, 62] },
      { name: 'silver',  rgb: [201, 200, 200] },
    ],
    mergeInto: { rB: 'red', rD: 'red2', rF: 'darkred', rG: 'darkred', black: 'deep', char: 'dark' },
    fixed: [],
    shadow: { band: [655, 920], th: 118, exceptMax: 228, exceptEllipses: [[742, 700, 55, 80], [1331, 653, 38, 64]] },
    order: ['deep', 'dark', 'gray', 'glass', 'silver', 'darkred', 'red2', 'red'],
    fills: { red: '#DA131A', rB: '#D31218', red2: '#CC1117', rD: '#C50F14', darkred: '#BE0D12', rF: '#B70C11', rG: '#B00C10', deep: '#0E0E0E', black: '#141414', dark: '#1E1E1E', char: '#262626', gray: '#323332', glass: '#3E3E3E', silver: '#C9C8C8' },
  },
});

`;
if (!s.includes(anchor)) { console.error('anchor missing'); process.exit(1); }
if (s.includes('dmax: {')) { console.error('already added'); process.exit(1); }
s = s.replace(anchor, block + anchor);
fs.writeFileSync(p, s);
console.log('7 configs picops');
