// Arnés de calco — TANDA 9 (2-sep-2026): MICRO BUS (Grace, H1, Pregio,
// Urvan, Hiace), MOTO TAXIS (Torito, Ape) y CAMIÓN LIGERO (H100, K2700).
// Motor de trace-autos.js (E1.20b) GENERALIZADO:
//  (a) bodyNames: la familia recoloreable ya no es "roja" — los micro
//      buses y moto taxis son VERDES y los camiones ligeros BLANCOS;
//      la lista explícita (principal primero) sustituye a isRedFamily.
//  (b) bg: fondo de COLOR (camiones: teal/amarillo) — flood por FAMILIA
//      DE TONO desde los bordes (el sombreado del piso es el mismo tono
//      oscurecido y el flood lo consume); keepBoxes protege las piezas
//      ámbar cuyo tono EMPATA con el fondo (islas que el flood no toca,
//      pero la regla de "bg-family suelto → hueco" sí tocaría).
//  (c) sin regla "casi blanco → hueco" en modelos de fondo de color
//      (el blanco ES carrocería).
// Uso: node trace-mix.cjs <grace|h1|pregio|urvan|hiace|torito|ape|h100|k2700>
const sharp = require('C:/proyectos/club-turkaj/node_modules/sharp');
const potrace = require('potrace') // instalado en tools/artes (npm install en esa carpeta);
const fs = require('fs');
const DIR = 'C:/proyectos/club-turkaj/REFERENCIAS INTERFAZ/VEHÍCULOS/';
const O = __dirname;

