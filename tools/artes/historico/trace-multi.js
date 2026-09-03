// Arnés PARAMÉTRICO de calco (pipeline E1.9g/E1.10) — un config por
// modelo: anclas de color, regiones de rojo FIJO (calavera/resorte),
// cajas de BLANCO real (piezas, no huecos), banda de SOMBRA de piso a
// descartar. Uso: node trace-multi.js <modelo>
// Reglas heredadas: flood-fill fondo, mayoría 5×5 con voto de fondo
// CALIFICADO (≥60%), despeckle por componentes solo entre neutras y sin
// absorber islas junto a fondo/hueco, dilatación 2px, potrace sin
// redondear, fillRule evenodd.
const sharp = require('C:/proyectos/club-turkaj/node_modules/sharp');
const potrace = require('C:/Users/gasol/AppData/Local/Temp/claude/C--proyectos-club-turkaj/28aa1b05-a99c-469f-946b-6aef7d919aca/scratchpad/node_modules/potrace');
const fs = require('fs');
const DIR = 'C:/proyectos/club-turkaj/REFERENCIAS INTERFAZ/VEHÍCULOS/';
const O = __dirname;

// fixedFrom: [claseOrigen, caja] — píxeles de esa clase dentro de la caja
//   pasan a la clase fija (p.ej. calavera roja que no recolorea).
// whiteBoxes: near-white (>=umbral blanco) dentro = clase 'white'; fuera
//   = transparente (huecos). Sin whiteBoxes: todo near-white = transparente.
// shadow: { band:[y1,y2], rgb } — ancla extra SOLO dentro de la banda;
//   lo clasificado ahí NO se emite (la app pinta su propia sombra).
const MODELS = {
  boxer: {
    file: 'BAJAJ, BOXER.png',
    classes: [
      { name: 'red',    rgb: [209, 22, 26] },   // tanque/panel/guardafangos → recolor
      { name: 'black',  rgb: [52, 54, 57] },
      { name: 'tire',   rgb: [30, 33, 37] },
      { name: 'gray',   rgb: [153, 155, 157] },
      { name: 'silver', rgb: [172, 174, 176] },
      { name: 'silver2',rgb: [190, 192, 194] },
      { name: 'lightgray', rgb: [206, 208, 210] },
      { name: 'amber',  rgb: [240, 160, 40] },
      { name: 'taillight', rgb: null },
      { name: 'spring', rgb: null },
    ],
    fixed: [
      { from: 'red', to: 'taillight', box: [130, 360, 230, 470] },
      { from: 'red', to: 'spring',    box: [408, 440, 510, 640] },
    ],
    order: ['tire', 'black', 'gray', 'silver', 'silver2', 'lightgray', 'red', 'taillight', 'spring', 'amber'],
    fills: { red: '#D11116', black: '#343638', tire: '#1E2125', gray: '#98999C', silver: '#A9AAAD', silver2: '#BBBCBF', lightgray: '#CCCDD0', amber: '#F49C1F', taillight: '#D02427', spring: '#E02A28' },
  },
  pulsar: {
    file: 'BAJAJ, PULSAR.png',
    passes: 3, minPx: 500, // degradados suaves dentro de piezas → anti-camuflaje
    classes: [
      { name: 'red',    rgb: [211, 36, 42] },
      { name: 'black',  rgb: [30, 37, 42] },
      { name: 'dark2',  rgb: [45, 50, 53] },
      { name: 'slate',  rgb: [72, 75, 80] },
      { name: 'midslate', rgb: [108, 110, 113] },
      { name: 'gray',   rgb: [133, 135, 138] },
      { name: 'silver', rgb: [176, 177, 180] },
      { name: 'spring', rgb: null },
    ],
    fixed: [
      { from: 'red', to: 'spring', box: [390, 470, 500, 620] },
    ],
    order: ['black', 'dark2', 'slate', 'midslate', 'gray', 'silver', 'red', 'spring'],
    fills: { red: '#D32429', black: '#1E252A', dark2: '#2D3235', slate: '#484B50', midslate: '#6C6E71', gray: '#85878A', silver: '#B1B2B4', spring: '#E02A28' },
  },
  activa: {
    file: 'HONDA, ACTIVA.png',
    classes: [
      { name: 'red',     rgb: [198, 36, 42] },
      { name: 'darkred', rgb: [176, 24, 38] },
      { name: 'black',   rgb: [54, 56, 58] },
      { name: 'tire',    rgb: [36, 38, 40] },
      { name: 'darkgray',rgb: [68, 70, 73] },
      { name: 'gray',    rgb: [150, 152, 156] },
      { name: 'silver',  rgb: [187, 189, 191] },
      { name: 'lightgray', rgb: [206, 208, 210] },
      { name: 'amber',   rgb: [240, 160, 40] },
    ],
    fixed: [],
    order: ['tire', 'black', 'darkgray', 'gray', 'silver', 'lightgray', 'darkred', 'red', 'amber'],
    fills: { red: '#C62329', darkred: '#B01824', black: '#36383A', tire: '#242628', darkgray: '#444649', gray: '#96989C', silver: '#BBBCBF', lightgray: '#CCCDD0', amber: '#F49C1F' },
  },
  cgl: {
    file: 'HONDA, CGL.png',
    classes: [
      { name: 'red',     rgb: [114, 32, 38] },  // guinda → recolor
      { name: 'darkred', rgb: [66, 28, 34] },
      { name: 'black',   rgb: [52, 54, 56] },
      { name: 'tire',    rgb: [36, 38, 40] },
      { name: 'darkgray',rgb: [80, 82, 85] },
      { name: 'gray',    rgb: [153, 155, 157] },
      { name: 'silver',  rgb: [172, 174, 176] },
      { name: 'silver2', rgb: [190, 192, 194] },
      { name: 'lightgray', rgb: [206, 208, 210] },
      { name: 'amber',   rgb: [240, 160, 40] },
      { name: 'taillight', rgb: null },
    ],
    fixed: [
      { from: 'red', to: 'taillight', box: [95, 370, 220, 460] },
      { from: 'darkred', to: 'taillight', box: [95, 370, 220, 460] },
    ],
    order: ['tire', 'black', 'darkgray', 'gray', 'silver', 'silver2', 'lightgray', 'darkred', 'red', 'taillight', 'amber'],
    fills: { red: '#722227', darkred: '#421C21', black: '#343638', tire: '#242628', darkgray: '#505255', gray: '#98999C', silver: '#A9AAAD', silver2: '#BBBCBF', lightgray: '#CCCDD0', amber: '#F49C1F', taillight: '#C0272B' },
  },
  crf: {
    file: 'HONDA, CRF.png',
    classes: [
      { name: 'red',     rgb: [226, 36, 42] },
      { name: 'darkred', rgb: [200, 28, 36] },
      { name: 'navy',    rgb: [50, 52, 72] },
      { name: 'black',   rgb: [52, 54, 57] },
      { name: 'darkgray',rgb: [68, 70, 73] },
      { name: 'mid',     rgb: [120, 122, 126] },
      { name: 'gray',    rgb: [153, 155, 157] },
      { name: 'silver',  rgb: [187, 189, 191] },
      { name: 'lightgray', rgb: [206, 208, 210] },
      { name: 'xlight',  rgb: [221, 222, 224] },
      { name: 'white',   rgb: [244, 245, 245] },
      { name: 'spring',  rgb: null },
    ],
    fixed: [
      { from: 'red', to: 'spring', box: [545, 520, 630, 620] },
    ],
    whiteBoxes: [[640, 280, 1080, 430]], // swoosh blanco del shroud
    shadow: { band: [858, 935], th: 205 },
    order: ['tire?', 'black', 'darkgray', 'navy', 'mid', 'gray', 'silver', 'lightgray', 'xlight', 'darkred', 'red', 'spring', 'white'].filter(x => x !== 'tire?'),
    fills: { red: '#E2242A', darkred: '#C41C24', navy: '#32344A', black: '#343639', darkgray: '#444649', mid: '#787A7E', gray: '#98999C', silver: '#BBBCBF', lightgray: '#CCCDD0', xlight: '#DDDEE0', white: '#F4F5F5', spring: '#E02A28' },
  },
  gnh: {
    file: 'HONDA, GN.png',
    classes: [
      { name: 'red',     rgb: [198, 34, 42] },
      { name: 'black',   rgb: [52, 54, 56] },
      { name: 'tire',    rgb: [28, 30, 32] },
      { name: 'darkgray',rgb: [84, 86, 88] },
      { name: 'gray',    rgb: [153, 155, 157] },
      { name: 'silver',  rgb: [172, 174, 176] },
      { name: 'silver2', rgb: [190, 192, 194] },
      { name: 'lightgray', rgb: [208, 210, 212] },
      { name: 'xlight',  rgb: [222, 223, 225] },
      { name: 'amber',   rgb: [240, 160, 40] },
      { name: 'taillight', rgb: null },
    ],
    fixed: [
      { from: 'red', to: 'taillight', box: [40, 490, 130, 590] },
      { from: 'red', to: 'taillight', box: [930, 270, 1010, 340] }, // depósito del freno
    ],
    shadow: { band: [948, 1025], th: 208 },
    order: ['tire', 'black', 'darkgray', 'gray', 'silver', 'silver2', 'lightgray', 'xlight', 'red', 'taillight', 'amber'],
    fills: { red: '#C62329', black: '#343638', tire: '#1C1E20', darkgray: '#545659', gray: '#98999C', silver: '#A9AAAD', silver2: '#BBBCBF', lightgray: '#D0D1D4', xlight: '#DEDFE1', amber: '#F49C1F', taillight: '#C0272B' },
  },
  xr: {
    file: 'HONDA, XR.png',
    classes: [
      { name: 'red',     rgb: [211, 36, 42] },
      { name: 'black',   rgb: [52, 54, 58] },
      { name: 'tire',    rgb: [32, 35, 45] },
      { name: 'darkgray',rgb: [100, 102, 106] },
      { name: 'gray',    rgb: [120, 122, 126] },
      { name: 'silver',  rgb: [187, 189, 191] },
      { name: 'lightgray', rgb: [206, 208, 210] },
      { name: 'xlight',  rgb: [221, 222, 224] },
      { name: 'white',   rgb: [240, 241, 241] },
    ],
    fixed: [],
    whiteBoxes: [[380, 300, 1120, 700]], // paneles blancos laterales + swoosh
    shadow: { band: [878, 945], th: 205 },
    order: ['tire', 'black', 'darkgray', 'gray', 'silver', 'lightgray', 'xlight', 'red', 'white'],
    fills: { red: '#D32429', black: '#343639', tire: '#20232B', darkgray: '#64666A', gray: '#787A7E', silver: '#BBBCBF', lightgray: '#CCCDD0', xlight: '#DDDEE0', white: '#F2F3F3' },
  },
  zeta: {
    file: 'ITALIKA, Z.png',
    passes: 2, minPx: 400, // anti-camuflaje sin morder la franja blanca fina de la cola
    classes: [
      { name: 'green',   rgb: [122, 176, 60] },  // → recolor
      { name: 'charcoal',rgb: [66, 70, 72] },
      { name: 'dark',    rgb: [50, 56, 58] },
      { name: 'tire',    rgb: [34, 44, 46] },
      { name: 'gray',    rgb: [120, 122, 126] },
      { name: 'silver',  rgb: [172, 174, 176] },
      { name: 'lightgray', rgb: [204, 205, 210] },
      { name: 'xlight',  rgb: [221, 222, 224] },
      { name: 'white',   rgb: [242, 243, 243] },
    ],
    fixed: [],
    // acentos blancos: check del shroud + cowl frontal + STRIPE de la cola
    // + CUÑA blanca entre el larguero y la cola (pieza real con sombreado)
    whiteBoxes: [[400, 380, 1250, 560], [200, 260, 460, 360], [455, 415, 730, 600, 200]],
    shadow: { band: [906, 945], th: 198 },
    order: ['tire', 'dark', 'charcoal', 'gray', 'silver', 'lightgray', 'xlight', 'green', 'white'],
    fills: { green: '#76B233', charcoal: '#3E4244', dark: '#2E3436', tire: '#20282A', gray: '#787A7E', silver: '#A9AAAD', lightgray: '#CCCDD2', xlight: '#DDDEE0', white: '#F2F3F3' },
  },
};

