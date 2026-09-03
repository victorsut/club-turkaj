// Arnés PARAMÉTRICO de calco — 3ª tanda (22-ago-2026): HERO ECO,
// HERO XPULSE y YAMAHA YBR. Mismo motor de trace-multi.js (E1.11)
// con DIR apuntando a la carpeta reorganizada VEHÍCULOS/MOTOS/.
// Uso: node trace-motos.js <eco|xpulse|ybr>
// Reglas heredadas: flood-fill fondo, mayoría 5×5 con voto de fondo
// CALIFICADO (≥60%), despeckle por componentes solo entre neutras y sin
// absorber islas junto a fondo/hueco, dilatación 2px, potrace sin
// redondear, fillRule evenodd, anclas MEDIDAS por muestreo (sample.js /
// region.js de esta sesión).
const sharp = require('C:/proyectos/club-turkaj/node_modules/sharp');
const potrace = require('potrace') // instalado en tools/artes (npm install en esa carpeta);
const fs = require('fs');
const DIR = 'C:/proyectos/club-turkaj/REFERENCIAS INTERFAZ/VEHÍCULOS/MOTOS/';
const O = __dirname;

const MODELS = {
  eco: {
    file: 'HERO, ECO.png',
    // los oscuros son un CONTINUO 44→79 (degradado IA): 4 anclas ~7 de
    // paso + minPx alto = sin mosaico; el resorte y el perno del
    // basculante son plata CHICA rodeada de oscuro → protección por
    // región (clase especial que el despeckle no absorbe)
    minPx: 700,
    classes: [
      { name: 'red',    rgb: [216, 36, 38] },   // tanque/panel/guardafangos → recolor
      { name: 'dark',   rgb: [46, 50, 53] },
      { name: 'black',  rgb: [54, 58, 61] },
      { name: 'char2',  rgb: [61, 66, 69] },
      { name: 'char',   rgb: [68, 73, 76] },
      { name: 'midgray',rgb: [125, 126, 128] },
      { name: 'gray',   rgb: [160, 160, 161] },
      { name: 'silver', rgb: [181, 181, 181] },
      { name: 'silver2',rgb: [200, 200, 200] },
      { name: 'amber',  rgb: [237, 119, 39] },  // direccionales fijas
      { name: 'springsilver', rgb: null },      // resorte + perno por región
    ],
    fixed: [
      { from: 'gray',    to: 'springsilver', box: [393, 455, 516, 662] },
      { from: 'midgray', to: 'springsilver', box: [393, 455, 516, 662] },
      { from: 'silver',  to: 'springsilver', box: [393, 455, 516, 662] },
      { from: 'gray',    to: 'springsilver', box: [630, 645, 670, 684] },
      { from: 'midgray', to: 'springsilver', box: [630, 645, 670, 684] },
      { from: 'silver',  to: 'springsilver', box: [630, 645, 670, 684] },
    ],
    shadow: { band: [840, 905], th: 205 },
    order: ['dark', 'black', 'char2', 'char', 'midgray', 'gray', 'silver', 'silver2', 'red', 'springsilver', 'amber'],
    fills: { red: '#D82426', dark: '#2E3235', black: '#363A3D', char2: '#3D4245', char: '#44494C', midgray: '#7D7E80', gray: '#A0A0A1', silver: '#B5B5B5', silver2: '#C8C8C8', springsilver: '#A6A6A7', amber: '#ED7727' },
  },
  xpulse: {
    file: 'HERO, XPULSE.png',
    // tapa del mofle (60,67,75) caía ENTRE dark y char → ancla propia;
    // parabrisas/horquilla/parrilla (203-216) eran mosaico lightgray/
    // xlight → UNA clase (210); el punto de la maza trasera es plata
    // chica en mar oscuro → protección por región
    minPx: 600,
    classes: [
      { name: 'red',      rgb: [221, 31, 30] },  // tanque/guardafango alto/scoop → recolor
      { name: 'dark',     rgb: [49, 57, 65] },
      { name: 'cap',      rgb: [60, 67, 75], boxes: [[222, 438, 294, 524]] }, // tapa del mofle (SOLO ahí — global moteaba los espejos)
      { name: 'char',     rgb: [73, 78, 83] },
      { name: 'gray',     rgb: [135, 136, 139] }, // rayos/mofle
      { name: 'silver',   rgb: [181, 180, 180] },
      { name: 'lightgray',rgb: [210, 210, 211] }, // parabrisas/parrilla/horquilla
      { name: 'white',    rgb: [246, 246, 246] }, // destello del parabrisas (solo whiteBox)
      { name: 'taillight',rgb: null },            // calavera fija por región
      { name: 'hubdot',   rgb: null },            // punto de la maza trasera
    ],
    fixed: [
      { from: 'red', to: 'taillight', box: [168, 338, 236, 406] },
      { from: 'lightgray', to: 'hubdot', box: [315, 696, 343, 725] },
    ],
    whiteBoxes: [[1015, 122, 1205, 348, 238]],
    shadow: { band: [838, 916], th: 205 },
    order: ['dark', 'cap', 'char', 'gray', 'silver', 'lightgray', 'red', 'taillight', 'hubdot', 'white'],
    fills: { red: '#DD1F1E', dark: '#313941', cap: '#3C434B', char: '#494E53', gray: '#87888B', silver: '#B5B4B4', lightgray: '#D2D2D3', white: '#F6F6F6', taillight: '#D91F1E', hubdot: '#D2D2D3' },
  },
  ybr: {
    file: 'YAMAHA, YBR.png',
    // el pedal de freno (188) caía JUSTO entre silver 181 y silver2 195
    // → familia de 3 anclas plateadas con paso corto
    minPx: 400,
    classes: [
      { name: 'orange',  rgb: [254, 97, 4] },    // tanque/paneles/guardafangos → recolor
      { name: 'black',   rgb: [49, 53, 56] },
      { name: 'char',    rgb: [56, 61, 66] },
      { name: 'darkgray',rgb: [111, 112, 115] },
      { name: 'gray',    rgb: [148, 148, 148] },
      { name: 'silver',  rgb: [181, 181, 182] },
      { name: 'silver2', rgb: [190, 190, 191] },
      { name: 'silver3', rgb: [197, 197, 198] },
      { name: 'tailred', rgb: [201, 29, 32] },   // calavera roja fija (ancla propia)
      { name: 'amber',   rgb: null },            // direccionales: naranja oscuro que
    ],                                           // EMPATA con la sombra del tanque → por región
    fixed: [
      { from: 'orange', to: 'amber', box: [172, 423, 204, 468] },   // trasera
      { from: 'orange', to: 'amber', box: [1112, 300, 1143, 345] }, // frontal
    ],
    shadow: { band: [840, 916], th: 205 },
    order: ['black', 'char', 'darkgray', 'gray', 'silver', 'silver2', 'silver3', 'orange', 'tailred', 'amber'],
    fills: { orange: '#FE6104', black: '#313538', char: '#383D42', darkgray: '#6F7073', gray: '#949494', silver: '#B5B5B6', silver2: '#BEBEBF', silver3: '#C5C5C6', tailred: '#C91D20', amber: '#E05E0E' },
  },
};