// ── MICRO BUS: verde continuo (bandas finas SIN fusionar, todas PLANAS
// en el Art por la regla E1.19 de ≥3 bandas), ventanas oscuras con
// degradado sutil (anclas finas → 2 tonos), faros por caja LAMP,
// calavera roja fija en el borde trasero, sombra de piso por banda con
// elipses de rin exentas.
const MODELS = {
  grace: {
    file: 'MICRO BUS/HYUNDAI, GRACE.png', minPx: 500,
    bodyNames: ['green', 'gA', 'gB', 'gC', 'gD', 'gE', 'gF', 'gG'],
    classes: [
      { name: 'gA', rgb: [68, 129, 73] },
      { name: 'gB', rgb: [62, 122, 66] },
      { name: 'gC', rgb: [58, 116, 62] },
      { name: 'gD', rgb: [52, 109, 57] },
      { name: 'green', rgb: [46, 101, 50] },
      { name: 'gE', rgb: [41, 93, 45] },
      { name: 'gF', rgb: [34, 84, 39] },
      { name: 'gG', rgb: [28, 75, 33] },
      { name: 'deep', rgb: [4, 4, 3] },
      { name: 'dark', rgb: [12, 12, 12] },
      { name: 'dark2', rgb: [20, 20, 20] },
      { name: 'dark3', rgb: [28, 28, 28] },
      { name: 'win', rgb: [36, 35, 35] },
      { name: 'win2', rgb: [44, 44, 43] },
      { name: 'win3', rgb: [52, 52, 52] },
      { name: 'win4', rgb: [60, 60, 59] },
      { name: 'bump', rgb: [70, 69, 69] },
      { name: 'bump2', rgb: [84, 83, 83] },
      { name: 'bump3', rgb: [98, 97, 97] },
      { name: 'silver', rgb: [179, 178, 178] },
      { name: 'lamp', rgb: null },
      { name: 'white', rgb: [240, 240, 240] },
      { name: 'tailred', rgb: [145, 15, 15] },
    ],
    mergeInto: { dark: 'deep', dark3: 'dark2', win2: 'win', win4: 'win3', bump2: 'bump', bump3: 'bump' },
    lampBoxes: [[390, 525, 601, 616], [63, 510, 122, 598]],
    lampFill: '#DAD9D9',
    fixed: [],
    whiteBoxes: [],
    shadow: { band: [742, 920], th: 118, exceptMax: 228, exceptEllipses: [[775, 765, 50, 79], [1329, 712, 36, 66]] },
    shadow2: { band: [778, 930], th: 62, exceptMax: 228, exceptEllipses: [[775, 765, 50, 79], [1329, 712, 36, 66]] },
    order: ['deep', 'dark2', 'win', 'win3', 'bump', 'silver', 'gG', 'gF', 'gE', 'green', 'gD', 'gC', 'gB', 'gA', 'tailred', 'lamp', 'white'],
    fills: { deep: '#040403', dark2: '#141414', win: '#242423', win3: '#383837', bump: '#4A4949', silver: '#B3B2B2', green: '#2E6532', gA: '#448149', gB: '#3E7A42', gC: '#3A743E', gD: '#346D39', gE: '#295D2D', gF: '#225427', gG: '#1C4B21', tailred: '#910F0F', white: '#F0F0F0' },
  },
  h1: {
    file: 'MICRO BUS/HYUNDAI, H1.png', minPx: 500,
    bodyNames: ['green', 'gA', 'gB', 'gD', 'gE', 'gF', 'gG'],
    classes: [
      { name: 'gA', rgb: [73, 123, 74] },
      { name: 'gB', rgb: [66, 115, 67] },
      { name: 'green', rgb: [59, 107, 61] },
      { name: 'gD', rgb: [52, 98, 54] },
      { name: 'gE', rgb: [46, 90, 48] },
      { name: 'gF', rgb: [39, 79, 41] },
      { name: 'gG', rgb: [30, 66, 32] },
      { name: 'deep', rgb: [4, 4, 3] },
      { name: 'dark', rgb: [12, 12, 12] },
      { name: 'dark2', rgb: [20, 20, 20] },
      { name: 'dark3', rgb: [28, 28, 28] },
      { name: 'win', rgb: [36, 36, 36] },
      { name: 'black', rgb: [43, 43, 43] },
      { name: 'bump', rgb: [70, 69, 69] },
      { name: 'bump2', rgb: [84, 83, 83] },
      { name: 'silver', rgb: [180, 179, 179] },
      { name: 'lamp', rgb: null },
      { name: 'white', rgb: [240, 240, 240] },
      { name: 'tailred', rgb: [144, 17, 18] },
    ],
    mergeInto: { dark: 'deep', dark3: 'dark2', win: 'black', bump2: 'bump' },
    lampBoxes: [[420, 440, 635, 590], [45, 450, 95, 565]],
    lampFill: '#D8D7D7',
    fixed: [],
    whiteBoxes: [],
    shadow: { band: [742, 930], th: 118, exceptMax: 228, exceptEllipses: [[688, 738, 52, 83], [1352, 698, 40, 71]] },
    shadow2: { band: [778, 935], th: 62, exceptMax: 228, exceptEllipses: [[688, 738, 52, 83], [1352, 698, 40, 71]] },
    order: ['deep', 'dark2', 'black', 'bump', 'silver', 'gG', 'gF', 'gE', 'gD', 'green', 'gB', 'gA', 'tailred', 'lamp', 'white'],
    fills: { deep: '#040403', dark2: '#141414', win: '#242424', black: '#2B2B2B', bump: '#4A4949', silver: '#B4B3B3', green: '#3B6B3D', gA: '#497B4A', gB: '#427343', gD: '#346236', gE: '#2E5A30', gF: '#274F29', gG: '#1E4220', tailred: '#901112', white: '#F0F0F0' },
  },
  pregio: {
    file: 'MICRO BUS/KIA, PREGIO.png', minPx: 500,
    bodyNames: ['green', 'gA', 'gB', 'gC', 'gE', 'gF', 'gG'],
    classes: [
      { name: 'gA', rgb: [71, 124, 76] },
      { name: 'gB', rgb: [65, 118, 70] },
      { name: 'gC', rgb: [60, 112, 65] },
      { name: 'green', rgb: [55, 106, 61] },
      { name: 'gE', rgb: [50, 99, 56] },
      { name: 'gF', rgb: [43, 91, 50] },
      { name: 'gG', rgb: [32, 77, 40] },
      { name: 'deep', rgb: [4, 4, 4] },
      { name: 'dark', rgb: [12, 12, 12] },
      { name: 'dark2', rgb: [20, 20, 19] },
      { name: 'dark3', rgb: [28, 27, 27] },
      { name: 'win', rgb: [36, 36, 35] },
      { name: 'win2', rgb: [44, 44, 44] },
      { name: 'win3', rgb: [52, 52, 52] },
      { name: 'win4', rgb: [59, 59, 59] },
      { name: 'bump', rgb: [70, 69, 69] },
      { name: 'bump2', rgb: [84, 83, 83] },
      { name: 'silver', rgb: [148, 147, 147] },
      { name: 'lamp', rgb: null },
      { name: 'white', rgb: [240, 240, 240] },
      { name: 'tailred', rgb: [155, 15, 14] },
    ],
    mergeInto: { dark: 'deep', dark3: 'dark2', win2: 'win', win4: 'win3', bump2: 'bump' },
    lampBoxes: [[410, 518, 610, 615], [70, 510, 130, 600]],
    lampFill: '#DAD9D9',
    fixed: [],
    whiteBoxes: [],
    shadow: { band: [748, 930], th: 118, exceptMax: 228, exceptEllipses: [[800, 769, 49, 79], [1330, 717, 36, 66]] },
    shadow2: { band: [785, 935], th: 62, exceptMax: 228, exceptEllipses: [[800, 769, 49, 79], [1330, 717, 36, 66]] },
    order: ['deep', 'dark2', 'win', 'win3', 'bump', 'silver', 'gG', 'gF', 'gE', 'green', 'gC', 'gB', 'gA', 'tailred', 'lamp', 'white'],
    fills: { deep: '#040404', dark2: '#141413', win: '#242423', win3: '#343434', bump: '#4A4949', silver: '#949393', green: '#376A3D', gA: '#477C4C', gB: '#417646', gC: '#3C7041', gE: '#326338', gF: '#2B5B32', gG: '#204D28', tailred: '#9B0F0E', white: '#F0F0F0' },
  },
  urvan: {
    file: 'MICRO BUS/NISSAN, URVAN.png', minPx: 500,
    bodyNames: ['green', 'gA', 'gB', 'gC', 'gE', 'gF', 'gG'],
    classes: [
      { name: 'gA', rgb: [69, 124, 72] },
      { name: 'gB', rgb: [63, 118, 66] },
      { name: 'gC', rgb: [59, 112, 62] },
      { name: 'green', rgb: [54, 106, 57] },
      { name: 'gE', rgb: [49, 99, 52] },
      { name: 'gF', rgb: [43, 88, 45] },
      { name: 'gG', rgb: [33, 72, 34] },
      { name: 'deep', rgb: [5, 5, 5] },
      { name: 'dark', rgb: [12, 12, 12] },
      { name: 'dark2', rgb: [20, 20, 19] },
      { name: 'dark3', rgb: [28, 28, 28] },
      { name: 'win', rgb: [36, 36, 36] },
      { name: 'win2', rgb: [45, 45, 44] },
      { name: 'win3', rgb: [51, 51, 50] },
      { name: 'win4', rgb: [59, 59, 58] },
      { name: 'bump', rgb: [68, 67, 67] },
      { name: 'silver', rgb: [156, 155, 155] },
      { name: 'lamp', rgb: null },
      { name: 'white', rgb: [240, 240, 240] },
      { name: 'tailred', rgb: [146, 8, 9] },
    ],
    mergeInto: { dark: 'deep', dark3: 'dark2', win2: 'win', win4: 'win3' },
    lampBoxes: [[425, 535, 610, 640], [60, 530, 116, 630]],
    lampFill: '#D5D4D4',
    fixed: [],
    whiteBoxes: [],
    shadow: { band: [760, 930], th: 118, exceptMax: 228, exceptEllipses: [[744, 784, 48, 79], [1294, 737, 37, 68]] },
    shadow2: { band: [795, 935], th: 62, exceptMax: 228, exceptEllipses: [[744, 784, 48, 79], [1294, 737, 37, 68]] },
    order: ['deep', 'dark2', 'win', 'win3', 'bump', 'silver', 'gG', 'gF', 'gE', 'green', 'gC', 'gB', 'gA', 'tailred', 'lamp', 'white'],
    fills: { deep: '#050505', dark2: '#141413', win: '#242424', win3: '#333332', bump: '#444343', silver: '#9C9B9B', green: '#366A39', gA: '#457C48', gB: '#3F7642', gC: '#3B703E', gE: '#316334', gF: '#2B582D', gG: '#214822', tailred: '#920809', white: '#F0F0F0' },
  },
  hiace: {
    file: 'MICRO BUS/TOYOTA, HIACE.png', minPx: 500,
    bodyNames: ['green', 'gA', 'gB', 'gD', 'gE', 'gF', 'gG'],
    classes: [
      { name: 'gA', rgb: [76, 139, 81] },
      { name: 'gB', rgb: [72, 132, 76] },
      { name: 'green', rgb: [67, 127, 71] },
      { name: 'gD', rgb: [63, 120, 66] },
      { name: 'gE', rgb: [58, 114, 62] },
      { name: 'gF', rgb: [52, 106, 56] },
      { name: 'gG', rgb: [45, 97, 49] },
      { name: 'deep', rgb: [4, 4, 3] },
      { name: 'dark', rgb: [12, 12, 12] },
      { name: 'dark2', rgb: [20, 20, 20] },
      { name: 'dark3', rgb: [28, 28, 28] },
      { name: 'win', rgb: [37, 37, 37] },
      { name: 'win2', rgb: [45, 45, 45] },
      { name: 'win3', rgb: [51, 51, 50] },
      { name: 'bump', rgb: [64, 64, 64] },
      { name: 'gray', rgb: [132, 131, 131] },
      { name: 'silver', rgb: [148, 147, 147] },
      { name: 'lamp', rgb: null },
      { name: 'white', rgb: [240, 240, 240] },
      { name: 'tailred', rgb: [147, 14, 14] },
    ],
    mergeInto: { dark: 'deep', dark3: 'dark2', win2: 'win', win3: 'win', silver: 'gray' },
    lampBoxes: [[430, 545, 625, 645], [90, 540, 145, 628]],
    lampFill: '#CFCECE',
    fixed: [],
    whiteBoxes: [],
    shadow: { band: [756, 930], th: 118, exceptMax: 228, exceptEllipses: [[747, 782, 45, 72], [1318, 726, 34, 61]] },
    shadow2: { band: [790, 935], th: 62, exceptMax: 228, exceptEllipses: [[747, 782, 45, 72], [1318, 726, 34, 61]] },
    order: ['deep', 'dark2', 'win', 'bump', 'gray', 'gG', 'gF', 'gE', 'gD', 'green', 'gB', 'gA', 'tailred', 'lamp', 'white'],
    fills: { deep: '#040403', dark2: '#141414', win: '#252525', bump: '#404040', gray: '#848383', green: '#437F47', gA: '#4C8B51', gB: '#48844C', gD: '#3F7842', gE: '#3A723E', gF: '#346A38', gG: '#2D6131', tailred: '#930E0E', white: '#F0F0F0' },
  },
  // ── MOTO TAXIS: estilo PLANO de la referencia (zonas de sombreado
  // duras, contornos gruesos) — bandas de verde planas, parabrisas azul
  // pálido FIJO, ámbares fijos, faros = círculos blancos por whiteBox.
  torito: {
    file: 'MOTO TAXIS/BAJAJ, TORITO.png', minPx: 400,
    bodyNames: ['green', 'gA', 'gB', 'gD', 'gE', 'gF', 'gG'],
    classes: [
      { name: 'gA', rgb: [66, 178, 76] },
      { name: 'gB', rgb: [39, 161, 55] },
      { name: 'green', rgb: [30, 152, 53] },
      { name: 'gD', rgb: [21, 142, 48] },
      { name: 'gE', rgb: [11, 123, 37] },
      { name: 'gF', rgb: [5, 106, 30] },
      { name: 'gG', rgb: [3, 88, 25] },
      { name: 'out', rgb: [29, 30, 29] },
      { name: 'dk', rgb: [37, 37, 37] },
      { name: 'dk2', rgb: [44, 44, 44] },
      { name: 'roof', rgb: [53, 53, 52] },
      { name: 'roof2', rgb: [59, 59, 59] },
      { name: 'roof3', rgb: [65, 65, 65] },
      { name: 'glass', rgb: [218, 235, 244] },
      { name: 'amber', rgb: [249, 153, 4] },
      { name: 'hub', rgb: [92, 91, 91] },
      { name: 'hub2', rgb: [150, 149, 149] },
      { name: 'white', rgb: [250, 250, 250] },
    ],
    mergeInto: { dk2: 'dk', roof2: 'roof', roof3: 'roof' },
    fixed: [],
    whiteBoxes: [[533, 547, 590, 613, 235, 256], [276, 545, 319, 601, 235, 256]],
    shadow: { band: [826, 970], th: 140, exceptMax: 228, exceptEllipses: [[390, 845, 55, 60], [1218, 795, 50, 55]] },
    order: ['out', 'dk', 'roof', 'hub', 'hub2', 'gG', 'gF', 'gE', 'gD', 'green', 'gB', 'gA', 'glass', 'amber', 'white'],
    fills: { out: '#1D1E1D', dk: '#252525', roof: '#353534', hub: '#5C5B5B', hub2: '#969595', green: '#1E9835', gA: '#42B24C', gB: '#27A137', gD: '#158E30', gE: '#0B7B25', gF: '#056A1E', gG: '#035819', glass: '#DAEBF4', amber: '#F99904', white: '#FAFAFA' },
  },
  ape: {
    file: 'MOTO TAXIS/PIAGGIO, APE.png', minPx: 400,
    bodyNames: ['green', 'gA', 'gB', 'gD', 'gE', 'gF', 'gG'],
    classes: [
      { name: 'gA', rgb: [33, 167, 50] },
      { name: 'gB', rgb: [26, 158, 45] },
      { name: 'green', rgb: [16, 144, 39] },
      { name: 'gD', rgb: [9, 127, 34] },
      { name: 'gE', rgb: [5, 113, 29] },
      { name: 'gF', rgb: [3, 97, 25] },
      { name: 'gG', rgb: [2, 85, 22] },
      { name: 'out', rgb: [29, 29, 29] },
      { name: 'dk', rgb: [36, 36, 36] },
      { name: 'dk2', rgb: [43, 43, 43] },
      { name: 'dk3', rgb: [52, 52, 52] },
      { name: 'dk4', rgb: [59, 58, 58] },
      { name: 'glass', rgb: [224, 241, 248] },
      { name: 'amber', rgb: [246, 129, 3] },
      { name: 'redlamp', rgb: [222, 66, 4] },
      { name: 'hub', rgb: [92, 91, 91] },
      { name: 'hub2', rgb: [150, 149, 149] },
      { name: 'white', rgb: [250, 250, 250] },
    ],
    mergeInto: { dk2: 'dk', dk3: 'dk', dk4: 'dk' },
    fixed: [],
    whiteBoxes: [[478, 540, 531, 610, 235, 256], [247, 521, 294, 588, 235, 256]],
    shadow: { band: [750, 960], th: 140, exceptMax: 228, exceptEllipses: [[352, 848, 55, 60], [1221, 739, 45, 55]] },
    order: ['out', 'dk', 'hub', 'hub2', 'gG', 'gF', 'gE', 'gD', 'green', 'gB', 'gA', 'glass', 'amber', 'redlamp', 'white'],
    fills: { out: '#1D1D1D', dk: '#242424', hub: '#5C5B5B', hub2: '#969595', green: '#109027', gA: '#21A732', gB: '#1A9E2D', gD: '#097F22', gE: '#05711D', gF: '#036119', gG: '#025516', glass: '#E0F1F8', amber: '#F68103', redlamp: '#DE4204', white: '#FAFAFA' },
  },
  // ── CAMIÓN LIGERO: fondo de COLOR (flood por familia de tono) y
  // carrocería BLANCA (bandas claras → recolor con shade). keepBoxes
  // protege los ámbares (tono ≈ fondo en el K2700).
  h100: {
    file: 'CAMIÓN LIGERO/HYUNDAI, H100.png', minPx: 500,
    bg: [82, 169, 149],
    bodyNames: ['body', 'wA', 'wB', 'wD', 'wE', 'wF', 'wG'],
    keepBoxes: [[540, 574, 638, 609], [170, 551, 230, 588], [1395, 600, 1420, 650]],
    classes: [
      { name: 'wA', rgb: [247, 245, 242] },
      { name: 'wB', rgb: [241, 238, 236] },
      { name: 'body', rgb: [234, 230, 227] },
      { name: 'wD', rgb: [222, 219, 216] },
      { name: 'wE', rgb: [210, 207, 203] },
      { name: 'wF', rgb: [193, 190, 186] },
      { name: 'wG', rgb: [178, 176, 174] },
      { name: 'deep', rgb: [22, 22, 22] },
      { name: 'black', rgb: [29, 29, 28] },
      { name: 'dark', rgb: [36, 35, 35] },
      { name: 'dark2', rgb: [46, 46, 45] },
      { name: 'char', rgb: [54, 53, 53] },
      { name: 'char2', rgb: [61, 61, 60] },
      { name: 'gray', rgb: [68, 67, 66] },
      { name: 'rim', rgb: [206, 205, 206], boxes: [[803, 710, 888, 848], [1236, 684, 1300, 795]] },
      { name: 'glass', rgb: [175, 209, 233] },
      { name: 'glass2', rgb: [143, 184, 212] },
      { name: 'amber', rgb: [225, 106, 29] },
      { name: 'redlamp', rgb: [206, 72, 12] },
      { name: 'lamp', rgb: null },
      { name: 'glint', rgb: null },
    ],
    mergeInto: { black: 'deep', dark2: 'dark', char2: 'char' },
    lampBoxes: [[527, 612, 611, 681], [174, 590, 239, 656]],
    lampFill: '#F4F3F1',
    // rines: las bandas claras del CUERPO capturan los grises del rin y
    // recolorearían — dentro de la caja de rueda se fijan a 'rim';
    // destellos BLANCOS sobre los cristales → 'glint' fijo (no recolorea)
    fixed: [
      ...['wA', 'wB', 'body', 'wD', 'wE', 'wF', 'wG'].flatMap(from => [
        { from, to: 'rim', box: [803, 710, 888, 848] },
        { from, to: 'rim', box: [1236, 684, 1300, 795] },
      ]),
    ],
    glintGlass: true, // destellos blancos SOBRE el vidrio (islas del cuerpo rodeadas de glass) → 'glint' fijo
    whiteBoxes: [],
    order: ['glass', 'glass2', 'glint', 'deep', 'dark', 'char', 'gray', 'wG', 'wF', 'wE', 'wD', 'body', 'wB', 'wA', 'rim', 'amber', 'redlamp', 'lamp'],
    fills: { deep: '#161616', black: '#1D1D1C', dark: '#242323', char: '#363535', gray: '#444342', rim: '#CECDCE', glass: '#AFD1E9', glass2: '#8FB8D4', amber: '#E16A1D', redlamp: '#CE480C', body: '#EAE6E3', wA: '#F7F5F2', wB: '#F1EEEC', wD: '#DEDBD8', wE: '#D2CFCB', wF: '#C1BEBA', wG: '#B2B0AE', glint: '#F7F7F7' },
  },
  k2700: {
    file: 'CAMIÓN LIGERO/KIA, 2700.png', minPx: 500,
    bg: [253, 179, 31],
    bodyNames: ['body', 'wA', 'wB', 'wD', 'wE', 'wF', 'wG', 'wH'],
    keepBoxes: [[561, 555, 632, 584], [179, 537, 221, 571], [1390, 560, 1415, 605]],
    classes: [
      { name: 'wA', rgb: [250, 250, 250] },
      { name: 'wB', rgb: [244, 244, 244] },
      { name: 'body', rgb: [237, 237, 237] },
      { name: 'wD', rgb: [227, 227, 227] },
      { name: 'wE', rgb: [216, 216, 216] },
      { name: 'wF', rgb: [201, 201, 201] },
      { name: 'wG', rgb: [188, 187, 187] },
      { name: 'wH', rgb: [174, 174, 174] },
      { name: 'deep', rgb: [20, 20, 20] },
      { name: 'black', rgb: [28, 27, 27] },
      { name: 'dark', rgb: [36, 36, 35] },
      { name: 'dark2', rgb: [44, 44, 44] },
      { name: 'char', rgb: [52, 52, 52] },
      { name: 'char2', rgb: [60, 60, 60] },
      { name: 'gray', rgb: [66, 66, 65] },
      { name: 'rim', rgb: [206, 205, 206], boxes: [[790, 674, 891, 831], [1212, 639, 1289, 765]] },
      { name: 'glass', rgb: [186, 217, 239] },
      { name: 'glass2', rgb: [154, 192, 222] },
      { name: 'amber', rgb: [247, 125, 6] },
      { name: 'redlamp', rgb: [220, 75, 6] },
      { name: 'lamp', rgb: null },
    ],
    mergeInto: { black: 'deep', dark2: 'dark', char2: 'char' },
    lampBoxes: [[545, 590, 627, 659], [182, 574, 234, 637]],
    lampFill: '#F5F5F5',
    // rines fijos por región de rueda (las bandas claras del cuerpo
    // capturaban los grises del rin y recoloreaban)
    fixed: ['wA', 'wB', 'body', 'wD', 'wE', 'wF', 'wG', 'wH'].flatMap(from => [
      { from, to: 'rim', box: [790, 674, 891, 831] },
      { from, to: 'rim', box: [1212, 639, 1289, 765] },
    ]),
    whiteBoxes: [],
    order: ['glass', 'glass2', 'deep', 'dark', 'char', 'gray', 'wH', 'wG', 'wF', 'wE', 'wD', 'body', 'wB', 'wA', 'rim', 'amber', 'redlamp', 'lamp'],
    fills: { deep: '#141414', black: '#1C1B1B', dark: '#242423', char: '#343434', gray: '#424241', rim: '#CECDCE', glass: '#BAD9EF', glass2: '#9AC0DE', amber: '#F77D06', redlamp: '#DC4B06', body: '#EDEDED', wA: '#FAFAFA', wB: '#F4F4F4', wD: '#E3E3E3', wE: '#D8D8D8', wF: '#C9C9C9', wG: '#BCBBBB', wH: '#AEAEAE' },
  },
};