Object.assign(MODELS, {
  dita: {
    file: 'ITALIKA, D.png',
    classes: [
      { name: 'teal',    rgb: [10, 138, 170] },  // → recolor
      { name: 'darkteal',rgb: [5, 118, 140] },   // sombra del cuerpo
      { name: 'char1',   rgb: [68, 70, 82] },
      { name: 'char2',   rgb: [52, 56, 64] },
      { name: 'dark',    rgb: [36, 44, 50] },
      { name: 'xlight',  rgb: [220, 221, 223] },
      { name: 'white',   rgb: [242, 243, 243] },
      { name: 'tailred', rgb: [208, 45, 50] },   // acento rojo FIJO de la cola
      { name: 'amber',   rgb: [235, 150, 45] },
    ],
    fixed: [],
    whiteBoxes: [[220, 380, 720, 640], [1000, 290, 1320, 580]],
    shadow: { band: [888, 935], th: 205 },
    order: ['dark', 'char2', 'char1', 'xlight', 'darkteal', 'teal', 'white', 'tailred', 'amber'],
    fills: { teal: '#0A8AAA', darkteal: '#057890', char1: '#444652', char2: '#343840', dark: '#242C32', xlight: '#DCDDDF', white: '#F2F3F3', tailred: '#D02D32', amber: '#EB962D'.slice(0, 7), },
  },
  dm: {
    file: 'ITALIKA, DM.png',
    classes: [
      { name: 'orange', rgb: [238, 98, 22] },    // → recolor
      { name: 'black',  rgb: [52, 54, 56] },
      { name: 'dark',   rgb: [36, 40, 44] },
      { name: 'silver', rgb: [170, 172, 174] },
      { name: 'silver2',rgb: [187, 189, 191] },
      { name: 'xlight', rgb: [219, 220, 222] },
      { name: 'white',  rgb: [242, 243, 243] },
      { name: 'tailred',rgb: [215, 50, 50] },
    ],
    fixed: [],
    whiteBoxes: [[1050, 270, 1260, 400]],
    shadow: { band: [890, 940], th: 205 },
    order: ['dark', 'black', 'silver', 'silver2', 'xlight', 'orange', 'white', 'tailred'],
    fills: { orange: '#EE6216', black: '#343638', dark: '#24282C', silver: '#A9AAAD', silver2: '#BBBCBF', xlight: '#DBDCDE', white: '#F2F3F3', tailred: '#D73232' },
  },
  ft: {
    file: 'ITALIKA, FT.png',
    classes: [
      { name: 'orange', rgb: [235, 68, 20] },    // → recolor
      { name: 'dark',   rgb: [38, 48, 54] },
      { name: 'char',   rgb: [52, 56, 66] },
      { name: 'char2',  rgb: [66, 70, 74] },
      { name: 'silver', rgb: [170, 172, 174] },
      { name: 'xlight', rgb: [219, 220, 222] },
      { name: 'tailred',rgb: [210, 45, 50] },
      { name: 'amber',  rgb: [240, 160, 40] },
    ],
    fixed: [],
    shadow: { band: [880, 935], th: 205 },
    order: ['dark', 'char', 'char2', 'silver', 'xlight', 'orange', 'tailred', 'amber'],
    fills: { orange: '#EB4414', dark: '#26303 6'.replace(' ', ''), char: '#343842', char2: '#42464A', silver: '#A9AAAD', xlight: '#DBDCDE', tailred: '#D22D32', amber: '#F0A028' },
  },
  dr: {
    file: 'SUZUKI, DR.png',
    classes: [
      { name: 'red',    rgb: [226, 50, 40] },    // → recolor
      { name: 'black',  rgb: [50, 54, 58] },
      { name: 'char',   rgb: [66, 70, 72] },
      { name: 'silver', rgb: [170, 172, 174] },
      { name: 'silver2',rgb: [186, 198, 200] },
      { name: 'lightgray', rgb: [204, 206, 208] },
      { name: 'white',  rgb: [242, 243, 243] },
    ],
    fixed: [],
    whiteBoxes: [[1030, 260, 1220, 400]],
    shadow: { band: [885, 940], th: 205 },
    order: ['black', 'char', 'silver', 'silver2', 'lightgray', 'red', 'white'],
    fills: { red: '#E23228', black: '#32363A', char: '#424648', silver: '#A9AAAD', silver2: '#BAC6C8', lightgray: '#CCCED0', white: '#F2F3F3' },
  },
  en: {
    file: 'SUZUKI, EN.png',
    classes: [
      { name: 'blue',   rgb: [15, 88, 214] },    // → recolor
      { name: 'black',  rgb: [50, 53, 56] },
      { name: 'dark',   rgb: [36, 44, 48] },
      { name: 'silver', rgb: [170, 172, 174] },
      { name: 'lightgray', rgb: [204, 206, 208] },
      { name: 'xlight', rgb: [219, 220, 222] },
      { name: 'tailred',rgb: [210, 40, 45] },
      { name: 'amber',  rgb: [240, 160, 40] },
    ],
    fixed: [],
    shadow: { band: [880, 935], th: 205 },
    order: ['dark', 'black', 'silver', 'lightgray', 'xlight', 'blue', 'tailred', 'amber'],
    fills: { blue: '#0F58D6', black: '#323538', dark: '#242C30', silver: '#A9AAAD', lightgray: '#CCCED0', xlight: '#DBDCDE', tailred: '#D22830', amber: '#F0A028' },
  },
  xtz: {
    file: 'YAMAHA, XTZ.png',
    classes: [
      { name: 'blue',   rgb: [10, 82, 210] },    // → recolor
      { name: 'black',  rgb: [48, 52, 58] },
      { name: 'slate',  rgb: [54, 58, 72] },
      { name: 'silver', rgb: [170, 172, 174] },
      { name: 'silver2',rgb: [187, 189, 191] },
      { name: 'lightgray', rgb: [204, 206, 208] },
      { name: 'xlight', rgb: [219, 220, 222] },
      { name: 'tailred',rgb: [215, 45, 48] },
      { name: 'amber',  rgb: [240, 160, 40] },
    ],
    fixed: [],
    shadow: { band: [885, 940], th: 205 },
    order: ['black', 'slate', 'silver', 'silver2', 'lightgray', 'xlight', 'blue', 'tailred', 'amber'],
    fills: { blue: '#0A52D2', black: '#30343A', slate: '#363A48', silver: '#A9AAAD', silver2: '#BBBCBF', lightgray: '#CCCED0', xlight: '#DBDCDE', tailred: '#D72D30', amber: '#F0A028' },
  },
});