// ── E1.13 (22-ago): correcciones del dueño sobre 7 artes en producción.
// Novedades del arnés usadas aquí: (1) whiteBox con TOPE superior
// [x1,y1,x2,y2,th,max] — el fondo IA es 250-253 y las piezas blancas
// reales 232-245: max≈246-249 separa pieza de fondo encerrado;
// (2) mergeInto — clasificar FINO (anclas de paso corto contra el
// mosaico) y FUSIONAR clases a la salida (menos bandas confusas);
// (3) clases sombra del cuerpo (darkorange → SHADE en el Art).
Object.assign(MODELS, {
  crf: { // quitar el resorte rojo (mal ubicado — decisión: omitirlo)
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
    ],
    fixed: [],
    whiteBoxes: [[640, 280, 1080, 430, 235, 249]],
    shadow: { band: [858, 935], th: 205 },
    order: ['black', 'darkgray', 'navy', 'mid', 'gray', 'silver', 'lightgray', 'xlight', 'darkred', 'red', 'white'],
    fills: { red: '#E2242A', darkred: '#C41C24', navy: '#32344A', black: '#343639', darkgray: '#444649', mid: '#787A7E', gray: '#98999C', silver: '#BBBCBF', lightgray: '#CCCDD0', xlight: '#DDDEE0', white: '#F4F5F5' },
  },
  xr: { // E1.14 (24-ago): RE-MEDIDO todo — las anclas viejas estaban corridas:
    // llantas reales 57-61 (no 32; el 39-43 que caía en 'tire' moteaba
    // espejos/manubrio), cuerpo negro 44-50, MOFLE 66-69 (clase propia —
    // antes caía en black y el cilindro desaparecía), motor anillo 80-86 +
    // bloque 104-110 (darkgray 100/gray 120 viejos lo aplanaban), horquilla/
    // basculante 208-218. El blanco de pieza es 241: whiteBoxes ampliadas a
    // tapa del mofle, faro/placa y panel completo (fuera de caja se volvía
    // HUECO → parches oscuros sobre la tarjeta negra). darkred = sombra roja
    // bajo la máscara → SHADE del cuerpo.
    file: 'HONDA, XR.png',
    minPx: 400,
    classes: [
      { name: 'red',     rgb: [214, 38, 36] },
      { name: 'darkred', rgb: [164, 28, 26] },
      { name: 'dark',    rgb: [40, 42, 44] },   // sombras de espejos/palancas
      { name: 'black',   rgb: [47, 48, 50] },   // cuerpo/asiento/manubrio
      { name: 'tire',    rgb: [58, 59, 61] },   // llantas + chasis oscuro
      { name: 'muffler', rgb: [67, 68, 68] },   // cilindro del mofle
      { name: 'engdark', rgb: [83, 84, 85] },   // anillo/sombras del motor
      { name: 'engmid',  rgb: [106, 107, 108] },// bloque del motor
      { name: 'gray',    rgb: [119, 119, 121] },// rayos/pedal
      { name: 'silver',  rgb: [190, 190, 192] },
      { name: 'lightgray', rgb: [211, 211, 212] }, // horquilla/basculante
      { name: 'xlight',  rgb: [227, 227, 227] },
      { name: 'white',   rgb: [241, 241, 241] },
    ],
    mergeInto: { dark: 'black' }, // la sombra del espejo moteaba — fusionar
    fixed: [],
    whiteBoxes: [
      [1025, 285, 1090, 470, 205, 249], // tubo de horquilla: th BAJO = tira sólida
      [290, 200, 1140, 720, 235, 248],  // panel lateral + tanque + cuña
      [170, 385, 320, 555, 232, 248],   // tapa del mofle (barrera de flood)
      [980, 230, 1280, 480, 235, 248],  // destello del faro + placa frontal
    ],
    shadow: { band: [878, 945], th: 205 },
    order: ['black', 'tire', 'muffler', 'engdark', 'engmid', 'gray', 'silver', 'lightgray', 'xlight', 'darkred', 'red', 'white'],
    fills: { red: '#D62624', darkred: '#A41C1A', dark: '#282A2C', black: '#2F3032', tire: '#3A3B3D', muffler: '#434444', engdark: '#515254', engmid: '#6A6B6C', gray: '#77787A', silver: '#BEBEC0', lightgray: '#D3D3D4', xlight: '#E3E3E3', white: '#F1F1F1' },
  },
  zeta: { // fondo encerrado en whiteBoxes (tras el motor y sobre la llanta
    // delantera) → max 246; blanco de pieza real medido 233-237
    file: 'ITALIKA, Z.png',
    passes: 2, minPx: 500,
    classes: [
      { name: 'green',   rgb: [122, 176, 60] },
      { name: 'charcoal',rgb: [66, 70, 72] },
      { name: 'dark',    rgb: [50, 56, 58] },
      { name: 'tire',    rgb: [34, 44, 46] },
      { name: 'gray',    rgb: [120, 122, 126] },
      { name: 'silver',  rgb: [172, 174, 176] },
      { name: 'lightgray', rgb: [204, 205, 210] },
      { name: 'xlight',  rgb: [221, 222, 224] },
      { name: 'white',   rgb: [234, 234, 234] },
    ],
    fixed: [],
    whiteBoxes: [[400, 380, 1250, 560, 228, 246], [200, 260, 460, 360, 228, 246], [455, 415, 730, 600, 200, 246]],
    shadow: { band: [906, 945], th: 198 },
    order: ['tire', 'dark', 'charcoal', 'gray', 'silver', 'lightgray', 'xlight', 'green', 'white'],
    fills: { green: '#76B233', charcoal: '#3E4244', dark: '#2E3436', tire: '#20282A', gray: '#787A7E', silver: '#A9AAAD', lightgray: '#CCCDD2', xlight: '#DDDEE0', white: '#EDEDED' },
  },
  dita: { // rasgado/picado: los oscuros son un continuo 41-85 (anclas viejas
    // desalineadas = mosaico) → 5 anclas finas fusionadas a 2 tonos; blanco
    // de pieza 230-240 vs fondo 252 → th 228 max 246; aros claros de las
    // ruedas protegidos por región (el despeckle los absorbía)
    file: 'ITALIKA, D.png',
    minPx: 600,
    classes: [
      { name: 'teal',    rgb: [1, 138, 164] },
      { name: 'darkteal',rgb: [2, 115, 138] },
      { name: 'dk1',     rgb: [45, 52, 57] },
      { name: 'dk2',     rgb: [51, 58, 63] },
      { name: 'dk3',     rgb: [57, 64, 70] },
      { name: 'dk4',     rgb: [63, 71, 77] },
      { name: 'dk5',     rgb: [68, 76, 83] },
      { name: 'xlight',  rgb: [220, 220, 220] },
      { name: 'white',   rgb: [234, 234, 234] },
      { name: 'tailred', rgb: [209, 60, 60] },
      { name: 'amber',   rgb: [235, 150, 45] },
      { name: 'ring',    rgb: null },           // aros de rueda por región
    ],
    mergeInto: { dk2: 'dk1', dk3: 'dk1', dk4: 'dk5' },
    fixed: [
      { from: 'xlight', to: 'ring', box: [200, 620, 560, 908] },
      { from: 'xlight', to: 'ring', box: [1060, 610, 1420, 908] },
      { from: 'white',  to: 'ring', box: [200, 620, 560, 908] },
      { from: 'white',  to: 'ring', box: [1060, 610, 1420, 908] },
    ],
    // banda de sombra ORIGINAL [888,935]: los aros de rueda terminan en
    // y≈875 — ensancharla a 855 se comía sus arcos inferiores (punteado);
    // las cajas de rueda también son whiteBoxes (los brillos ≥234 del aro
    // eran huecos y agujereaban el arco)
    // E1.14: caja frontal ampliada [1010,190,1345,660] — la VENTANA blanca
    // de la máscara teal (234, y 205-295) y el borde alto del delantal
    // quedaban FUERA (y≥290) → huecos transparentes que rasgaban el frente
    whiteBoxes: [[220, 380, 720, 640, 228, 246], [1010, 190, 1345, 660, 228, 246], [200, 620, 560, 905, 234, 246], [1060, 610, 1420, 905, 234, 246]],
    shadow: { band: [888, 935], th: 205 },
    order: ['dk1', 'dk5', 'xlight', 'darkteal', 'teal', 'white', 'ring', 'tailred', 'amber'],
    fills: { teal: '#018AA4', darkteal: '#02738A', dk1: '#343B40', dk5: '#434B52', xlight: '#DCDCDC', white: '#EBEBEB', ring: '#DCDCDC', tailred: '#D13C3C', amber: '#EB962D' },
  },
  dm: { // la raíz sombreada del guardafangos delantero (199,77,21) caía en
    // tailred (rojo FIJO) → clase darkorange que recolorea como SHADE;
    // rack moteado → ancla intermedia 178; banda de sombra más ancha
    // (la elipse del piso arrancaba arriba de la banda y salía en xlight)
    file: 'ITALIKA, DM.png',
    minPx: 300, // E1.20: la tira del amortiguador (185) se partía entre silver15/silver2 en trozos <500 y el despeckle los cedía al negro
    classes: [
      { name: 'orange',    rgb: [238, 98, 22] },
      { name: 'darkorange',rgb: [197, 76, 21] },
      { name: 'black',     rgb: [52, 54, 56] },
      { name: 'dark',      rgb: [36, 40, 44] },
      { name: 'silver',    rgb: [170, 172, 174] },
      { name: 'silver15',  rgb: [178, 180, 182] },
      { name: 'silver2',   rgb: [187, 189, 191] },
      { name: 'xlight',    rgb: [219, 220, 222] },
      { name: 'white',     rgb: [242, 243, 243] },
      { name: 'tailred',   rgb: [215, 50, 50] },
    ],
    fixed: [],
    whiteBoxes: [[1050, 270, 1260, 400, 235, 248]],
    shadow: { band: [868, 945], th: 205 },
    order: ['dark', 'black', 'silver', 'silver15', 'silver2', 'xlight', 'darkorange', 'orange', 'white', 'tailred'],
    fills: { orange: '#EE6216', darkorange: 'SHADE', black: '#343638', dark: '#24282C', silver: '#AAABAD', silver15: '#B2B3B5', silver2: '#BBBCBF', xlight: '#DBDCDE', white: '#F2F3F3', tailred: '#D73232' },
  },
  ft: { // manchas en asiento/cola: continuo de oscuros 30-90 → 6 anclas
    // finas fusionadas a 3 tonos; banda de sombra más ancha (streak)
    file: 'ITALIKA, FT.png',
    minPx: 600,
    classes: [
      { name: 'orange', rgb: [240, 73, 25] },
      { name: 'f1',     rgb: [41, 49, 54] },
      { name: 'f1b',    rgb: [46, 54, 58] },
      { name: 'f2',     rgb: [52, 59, 64] },
      { name: 'f2b',    rgb: [58, 64, 68] },
      { name: 'f3',     rgb: [66, 72, 76] },
      { name: 'f3b',    rgb: [79, 84, 87] },
      { name: 'gray',   rgb: [140, 141, 143] },
      { name: 'silver', rgb: [170, 171, 172] },
      { name: 'xlight', rgb: [220, 220, 221] },
      { name: 'tailred',rgb: [210, 45, 50] },
      { name: 'amber',  rgb: [240, 160, 40] },
    ],
    mergeInto: { f1b: 'f1', f2b: 'f2', f3b: 'f3' },
    fixed: [],
    shadow: { band: [845, 940], th: 205 },
    order: ['f1', 'f2', 'f3', 'gray', 'silver', 'xlight', 'orange', 'tailred', 'amber'],
    fills: { orange: '#F04919', f1: '#2B3237', f2: '#373D42', f3: '#43494D', gray: '#8C8D8E', silver: '#AAABAC', xlight: '#DCDCDE', tailred: '#D22D32', amber: '#F0A028' },
  },
  xtz: { // motas blancas en las llantas: minPx 150 dejaba vivir las islas
    // claras entre tacos → minPx 600 (resto igual, el arte estaba bien)
    file: 'YAMAHA, XTZ.png',
    minPx: 600,
    classes: [
      { name: 'blue',   rgb: [10, 82, 210] },
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
// eco (E1.13): clasificar con las 4 anclas finas pero FUSIONAR a 2 tonos
// de salida — las 4 bandas cercanas se veían "confusas" en la tarjeta
MODELS.eco.mergeInto = { dark: 'black', char2: 'char' };
MODELS.eco.order = ['black', 'char', 'midgray', 'gray', 'silver', 'silver2', 'red', 'springsilver', 'amber'];

const key = process.argv[2];
const M = MODELS[key];
if (!M) { console.error('modelo desconocido:', key, '— usa:', Object.keys(MODELS).join(' ')); process.exit(1); }

(async () => {
  const { data, info } = await sharp(DIR + M.file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  console.log(key, W + 'x' + H);

  // flood fill del fondo. E1.14: las whiteBoxes son BARRERA del flood —
  // una pieza casi blanca (236-247) que toca el fondo abierto (p.ej. la
  // tapa del mofle de la XR) era comida por el flood a través del puente
  // de AA (>235 continuo); dentro de una whiteBox, por debajo de su max,
  // el píxel es blanco DE PIEZA y no puede inundarse.
  const inBoxEarly = (x, y, B) => x >= B[0] && x <= B[2] && y >= B[1] && y <= B[3];
  const isWhite = (i) => {
    if (!(data[i * 4] > 235 && data[i * 4 + 1] > 235 && data[i * 4 + 2] > 235)) return false;
    const x = i % W, y = (i / W) | 0;
    const wb = (M.whiteBoxes || []).find(B => inBoxEarly(x, y, B));
    if (wb && data[i * 4] < (wb[5] || 256)) return false;
    return true;
  };
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
  const inBox = (x, y, B) => x >= B[0] && x <= B[2] && y >= B[1] && y <= B[3];
  const whiteBoxOf = (x, y) => (M.whiteBoxes || []).find(B => inBox(x, y, B));
  const inWhiteBox = (x, y) => !!whiteBoxOf(x, y);

  const classOf = (i) => {
    if (bg[i]) return -1;
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const x = i % W, y = (i / W) | 0;
    if (M.shadow && y >= M.shadow.band[0] && y <= M.shadow.band[1]
        && r >= M.shadow.th && g >= M.shadow.th && b >= M.shadow.th) return -1;
    // whiteBox [x1,y1,x2,y2,th?,max?]: blanco de PIEZA entre th y max;
    // ≥max = fondo encerrado (250-253 en las referencias IA) → hueco
    const wb = WHITE_I >= 0 ? whiteBoxOf(x, y) : null;
    if (wb && r >= (wb[4] || 235) && g >= (wb[4] || 235) && b >= (wb[4] || 235)
        && r < (wb[5] || 256) && g < (wb[5] || 256) && b < (wb[5] || 256)) {
      // E1.14: los fixed también aplican sobre white — el aro del rin de la
      // D125 se partía entre white (brillos ≥234 de la whiteBox de rueda) y
      // ring (fixed de xlight) y potrace trazaba grumos; unificar a UNA clase
      for (const f of (M.fixed || [])) {
        if (f.from === 'white' && inBox(x, y, f.box)) return idxOf(f.to);
      }
      return WHITE_I;
    }
    if (r >= 235 && g >= 235 && b >= 235) return -1;
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
  if (process.env.DBGPX) { for (const pt of process.env.DBGPX.split(';')) { const [dx,dy]=pt.split(',').map(Number); const v=cls[dy*W+dx]; console.log('DBG', pt, 'clasificado:', v>=0?CLASSES[v].name:'bg'); } }



  if (process.env.DBGPX) { for (const pt of process.env.DBGPX.split(';')) { const [dx,dy]=pt.split(',').map(Number); const v=cls[dy*W+dx]; console.log('DBG', pt, 'antes de: mayoría 5×5 (2 pasadas), fondo con vo:', v>=0?CLASSES[v].name:'bg'); } }

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


  if (process.env.DBGPX) { for (const pt of process.env.DBGPX.split(';')) { const [dx,dy]=pt.split(',').map(Number); const v=cls[dy*W+dx]; console.log('DBG', pt, 'antes de: despeckle por componentes entre clase:', v>=0?CLASSES[v].name:'bg'); } }

  // despeckle por componentes entre clases NEUTRAS
  {
    const SPECIAL = new Set(['red', 'darkred', 'green', 'orange', 'darkorange', 'teal', 'darkteal', 'blue', 'amber', 'white', 'taillight', 'tailred', 'spring', 'navy', 'springsilver', 'hubdot', 'ring']);
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
          // E1.14: el BLANCO también puede absorber motas grises — las
          // cadenas de AA sobre el panel blanco (costura bajo la franja
          // roja de la XR) quedaban vivas porque white no votaba
          if (GRAY.includes(c) || c === WHITE_I) votes.set(c, (votes.get(c) || 0) + 1);
        }
      }
      // E1.14: el guard de "blob legítimo junto a fondo" exige además un
      // tamaño mínimo — las motas de 10-30px del AA en costuras junto a
      // fondo encerrado eran redondas (área/perímetro ≥1.2) y sobrevivían
      // como cadena punteada; los blobs reales (punta de escape) miden 100s
      if (borderN && bgTouch / borderN > 0.2 && comp.length / borderN >= 1.2 && comp.length >= 60) continue;
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

  // despeckle de BLANCO: el AA entre piezas claras y fondo encerrado cruza
  // la ventana de whiteBox y deja cadenas blancas que el despeckle normal
  // no toca (white es especial) — toda isla blanca <120px se absorbe al
  // vecino dominante (las piezas blancas REALES miden cientos/miles de px)
  if (WHITE_I >= 0) {
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

  // mergeInto: clasificación FINA (anclas de paso corto) → salida FUSIONADA
  // (menos bandas de tono casi iguales = lectura limpia en la tarjeta)
  if (M.mergeInto) {
    const remap = new Map();
    for (const [a, b] of Object.entries(M.mergeInto)) remap.set(idxOf(a), idxOf(b));
    for (let i = 0; i < W * H; i++) if (remap.has(cls[i])) cls[i] = remap.get(cls[i]);
  }

  const counts = new Array(CLASSES.length).fill(0);
  for (let i = 0; i < W * H; i++) if (cls[i] >= 0) counts[cls[i]]++;
  console.log('pixeles:', CLASSES.map((c, i) => `${c.name}:${counts[i]}`).join(' '));


  if (process.env.DBGPX) { for (const pt of process.env.DBGPX.split(';')) { const [dx,dy]=pt.split(',').map(Number); const v=cls[dy*W+dx]; console.log('DBG', pt, 'antes de: bbox + transform del componente (lien:', v>=0?CLASSES[v].name:'bg'); } }

  // bbox + transform del componente (lienzo 240×150, ancho útil ≈172.4)
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


  if (process.env.DBGPX) { for (const pt of process.env.DBGPX.split(';')) { const [dx,dy]=pt.split(',').map(Number); const v=cls[dy*W+dx]; console.log('DBG', pt, 'antes de: mapa de clases (debug):', v>=0?CLASSES[v].name:'bg'); } }

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


  if (process.env.DBGPX) { for (const pt of process.env.DBGPX.split(';')) { const [dx,dy]=pt.split(',').map(Number); const v=cls[dy*W+dx]; console.log('DBG', pt, 'antes de: máscaras → potrace (dilatación 2px, s:', v>=0?CLASSES[v].name:'bg'); } }

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


  if (process.env.DBGPX) { for (const pt of process.env.DBGPX.split(';')) { const [dx,dy]=pt.split(',').map(Number); const v=cls[dy*W+dx]; console.log('DBG', pt, 'antes de: SVG de verificación:', v>=0?CLASSES[v].name:'bg'); } }

  // SVG de verificación
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="#fff"/>`;
  for (const r of results) svg += `<path d="${r.d}" fill="${M.fills[r.name]}" fill-rule="evenodd"/>`;
  svg += '</svg>';
  fs.writeFileSync(`${O}/${key}-trace.svg`, svg);
  console.log('trazado:', results.map(r => `${r.name}:${r.d.length}ch`).join(' '));
  await sharp(Buffer.from(svg)).resize({ width: 900 }).png().toFile(`${O}/${key}-preview.png`);


  if (process.env.DBGPX) { for (const pt of process.env.DBGPX.split(';')) { const [dx,dy]=pt.split(',').map(Number); const v=cls[dy*W+dx]; console.log('DBG', pt, 'antes de: módulo de paths:', v>=0?CLASSES[v].name:'bg'); } }

  // módulo de paths
  const EXPORT = key.toUpperCase() + '_TRACE';
  let mod = `// src/components/ui/${key}Trace.js\n`;
  mod += `// GENERADO desde REFERENCIAS INTERFAZ/VEHÍCULOS/MOTOS/${M.file} (${W}×${H},\n`;
  mod += '// capas dilatadas 2px) por vectorización de capas de color (potrace,\n';
  mod += '// arnés paramétrico E1.12) — NO editar a mano; regenerar con el arnés.\n';
  mod += `export const ${EXPORT} = {\n`;
  for (const r of results) mod += `  ${r.name}: ${JSON.stringify(r.d)},\n`;
  mod += '};\n';
  if (!process.env.DBGPX) fs.writeFileSync(`C:/proyectos/club-turkaj/src/components/ui/${key}Trace.js`, mod);
  console.log(`${key}Trace.js escrito,`, mod.length, 'chars');
})();