// ── E1.23 (2-sep): el dueño RENOVÓ las referencias de Mazda 3 y Yaris a
// estilo PLANO con cuerpo VERDE (mismo estilo de los moto taxis de la
// tanda 9) para facilitar la identificación de lo recoloreable. Se
// recalcan aquí (ya NO en trace-autos): fondo gris muy claro (246-250,
// el flood >235 lo come), sombra de piso SUAVE (211-218) = clase 'floor'
// clasificada pero NO dibujada (fuera de order), vidrios gris claro
// planos, blancos de rines/faros por whiteBoxes con tope 244.
Object.assign(MODELS, {
  mazda3: {
    file: 'AUTOS LIVIANOS/MAZDA, MAZDA 3.png', minPx: 400, dilateBody: 1, dilateClasses: { white: 0 },
    bodyNames: ['green', 'gA', 'gE', 'gF'],
    classes: [
      { name: 'gA', rgb: [44, 170, 72] },
      { name: 'green', rgb: [42, 165, 69] },
      { name: 'gE', rgb: [39, 155, 66] },
      { name: 'gF', rgb: [37, 146, 62] },
      { name: 'deep', rgb: [33, 34, 35] },
      { name: 'dark', rgb: [45, 46, 47] },
      { name: 'char', rgb: [51, 52, 53] },
      { name: 'gray', rgb: [59, 59, 59] },
      { name: 'mid', rgb: [91, 91, 92] },
      { name: 'mid2', rgb: [122, 123, 124] },
      { name: 'glass', rgb: [207, 206, 206], boxes: [[130, 230, 1470, 475], [435, 480, 705, 575], [72, 480, 125, 560]] },
      { name: 'floor', rgb: [214, 213, 213], boxes: [[60, 688, 1490, 860]] },
      { name: 'white', rgb: [234, 234, 234] },
      { name: 'tailred', rgb: [129, 36, 34] },
    ],
    fixed: [],
    whiteBoxes: [
      [740, 575, 863, 775, 226, 244],  // rin delantero
      [1336, 538, 1425, 705, 226, 244],// rin trasero
      [505, 490, 665, 565, 226, 246],  // destellos del faro
      [80, 490, 118, 548, 226, 246],   // faro lejano
    ],
    order: ['glass', 'deep', 'dark', 'char', 'gray', 'mid', 'mid2', 'gF', 'gE', 'green', 'gA', 'white', 'tailred'],
    fills: { glass: '#CFCECE', deep: '#212223', dark: '#2D2E2F', char: '#333435', gray: '#3B3B3B', mid: '#5B5B5C', mid2: '#7A7B7C', green: '#2AA545', gA: '#2CAA48', gE: '#279B42', gF: '#25923E', floor: '#D6D5D5', white: '#EAEAEA', tailred: '#812422' },
  },
  yaris: {
    file: 'AUTOS LIVIANOS/TOYOTA, YARIS.png', minPx: 400, dilateBody: 1, passes: 1, dilateClasses: { white: 0 },
    bodyNames: ['green', 'gA', 'gE', 'gF'],
    classes: [
      { name: 'gA', rgb: [41, 171, 67] },
      { name: 'green', rgb: [36, 168, 64] },
      { name: 'gE', rgb: [35, 156, 60] },
      { name: 'gF', rgb: [30, 139, 52] },
      { name: 'deep', rgb: [32, 33, 34] },
      { name: 'dark', rgb: [42, 44, 45] },
      { name: 'char', rgb: [50, 52, 53] },
      { name: 'gray', rgb: [56, 58, 59] },
      { name: 'mid', rgb: [67, 69, 70] },
      { name: 'glass', rgb: [205, 204, 204], boxes: [[215, 230, 1450, 475]] },
      { name: 'floor', rgb: [212, 211, 211], boxes: [[60, 688, 1490, 860]] },
      { name: 'white', rgb: [230, 229, 229] },
      { name: 'tailred', rgb: [154, 27, 27] },
    ],
    fixed: [],
    whiteBoxes: [
      [793, 586, 911, 779, 222, 244],  // rin delantero
      [1316, 543, 1390, 697, 222, 244],// rin trasero
      [430, 470, 730, 595, 200, 246],  // lente del faro APLANADO a blanco (th 200 — la punta fina se rasgaba entre glass/white)
      [125, 488, 200, 552, 200, 246],  // faro lejano
    ],
    order: ['glass', 'deep', 'dark', 'char', 'gray', 'mid', 'gF', 'gE', 'green', 'gA', 'white', 'tailred'],
    fills: { glass: '#CDCCCC', deep: '#202122', dark: '#2A2C2D', char: '#323435', gray: '#383A3B', mid: '#434546', green: '#24A840', gA: '#29AB43', gE: '#239C3C', gF: '#1E8B34', floor: '#D4D3D3', white: '#E6E5E5', tailred: '#9A1B1B' },
  },
});