const key = process.argv[2];
const M = MODELS[key];
if (!M) { console.error('modelo desconocido:', key, '— usa:', Object.keys(MODELS).join(' ')); process.exit(1); }

(async () => {
  const { data, info } = await sharp(DIR + M.file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  console.log(key, W + 'x' + H);

  // flood fill del fondo
  const isWhite = (i) => data[i * 4] > 235 && data[i * 4 + 1] > 235 && data[i * 4 + 2] > 235;
  const bg = new Uint8Array(W * H);
  const stack = [];
  for (let x = 0; x < W; x++) { stack.push(x, (H - 1) * W + x); }
  for (let y = 0; y < H; y++) { stack.push(y * W, y * W + W - 1); }
  while (stack.length) {
    const p = stack.pop();
    if (bg[p] || !isWhite(p)) continue;
    bg[p] = 1;
    const x = p % W, y = (p / W) | 0;
    if (x > 0) stack.push(p - 1);
    if (x < W - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - W);
    if (y < H - 1) stack.push(p + W);
  }

  const CLASSES = M.classes;
  const idxOf = (n) => CLASSES.findIndex(c => c.name === n);
  const WHITE_I = idxOf('white');
  const SHADOW_I = CLASSES.length; // ancla virtual
  const inBox = (x, y, B) => x >= B[0] && x <= B[2] && y >= B[1] && y <= B[3];
  // caja de blanco: [x1,y1,x2,y2, umbralOpcional] — el umbral local baja
  // el corte de blanco dentro de la caja (piezas blancas con sombreado)
  const whiteBoxOf = (x, y) => (M.whiteBoxes || []).find(B => inBox(x, y, B));
  const inWhiteBox = (x, y) => !!whiteBoxOf(x, y);
  const inShadowBand = (y) => M.shadow && y >= M.shadow.band[0] && y <= M.shadow.band[1];

  const classOf = (i) => {
    if (bg[i]) return -1;
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const x = i % W, y = (i / W) | 0;
    // SOMBRA de piso: banda bajo el rin + umbral de luz → transparente
    // (la banda arranca DEBAJO del rin: ahí solo viven llanta -oscura,
    // sobrevive- y sombra -clara, se descarta-; separar por ancla fallaba
    // porque la sombra empata con los grises claros del rin)
    if (M.shadow && y >= M.shadow.band[0] && y <= M.shadow.band[1]
        && r >= M.shadow.th && g >= M.shadow.th && b >= M.shadow.th) return -1;
    // near-white: pieza real solo dentro de whiteBoxes; fuera = hueco
    const wb = WHITE_I >= 0 ? whiteBoxOf(x, y) : null;
    if (wb && r >= (wb[4] || 235) && g >= (wb[4] || 235) && b >= (wb[4] || 235)) return WHITE_I;
    if (r >= 235 && g >= 235 && b >= 235) return -1;
    let best = 0, bd = 1e9;
    for (let c = 0; c < CLASSES.length; c++) {
      if (!CLASSES[c].rgb) continue;
      if (c === WHITE_I && !inWhiteBox(x, y)) continue; // blanco solo en cajas
      const [cr, cg, cb] = CLASSES[c].rgb;
      const d = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
      if (d < bd) { bd = d; best = c; }
    }
    for (const f of (M.fixed || [])) {
      if (CLASSES[best].name === f.from && inBox(x, y, f.box)) return idxOf(f.to);
    }
    return best;
  };
  let cls = new Int8Array(W * H);
  for (let i = 0; i < W * H; i++) cls[i] = classOf(i);

  // mayoría 5×5 (2 pasadas por defecto), fondo con voto calificado (≥60%)
  const BGV = CLASSES.length + 1;
  for (let pass = 0; pass < (M.passes || 2); pass++) {
    const src = Int8Array.from(cls);
    const votes = new Int16Array(BGV + 1);
    for (let y = 2; y < H - 2; y++) {
      for (let x = 2; x < W - 2; x++) {
        const p = y * W + x;
        if (src[p] < 0) continue;
        votes.fill(0);
        for (let dy = -2; dy <= 2; dy++)
          for (let dx = -2; dx <= 2; dx++) {
            const c = src[p + dy * W + dx];
            votes[c >= 0 ? c : BGV]++;
          }
        let best = src[p], bv = votes[src[p]];
        for (let c = 0; c < CLASSES.length; c++) if (votes[c] > bv) { bv = votes[c]; best = c; }
        if (votes[BGV] >= 15 && votes[BGV] > bv) best = BGV;
        cls[p] = best === BGV ? -1 : best;
      }
    }
  }

  // despeckle por componentes entre clases NEUTRAS (no recolor/fijas/blanco)
  {
    const SPECIAL = new Set(['red', 'darkred', 'green', 'amber', 'white', 'taillight', 'spring', 'navy']);
    const GRAY = CLASSES.map((c, i) => (!SPECIAL.has(c.name) && c.rgb ? i : -1)).filter(i => i >= 0);
    const MIN_PX = M.minPx || 150;
    const seen = new Uint8Array(W * H);
    for (let start = 0; start < W * H; start++) {
      if (seen[start] || !GRAY.includes(cls[start])) continue;
      const ci = cls[start];
      const comp = [];
      const st = [start]; seen[start] = 1;
      while (st.length) {
        const p = st.pop();
        comp.push(p);
        const x = p % W, y = (p / W) | 0;
        for (const [q, ok] of [[p - 1, x > 0], [p + 1, x < W - 1], [p - W, y > 0], [p + W, y < H - 1]]) {
          if (ok && !seen[q] && cls[q] === ci) { seen[q] = 1; st.push(q); }
        }
      }
      if (comp.length >= MIN_PX) continue;
      const votes = new Map();
      let bgTouch = 0, borderN = 0;
      for (const p of comp) {
        const x = p % W, y = (p / W) | 0;
        for (const [q, ok] of [[p - 1, x > 0], [p + 1, x < W - 1], [p - W, y > 0], [p + W, y < H - 1]]) {
          if (!ok) continue;
          const c = cls[q];
          if (c === ci) continue;
          borderN++;
          if (c < 0) { bgTouch++; continue; }
          if (GRAY.includes(c)) votes.set(c, (votes.get(c) || 0) + 1);
        }
      }
      // junto a fondo/hueco: los BLOBS con cuerpo (área >> perímetro) son
      // piezas legítimas que sobresalen (punta del escape) — se conservan;
      // las CADENAS finas (área≈perímetro) son halo anti-alias — se absorben
      if (borderN && bgTouch / borderN > 0.2 && comp.length / borderN >= 1.2) continue;
      let best = null, bv = -1;
      for (const [c, v] of votes) if (v > bv) { bv = v; best = c; }
      if (best === null) {
        // cadena sin vecino gris pegada al fondo = halo → transparente
        if (borderN && bgTouch / borderN > 0.5 && comp.length / borderN < 1.2) {
          for (const p of comp) cls[p] = -1;
        }
        continue;
      }
      for (const p of comp) cls[p] = best;
    }
  }

  const counts = new Array(CLASSES.length).fill(0);
  for (let i = 0; i < W * H; i++) if (cls[i] >= 0) counts[cls[i]]++;
  console.log('pixeles:', CLASSES.map((c, i) => `${c.name}:${counts[i]}`).join(' '));

  // bbox + números del transform del componente (lienzo 240×150,
  // misma escala visual que Navi/GN: ancho útil ≈ 172.4 unidades)
  let bottom = 0, left = W, right = 0, top = H;
  for (let i = 0; i < W * H; i++) {
    if (cls[i] < 0) continue;
    const x = i % W, y = (i / W) | 0;
    if (y > bottom) bottom = y;
    if (y < top) top = y;
    if (x < left) left = x;
    if (x > right) right = x;
  }
  const scale = +(172.4 / (right - left)).toFixed(4);
  const tx = +(120 - scale * (left + right) / 2).toFixed(1);
  const ty = +(123 - scale * bottom).toFixed(1);
  console.log(`bbox x ${left}-${right} y ${top}-${bottom} → transform: translate(${tx} ${ty}) scale(${scale})`);

  // mapa de clases (debug)
  {
    const DBG = [[230,34,41],[190,22,28],[40,40,46],[10,10,14],[0,160,160],[160,120,255],[80,80,90],[120,121,130],[180,181,190],[210,211,220],[255,255,0],[255,0,255],[0,255,0],[0,0,255]];
    const img = Buffer.alloc(W * H * 3, 255);
    for (let i = 0; i < W * H; i++) {
      if (cls[i] < 0) continue;
      const c = DBG[cls[i] % DBG.length];
      img[i*3] = c[0]; img[i*3+1] = c[1]; img[i*3+2] = c[2];
    }
    await sharp(img, { raw: { width: W, height: H, channels: 3 } }).png().toFile(`${O}/${key}-cls.png`);
  }

  // máscaras → potrace (dilatación 2px, sin redondear)
  const dilate = (mask) => {
    const out = new Uint8Array(mask);
    for (let pass = 0; pass < 2; pass++) {
      const src = new Uint8Array(out);
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          const p = y * W + x;
          if (src[p]) continue;
          if (src[p - 1] || src[p + 1] || src[p - W] || src[p + W]) out[p] = 1;
        }
      }
    }
    return out;
  };
  const traceOne = (name) => new Promise((res, rej) => {
    const ci = idxOf(name);
    let m = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) if (cls[i] === ci) m[i] = 1;
    m = dilate(m);
    const mask = Buffer.alloc(W * H * 3, 255);
    for (let i = 0; i < W * H; i++) if (m[i]) { mask[i * 3] = 0; mask[i * 3 + 1] = 0; mask[i * 3 + 2] = 0; }
    sharp(mask, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer().then(png => {
      potrace.trace(png, { turdSize: 40, alphaMax: 1.1, optTolerance: 0.35, threshold: 128 }, (err, svg) => {
        if (err) return rej(err);
        res({ name, d: [...svg.matchAll(/d="([^"]+)"/g)].map(m2 => m2[1]).join(' ') });
      });
    }).catch(rej);
  });

  const results = [];
  for (const name of M.order) results.push(await traceOne(name));

  // SVG de verificación
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="#fff"/>`;
  for (const r of results) svg += `<path d="${r.d}" fill="${M.fills[r.name]}" fill-rule="evenodd"/>`;
  svg += '</svg>';
  fs.writeFileSync(`${O}/${key}-trace.svg`, svg);
  console.log('trazado:', results.map(r => `${r.name}:${r.d.length}ch`).join(' '));
  await sharp(Buffer.from(svg)).resize({ width: 900 }).png().toFile(`${O}/${key}-preview.png`);

  // módulo de paths
  const EXPORT = key.toUpperCase() + '_TRACE';
  let mod = `// src/components/ui/${key}Trace.js\n`;
  mod += `// GENERADO desde REFERENCIAS INTERFAZ/VEHÍCULOS/${M.file} (${W}×${H},\n`;
  mod += '// capas dilatadas 2px) por vectorización de capas de color (potrace,\n';
  mod += '// arnés paramétrico E1.11) — NO editar a mano; regenerar con el arnés.\n';
  mod += `export const ${EXPORT} = {\n`;
  for (const r of results) mod += `  ${r.name}: ${JSON.stringify(r.d)},\n`;
  mod += '};\n';
  fs.writeFileSync(`C:/proyectos/club-turkaj/src/components/ui/${key}Trace.js`, mod);
  console.log(`${key}Trace.js escrito,`, mod.length, 'chars');
})();