// LAMP: cajas de faro → clases claras neutras se aplanan a 'lamp'
// (mecánica E1.18: fixed por región; el blanco real ≥235 queda white
// en modelos de fondo blanco vía whiteBoxes th 235)
for (const M of Object.values(MODELS)) {
  if (!M.lampBoxes) continue;
  const isBody = (c) => M.bodyNames.includes(c.name);
  const lights = M.classes.filter(c => c.rgb && !isBody(c)
    && Math.min(...c.rgb) >= 110
    && !['white', 'amber', 'lamp', 'glass', 'glass2', 'redlamp'].includes(c.name)).map(c => c.name);
  // en los camiones el CUERPO claro dentro de la caja de faro también es lente
  const lightBody = M.bg ? M.classes.filter(c => c.rgb && isBody(c)).map(c => c.name) : [];
  for (const B of M.lampBoxes) {
    for (const from of [...lights, ...lightBody]) M.fixed.push({ from, to: 'lamp', box: B });
  }
  M.fills.lamp = M.lampFill;
  if (!M.bg) {
    // fondo blanco: el destello ≥235 dentro de la caja = white
    if (!M.classes.some(c => c.name === 'white')) M.classes.push({ name: 'white', rgb: [240, 240, 240] });
    for (const B of M.lampBoxes) M.whiteBoxes.push([B[0], B[1], B[2], B[3], 235, 256]);
  }
}

module.exports = { MODELS };
if (require.main === module) {
const key = process.argv[2];
const M = MODELS[key];
if (!M) { console.error('modelo desconocido:', key, '— usa:', Object.keys(MODELS).join(' ')); process.exit(1); }

(async () => {
  const { data, info } = await sharp(DIR + M.file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  console.log(key, W + 'x' + H);

  const inBoxEarly = (x, y, B) => x >= B[0] && x <= B[2] && y >= B[1] && y <= B[3];

  // ── fondo: blanco (legacy, whiteBoxes = barrera) o de COLOR (familia de tono)
  let isBgPix;
  if (M.bg) {
    const [br, bgc, bb] = M.bg;
    const mx0 = Math.max(br, bgc, bb), mn0 = Math.min(br, bgc, bb);
    const hue = (r, g, b) => {
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if (mx - mn < 1) return -1;
      if (mx === r) return ((g - b) / (mx - mn) + 6) % 6;
      if (mx === g) return (b - r) / (mx - mn) + 2;
      return (r - g) / (mx - mn) + 4;
    };
    const h0 = hue(br, bgc, bb);
    isBgPix = (i) => {
      const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if (mx - mn < 20) return false;
      const h = hue(r, g, b);
      let d = Math.abs(h - h0);
      if (d > 3) d = 6 - d;
      return d <= 0.5;
    };
  } else {
    isBgPix = (i) => {
      if (!(data[i * 4] > 235 && data[i * 4 + 1] > 235 && data[i * 4 + 2] > 235)) return false;
      const x = i % W, y = (i / W) | 0;
      const wb = (M.whiteBoxes || []).find(B => inBoxEarly(x, y, B));
      if (wb && data[i * 4] < (wb[5] || 256)) return false;
      return true;
    };
  }
  const bg = new Uint8Array(W * H);
  const stack = [];
  for (let x = 0; x < W; x++) { stack.push(x, (H - 1) * W + x); }
  for (let y = 0; y < H; y++) { stack.push(y * W, y * W + W - 1); }
  while (stack.length) {
    const p = stack.pop();
    if (bg[p] || !isBgPix(p)) continue;
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
  const inBox = (x, y, B) => x >= B[0] && x <= B[2] && y >= B[1] && y <= B[3];
  const whiteBoxOf = (x, y) => (M.whiteBoxes || []).find(B => inBox(x, y, B));
  const inWhiteBox = (x, y) => !!whiteBoxOf(x, y);
  const isBodyName = (n) => M.bodyNames.includes(n);

  const classOf = (i) => {
    if (bg[i]) return -1;
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const x = i % W, y = (i / W) | 0;
    // fondo de color: pieza suelta de la familia del fondo (AA / motas
    // encerradas) → hueco, salvo dentro de keepBoxes (ámbares)
    if (M.bg && isBgPix(i) && !(M.keepBoxes || []).some(B => inBoxEarly(x, y, B))) return -1;
    // la sombra de piso es NEUTRA — un píxel saturado (estribo verde del
    // Hiace a y≥790) jamás es sombra aunque cruce el umbral de luz
    const shNeutral = Math.max(r, g, b) - Math.min(r, g, b) < 24;
    for (const SH of [M.shadow, M.shadow2]) {
      if (SH && shNeutral && y >= SH.band[0] && y <= SH.band[1]
          && r >= SH.th && g >= SH.th && b >= SH.th
          && !(M.whiteBoxes || []).some(B => inBoxEarly(x, y, B) && r >= (B[4] || 235) && r < (B[5] || 256))
          && !(((SH.except || []).some(B => inBoxEarly(x, y, B))
               || (SH.exceptEllipses || []).some(E => ((x - E[0]) / E[2]) ** 2 + ((y - E[1]) / E[3]) ** 2 <= 1))
             && r < (SH.exceptMax || 256))) return -1;
    }
    const wb = WHITE_I >= 0 ? whiteBoxOf(x, y) : null;
    if (wb && r >= (wb[4] || 235) && g >= (wb[4] || 235) && b >= (wb[4] || 235)
        && r < (wb[5] || 256) && g < (wb[5] || 256) && b < (wb[5] || 256)) {
      for (const f of (M.fixed || [])) {
        if (f.from === 'white' && inBox(x, y, f.box)) return idxOf(f.to);
      }
      return WHITE_I;
    }
    if (!M.bg && r >= 235 && g >= 235 && b >= 235) return -1;
    let best = 0, bd = 1e9;
    for (let c = 0; c < CLASSES.length; c++) {
      if (!CLASSES[c].rgb) continue;
      if (c === WHITE_I && !inWhiteBox(x, y)) continue;
      if (CLASSES[c].boxes && !CLASSES[c].boxes.some(B => inBox(x, y, B))) continue;
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

  // mayoría 5×5 (2 pasadas), fondo con voto calificado (≥60%)
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

  // despeckle por componentes entre clases NEUTRAS (la principal del
  // cuerpo y la más oscura son especiales, como red/darkred en autos)
  {
    const SPECIAL = new Set(['amber', 'white', 'tailred', 'redlamp', 'lamp', 'glass', 'glass2', 'rim',
      M.bodyNames[0], M.bodyNames[M.bodyNames.length - 1]]);
    const GRAY = CLASSES.map((c, i) => (!SPECIAL.has(c.name) && c.rgb ? i : -1)).filter(i => i >= 0);
    const MIN_PX = M.minPx || 150;
    const MT = CLASSES.map((c, i) => (M.mergeInto && M.mergeInto[c.name] !== undefined ? idxOf(M.mergeInto[c.name]) : i));
    const mt = (k) => (k >= 0 ? MT[k] : k);
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
          if (ok && !seen[q] && mt(cls[q]) === mt(ci)) { seen[q] = 1; st.push(q); }
        }
      }
      if (comp.length >= MIN_PX) continue;
      if (M.shadow && M.shadow.exceptEllipses) {
        let sx = 0, sy = 0;
        for (const p2 of comp) { sx += p2 % W; sy += (p2 / W) | 0; }
        const cx = sx / comp.length, cy = sy / comp.length;
        if (M.shadow.exceptEllipses.some(E => ((cx - E[0]) / E[2]) ** 2 + ((cy - E[1]) / E[3]) ** 2 <= 1)) continue;
      }
      const votes = new Map();
      let bgTouch = 0, borderN = 0;
      const srcDark = Math.max(...CLASSES[ci].rgb) < 110;
      // el vidrio azul claro también cuenta como "claro": el marco oscuro
      // de la ventana del H100 (hilos finos char/dark) se fundía al glass
      const lightNeutral = (k) => CLASSES[k].name === 'lamp' || CLASSES[k].name === 'white' || CLASSES[k].name.startsWith('glass') || (CLASSES[k].rgb && Math.min(...CLASSES[k].rgb) >= 143);
      for (const p of comp) {
        const x = p % W, y = (p / W) | 0;
        for (const [q, ok] of [[p - 1, x > 0], [p + 1, x < W - 1], [p - W, y > 0], [p + W, y < H - 1]]) {
          if (!ok) continue;
          const c = cls[q];
          if (mt(c) === mt(ci)) continue;
          borderN++;
          if (c < 0) { bgTouch++; continue; }
          if (srcDark && lightNeutral(c)) continue;
          votes.set(c, (votes.get(c) || 0) + 1);
        }
      }
      if (borderN && bgTouch / borderN > 0.2 && comp.length / borderN >= 1.2 && comp.length >= 60) continue;
      if (srcDark && comp.length >= 150 && borderN && comp.length / borderN >= 1.5) continue;
      let best = null, bv = -1;
      for (const [c, v] of votes) if (v > bv) { bv = v; best = c; }
      if (best === null) {
        if (borderN && bgTouch / borderN > 0.5 && comp.length / borderN < 1.2) {
          for (const p of comp) cls[p] = -1;
        }
        continue;
      }
      for (const p of comp) cls[p] = best;
    }
  }

  // despeckle de BLANCO (fondo blanco): islas <120px se absorben
  if (WHITE_I >= 0 && !M.bg) {
    const MIN_W = 120;
    const seenW = new Uint8Array(W * H);
    for (let start = 0; start < W * H; start++) {
      if (seenW[start] || cls[start] !== WHITE_I) continue;
      const comp = [];
      const st = [start]; seenW[start] = 1;
      while (st.length) {
        const p = st.pop();
        comp.push(p);
        const x = p % W, y = (p / W) | 0;
        for (const [q, ok] of [[p - 1, x > 0], [p + 1, x < W - 1], [p - W, y > 0], [p + W, y < H - 1]]) {
          if (ok && !seenW[q] && cls[q] === WHITE_I) { seenW[q] = 1; st.push(q); }
        }
      }
      if (comp.length >= MIN_W) continue;
      const votes = new Map();
      for (const p of comp) {
        const x = p % W, y = (p / W) | 0;
        for (const [q, ok] of [[p - 1, x > 0], [p + 1, x < W - 1], [p - W, y > 0], [p + W, y < H - 1]]) {
          if (!ok) continue;
          const c = cls[q];
          if (c !== WHITE_I && c >= 0) votes.set(c, (votes.get(c) || 0) + 1);
        }
      }
      let best = null, bv = -1;
      for (const [c, v] of votes) if (v > bv) { bv = v; best = c; }
      for (const p of comp) cls[p] = best === null ? -1 : best;
    }
  }

  // glintGlass: islas CHICAS del cuerpo cuyo borde es mayormente VIDRIO
  // (destellos blancos pintados sobre los cristales) → clase 'glint' fija
  // (no recolorean — sobre el cuerpo azul salían puntos azules)
  if (M.glintGlass) {
    const BODYI = new Set(M.bodyNames.map(n => idxOf(n)));
    const GLASSI = new Set(CLASSES.map((c, i) => (c.name.startsWith('glass') ? i : -1)).filter(i => i >= 0));
    const GLINT = idxOf('glint');
    const seenG = new Uint8Array(W * H);
    for (let start = 0; start < W * H; start++) {
      if (seenG[start] || !BODYI.has(cls[start])) continue;
      const comp = [];
      const st = [start]; seenG[start] = 1;
      while (st.length) {
        const p2 = st.pop();
        comp.push(p2);
        const x = p2 % W, y = (p2 / W) | 0;
        for (const [q, ok] of [[p2 - 1, x > 0], [p2 + 1, x < W - 1], [p2 - W, y > 0], [p2 + W, y < H - 1]]) {
          if (ok && !seenG[q] && BODYI.has(cls[q])) { seenG[q] = 1; st.push(q); }
        }
      }
      if (comp.length >= 8000) continue;
      let borderN = 0, glassN = 0;
      for (const p2 of comp) {
        const x = p2 % W, y = (p2 / W) | 0;
        for (const [q, ok] of [[p2 - 1, x > 0], [p2 + 1, x < W - 1], [p2 - W, y > 0], [p2 + W, y < H - 1]]) {
          if (!ok) continue;
          const c = cls[q];
          if (BODYI.has(c)) continue;
          borderN++;
          if (GLASSI.has(c)) glassN++;
        }
      }
      if (borderN && glassN / borderN >= 0.6) for (const p2 of comp) cls[p2] = GLINT;
    }
  }

  // mergeInto
  if (M.mergeInto) {
    const remap = new Map();
    for (const [a, b] of Object.entries(M.mergeInto)) remap.set(idxOf(a), idxOf(b));
    for (let i = 0; i < W * H; i++) if (remap.has(cls[i])) cls[i] = remap.get(cls[i]);
  }

  const counts = new Array(CLASSES.length).fill(0);
  for (let i = 0; i < W * H; i++) if (cls[i] >= 0) counts[cls[i]]++;
  console.log('pixeles:', CLASSES.map((c, i) => `${c.name}:${counts[i]}`).join(' '));

  let bottom = 0, left = W, right = 0, top = H;
  for (let i = 0; i < W * H; i++) {
    if (cls[i] < 0) continue;
    const x = i % W, y = (i / W) | 0;
    if (y > bottom) bottom = y;
    if (y < top) top = y;
    if (x < left) left = x;
    if (x > right) right = x;
  }
  const scale = +Math.min(172.4 / (right - left), 116 / (bottom - top)).toFixed(4);
  const tx = +(120 - scale * (left + right) / 2).toFixed(1);
  const ty = +(123 - scale * bottom).toFixed(1);
  console.log(`bbox x ${left}-${right} y ${top}-${bottom} → transform: translate(${tx} ${ty}) scale(${scale})`);

  // mapa de clases (debug)
  {
    const DBG = [[230,34,41],[190,22,28],[40,40,46],[10,10,14],[0,160,160],[160,120,255],[80,80,90],[120,121,130],[180,181,190],[210,211,220],[255,255,0],[255,0,255],[0,255,0],[0,0,255],[255,128,0],[128,64,0],[0,128,255],[255,0,128],[128,255,0],[0,64,128],[64,0,128],[128,128,0],[0,255,255]];
    const img = Buffer.alloc(W * H * 3, 255);
    for (let i = 0; i < W * H; i++) {
      if (cls[i] < 0) continue;
      const c = DBG[cls[i] % DBG.length];
      img[i*3] = c[0]; img[i*3+1] = c[1]; img[i*3+2] = c[2];
    }
    await sharp(img, { raw: { width: W, height: H, channels: 3 } }).png().toFile(`${O}/${key}-cls.png`);
  }

  // máscaras → potrace (dilatación 2px, sin redondear)
  const dilate = (mask, passes = 2) => {
    const out = new Uint8Array(mask);
    for (let pass = 0; pass < passes; pass++) {
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
    // E1.23b: dilateClasses = override POR CLASE (patrón E1.22 de trace-motos)
    // — el blanco de rines/lentes dilatado 2px desbordaba sobre llanta y
    // marcos (halos blancos sobre la tarjeta del app)
    m = dilate(m, (M.dilateClasses && M.dilateClasses[name] !== undefined)
      ? M.dilateClasses[name]
      : ((M.dilateBody === 1 && isBodyName(name)) ? 1 : 2));
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

  const bgHex = M.bg ? '#' + M.bg.map(v => v.toString(16).padStart(2, '0')).join('') : '#fff';
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="${bgHex}"/>`;
  for (const r of results) svg += `<path d="${r.d}" fill="${M.fills[r.name]}" fill-rule="evenodd"/>`;
  svg += '</svg>';
  fs.writeFileSync(`${O}/${key}-trace.svg`, svg);
  console.log('trazado:', results.map(r => `${r.name}:${r.d.length}ch`).join(' '));
  await sharp(Buffer.from(svg)).resize({ width: 900 }).png().toFile(`${O}/${key}-preview.png`);

  const EXPORT = key.toUpperCase() + '_TRACE';
  let mod = `// src/components/ui/${key}Trace.js\n`;
  mod += `// GENERADO desde REFERENCIAS INTERFAZ/VEHÍCULOS/${M.file} (${W}×${H},\n`;
  mod += '// capas dilatadas 2px) por vectorización de capas de color (potrace,\n';
  mod += '// arnés trace-mix tanda 9) — NO editar a mano; regenerar con el arnés.\n';
  mod += `export const ${EXPORT} = {\n`;
  for (const r of results) mod += `  ${r.name}: ${JSON.stringify(r.d)},\n`;
  mod += '};\n';
  fs.writeFileSync(`C:/proyectos/club-turkaj/src/components/ui/${key}Trace.js`, mod);
  console.log(`${key}Trace.js escrito,`, mod.length, 'chars');
})();
}
