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
const DIR = 'C:/proyectos/club-turkaj/REFERENCIAS INTERFAZ/VEHÍCULOS/';
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
    minPx: 500,
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

// ── E1.15 (24-ago): tanda AUTOS LIVIANOS + SUV (misma categoría liviano).
// Rasgos de la serie (vista 3/4 frontal-izquierda... el frente a la DERECHA):
// familia de ROJOS ancha (lit 205-230 / sombra 170-200) → red BODY + darkred
// SHADE; vidrio claro en sedanes (203-212) u oscuro (parte de los darks);
// blancos de faros ≈ tono del fondo (solo separables por whiteBox espacial,
// medidas con whites.js); sombra de piso por banda con th por modelo y
// cajas EXCEPT sobre ruedas cuando la sombra empata con el plateado.
Object.assign(MODELS, {
  civic: {
    file: 'AUTOS LIVIANOS/HONDA, CIVIC.png',
    minPx: 500,
    classes: [
      { name: 'red',     rgb: [215, 32, 34] },
      { name: 'darkred', rgb: [189, 29, 30] },
      { name: 'black',   rgb: [51, 53, 55] },
      { name: 'dark',    rgb: [63, 64, 65] },
      { name: 'gray',    rgb: [150, 150, 150] }, // huecos sombreados del rin trasero
      { name: 'silver',  rgb: [192, 192, 192] },
      { name: 'glass',   rgb: [212, 212, 212] }, // vidrios + rines 216
      { name: 'white',   rgb: [251, 250, 250] },
    ],
    fixed: [],
    whiteBoxes: [
      [455, 483, 690, 556, 170, 256], // FARO completo (th bajo = lámpara sólida)
      [100, 483, 150, 538, 237, 256],
    ],
    // la sombra de piso (214) sube hasta y~680 entre ruedas y los rines
    // son 216 (mismo tono) → cajas EXCEPT sobre ambas ruedas
    // rines medidos con rims.js (componentes claros encerrados por la
    // llanta — la sombra es el blob conectado [100,687,1455,823])
    // rines = ELIPSES en vista 3/4 (bbox rect dejaba esquinas con motas
    // de suelo brillante): exceptEllipses [cx,cy,rx,ry] del bbox de rims.js
    shadow: { band: [640, 860], th: 197, exceptMax: 228, exceptEllipses: [[820, 671, 68, 105], [1360, 610, 46, 86]] },
    order: ['black', 'dark', 'gray', 'silver', 'glass', 'darkred', 'red', 'white'],
    fills: { red: '#D72022', darkred: '#BD1D1E', black: '#333537', dark: '#3F4041', gray: '#969696', silver: '#C0C0C0', glass: '#D4D4D4', white: '#FBFAFA' },
  },
});


// ── E1.15: 14 configs restantes (anclas de sample.js, rines de rims.js,
// blancos de whites.js). Regla APRENDIDA con el Civic: los brillos de
// suelo encerrados entre rocker y sombra (y>650) NUNCA son pieza — solo
// los destellos de FAROS/manijas (y 430-570) van en whiteBoxes.
Object.assign(MODELS, {
  accent: {
    file: 'AUTOS LIVIANOS/HYUNDAI, ACCENT.png', minPx: 500,
    classes: [
      { name: 'red',     rgb: [214, 29, 30] },
      { name: 'darkred', rgb: [196, 29, 30] },
      { name: 'black',   rgb: [49, 51, 51] },
      { name: 'dark',    rgb: [62, 63, 64] },
      { name: 'gray',    rgb: [150, 150, 150] },
      { name: 'silver',  rgb: [191, 190, 190] },
      { name: 'glass',   rgb: [207, 206, 206] },
      { name: 'white',   rgb: [250, 249, 249] },
    ],
    fixed: [],
    whiteBoxes: [
      [452, 466, 758, 572, 170, 256],
    ],
    shadow: { band: [650, 870], th: 197, exceptMax: 228, exceptEllipses: [[820, 681, 68, 104], [1376, 625, 48, 85]] },
    order: ['black', 'dark', 'gray', 'silver', 'glass', 'darkred', 'red', 'white'],
    fills: { red: '#D61D1E', darkred: '#C41D1E', black: '#313333', dark: '#3E3F40', gray: '#969696', silver: '#BFBEBE', glass: '#CFCECE', white: '#FAF9F9' },
  },
  picanto: {
    file: 'AUTOS LIVIANOS/KIA, PICANTO.png', minPx: 500,
    classes: [
      { name: 'red',     rgb: [225, 19, 23] },
      { name: 'darkred', rgb: [212, 16, 19] },
      { name: 'deep',    rgb: [33, 33, 32] },
      { name: 'black',   rgb: [42, 42, 41] },
      { name: 'dark',    rgb: [54, 54, 53] },
      { name: 'gray',    rgb: [132, 132, 131] },
      { name: 'glass',   rgb: [191, 190, 190] },
      { name: 'silver',  rgb: [211, 211, 211] },
      { name: 'white',   rgb: [248, 248, 248] },
    ],
    mergeInto: { deep: 'black' },
    fixed: [],
    whiteBoxes: [
      [530, 392, 782, 538, 170, 256],
    ],
    shadow: { band: [670, 885], th: 197, exceptMax: 228, exceptEllipses: [[826, 708, 70, 101], [1373, 637, 45, 84]] },
    order: ['black', 'dark', 'gray', 'glass', 'silver', 'darkred', 'red', 'white'],
    fills: { red: '#E11317', darkred: '#D41013', deep: '#212120', black: '#2A2A29', dark: '#363635', gray: '#848483', glass: '#BEBEBE', silver: '#D3D3D3', white: '#F8F8F8' },
  },
  rio: {
    file: 'AUTOS LIVIANOS/KIA, RIO.png', minPx: 500,
    classes: [
      { name: 'red',     rgb: [218, 25, 25] },
      { name: 'darkred', rgb: [205, 23, 23] },
      { name: 'deep',    rgb: [30, 30, 29] },
      { name: 'black',   rgb: [42, 42, 41] },
      { name: 'dark',    rgb: [50, 50, 50] },
      { name: 'gray',    rgb: [130, 129, 129] },
      { name: 'glass',   rgb: [176, 176, 176] },
      { name: 'silver',  rgb: [201, 200, 200] },
      { name: 'lightgray', rgb: [213, 213, 213] },
      { name: 'white',   rgb: [249, 248, 248] },
    ],
    mergeInto: { black: 'dark' },
    fixed: [],
    whiteBoxes: [
      [438, 458, 730, 570, 170, 256],
    ],
    shadow: { band: [660, 875], th: 197, exceptMax: 228, exceptEllipses: [[797, 690, 66, 97], [1370, 629, 45, 81]] },
    order: ['deep', 'dark', 'gray', 'glass', 'silver', 'lightgray', 'darkred', 'red', 'white'],
    fills: { red: '#DA1919', darkred: '#CD1717', deep: '#1E1E1D', black: '#2A2A29', dark: '#323232', gray: '#828181', glass: '#B0B0B0', silver: '#C9C8C8', lightgray: '#D5D5D5', white: '#F9F8F8' },
  },
  mazda3: {
    file: 'AUTOS LIVIANOS/MAZDA, MAZDA 3.png', minPx: 500,
    classes: [
      { name: 'tailred', rgb: null },
      { name: 'red',     rgb: [213, 30, 31] },
      { name: 'darkred', rgb: [195, 30, 31] },
      { name: 'black',   rgb: [49, 51, 53] },
      { name: 'dark',    rgb: [63, 64, 65] },
      { name: 'gray',    rgb: [150, 150, 150] },
      { name: 'glass',   rgb: [203, 203, 203] },
      { name: 'silver',  rgb: [212, 212, 212] },
      { name: 'white',   rgb: [249, 249, 249] },
    ],
    fixed: [
      // calavera del hombro trasero (194-198 en [1380,461,1429,497]) FIJA
      // — SOLO el rojo oscuro: el rojo del cuerpo dentro de la caja sigue
      // recoloreando (con ambos, salía un parche rectangular)
      { from: 'darkred', to: 'tailred', box: [1376, 438, 1452, 502] },
      { from: 'red', to: 'tailred', box: [1390, 452, 1450, 500] }, // mitad clara de la cuña
    ],
    whiteBoxes: [
      [473, 488, 705, 578, 88, 256], // interior del faro 97-136 → th MUY bajo
    ],
    shadow: { band: [660, 865], th: 197, exceptMax: 228, exceptEllipses: [[802, 675, 66, 101], [1380, 621, 49, 84]] },
    order: ['tailred', 'black', 'dark', 'gray', 'glass', 'silver', 'darkred', 'red', 'white'],
    fills: { tailred: '#C21F20', red: '#D51E1F', darkred: '#C31E1F', black: '#313335', dark: '#3F4041', gray: '#969696', glass: '#CBCBCB', silver: '#D4D4D4', white: '#E4E4E4' },
  },
  corolla: {
    file: 'AUTOS LIVIANOS/TOYOTA, COROLLA.png', minPx: 500,
    classes: [
      { name: 'red',    rgb: [212, 35, 35] },
      { name: 'slate',  rgb: [47, 54, 59] },
      { name: 'slate2', rgb: [58, 64, 67] },
      { name: 'gray',   rgb: [150, 150, 150] },
      { name: 'glass',  rgb: [204, 203, 203] },
      { name: 'white',  rgb: [252, 251, 251] },
    ],
    fixed: [],
    whiteBoxes: [
      [488, 488, 740, 560, 170, 256],
    ],
    shadow: { band: [650, 860], th: 197, exceptMax: 228, exceptEllipses: [[880, 672, 58, 97], [1353, 611, 36, 78]] },
    order: ['slate', 'slate2', 'gray', 'glass', 'red', 'white'],
    fills: { red: '#D42323', slate: '#2F363B', slate2: '#3A4043', gray: '#969696', glass: '#CCCBCB', white: '#FCFBFB' },
  },
  yaris: {
    file: 'AUTOS LIVIANOS/TOYOTA, YARIS.png', minPx: 500,
    classes: [
      { name: 'cabin', rgb: null },
      { name: 'red',    rgb: [214, 32, 33] },
      { name: 'black',  rgb: [49, 52, 54] },
      { name: 'dark',   rgb: [61, 64, 66] },
      { name: 'gray',   rgb: [150, 150, 150] },
      { name: 'glass',  rgb: [204, 203, 203] },
      { name: 'white',  rgb: [250, 250, 250] },
    ],
    cabinBox: [430, 240, 1300, 420], // invernadero (espejo/interior fijos)
    fixed: [],
    whiteBoxes: [
      [465, 483, 712, 570, 170, 256],
      [132, 484, 181, 542, 237, 256],
    ],
    shadow: { band: [660, 870], th: 197, exceptMax: 228, exceptEllipses: [[852, 681, 62, 98], [1355, 618, 39, 78]] },
    order: ['cabin', 'black', 'dark', 'gray', 'glass', 'red', 'white'],
    fills: { cabin: '#D04545', red: '#D62021', black: '#313436', dark: '#3D4042', gray: '#969696', glass: '#CCCBCB', white: '#FAFAFA' },
  },
  xb: {
    file: 'AUTOS LIVIANOS/SCION, XB.png', minPx: 500,
    // continuo de rojos 179-230 → 7 anclas finas fusionadas a 3 tonos
    classes: [
      { name: 'red', rgb: [230, 9, 15] },
      { name: 'rB', rgb: [222, 10, 15] },
      { name: 'red2', rgb: [214, 11, 16] },
      { name: 'rD', rgb: [206, 11, 16] },
      { name: 'rE', rgb: [198, 12, 16] },
      { name: 'darkred', rgb: [190, 12, 16] },
      { name: 'rG', rgb: [182, 13, 16] },
      { name: 'black', rgb: [29, 29, 29] },
      { name: 'dark', rgb: [45, 45, 44] },
      { name: 'silver', rgb: [185, 184, 184] },
      { name: 'lightgray', rgb: [200, 200, 200] },
      { name: 'white',   rgb: [252, 252, 252] },
    ],
    mergeInto: { rB: 'red', rD: 'red2', rE: 'red2', rG: 'darkred' },
    blotchBox: [180, 150, 660, 300], // parabrisas
    blotchSrc: ['red', 'rB', 'red2', 'rD', 'rE', 'darkred', 'rG'],
    fixed: [],
    whiteBoxes: [
      [478, 468, 620, 545, 170, 256],
      [118, 456, 195, 532, 170, 256],
    ],
    shadow: { band: [660, 920], th: 118, exceptMax: 228, exceptEllipses: [[781, 709, 62, 95], [1341, 652, 43, 78]] },
    order: ['black', 'dark', 'silver', 'lightgray', 'darkred', 'red2', 'red', 'white'],
    fills: { white: '#F2F2F2', red: '#E60A0F', rB: '#DE0A0F', red2: '#D60B10', rD: '#CE0B10', rE: '#C60C10', darkred: '#BE0C10', rG: '#B60D10', black: '#1D1D1D', dark: '#2D2D2C', silver: '#B9B8B8', lightgray: '#C8C8C8' },
  },
  xd: {
    file: 'AUTOS LIVIANOS/SCION, XD.png', minPx: 500,
    classes: [
      { name: 'red', rgb: [226, 12, 15] },
      { name: 'rB', rgb: [219, 11, 14] },
      { name: 'red2', rgb: [212, 10, 13] },
      { name: 'rD', rgb: [205, 9, 12] },
      { name: 'rE', rgb: [198, 9, 11] },
      { name: 'darkred', rgb: [190, 8, 10] },
      { name: 'rG', rgb: [183, 8, 10] },
      { name: 'rH', rgb: [175, 7, 9] },
      { name: 'black', rgb: [19, 19, 19] },
      { name: 'dark', rgb: [31, 31, 31] },
      { name: 'char', rgb: [40, 40, 40] },
      { name: 'silver', rgb: [185, 184, 184] },
      { name: 'lightgray', rgb: [222, 221, 221] },
      { name: 'white',   rgb: [252, 252, 252] },
    ],
    mergeInto: { rB: 'red', rD: 'red2', rE: 'red2', rG: 'darkred', rH: 'darkred', dark: 'black' },
    blotchBox: [170, 135, 700, 290], // parabrisas
    blotchSrc: ['red', 'rB', 'red2', 'rD', 'rE', 'darkred', 'rG', 'rH'],
    fixed: [],
    whiteBoxes: [
      [476, 428, 715, 530, 170, 256],
    ],
    shadow: { band: [680, 920], th: 95, exceptMax: 228, exceptEllipses: [[788, 704, 65, 100], [1387, 649, 44, 83]] },
    order: ['black', 'char', 'silver', 'lightgray', 'darkred', 'red2', 'red', 'white'],
    fills: { white: '#F4F4F4', red: '#DE0B0E', rB: '#D80B0E', red2: '#D20A0D', rD: '#CC090C', rE: '#C6090B', darkred: '#BE080A', rG: '#B70809', rH: '#AF0709', black: '#131313', dark: '#1F1F1F', char: '#282828', silver: '#B9B8B8', lightgray: '#DEDDDD' },
  },
  crv: {
    file: 'SUV/HONDA, CR-V.png', minPx: 500,
    classes: [
      { name: 'tailred', rgb: null },
      { name: 'red', rgb: [216, 17, 21] },
      { name: 'darkred', rgb: [202, 16, 19] },
      { name: 'deep', rgb: [21, 21, 21] },
      { name: 'black', rgb: [30, 30, 29] },
      { name: 'char', rgb: [41, 41, 41] },
      { name: 'gray', rgb: [51, 51, 50] },
      { name: 'silver', rgb: [186, 184, 184] },
      { name: 'white',   rgb: [252, 252, 252] },
    ],
    // calavera VERTICAL trasera (143-169,24,24 en [1425,360,1450,415]):
    // pieza ROJA FIJA — no recolorea (pedido del dueño)
    mergeInto: { black: 'deep', gray: 'char' },
    blotchBox: [390, 200, 740, 340], // parabrisas
    blotchSrc: ['red', 'darkred'],
    fixed: [
      { from: 'red', to: 'tailred', box: [1418, 352, 1458, 422] },
      { from: 'darkred', to: 'tailred', box: [1418, 352, 1458, 422] },
    ],
    whiteBoxes: [
      [405, 440, 675, 542, 165, 256],
      [90, 435, 142, 528, 165, 256],
    ],
    shadow: { band: [650, 920], th: 118, exceptMax: 228, exceptEllipses: [[777, 683, 61, 94], [1347, 642, 45, 81]] },
    order: ['tailred', 'deep', 'char', 'silver', 'darkred', 'red', 'white'],
    fills: { tailred: '#A51818', white: '#F0EFEF', red: '#D81115', darkred: '#CA1013', deep: '#181818', black: '#1E1E1D', char: '#2C2C2C', gray: '#333332', silver: '#BAB8B8' },
  },
  tucson: {
    file: 'SUV/HYUNDAI, TUCSON.png', minPx: 500,
    classes: [
      { name: 'red', rgb: [211, 14, 21] },
      { name: 'rB', rgb: [205, 13, 19] },
      { name: 'red2', rgb: [199, 12, 18] },
      { name: 'rD', rgb: [193, 12, 17] },
      { name: 'darkred', rgb: [187, 12, 16] },
      { name: 'rF', rgb: [180, 12, 16] },
      { name: 'rG', rgb: [173, 11, 15] },
      { name: 'deep', rgb: [21, 21, 20] },
      { name: 'black', rgb: [30, 30, 30] },
      { name: 'char', rgb: [41, 41, 41] },
      { name: 'gray', rgb: [50, 50, 50] },
      { name: 'silver', rgb: [186, 184, 184] },
      { name: 'white',   rgb: [252, 252, 252] },
    ],
    mergeInto: { rB: 'red', rD: 'red2', rF: 'darkred', rG: 'darkred', black: 'deep', gray: 'char' },
    blotchBox: [350, 195, 705, 365], // parabrisas
    blotchSrc: ['red', 'rB', 'red2', 'rD', 'darkred', 'rF', 'rG'],
    fixed: [],
    whiteBoxes: [
      [382, 458, 590, 542, 150, 256],
    ],
    shadow: { band: [650, 920], th: 118, exceptMax: 228, exceptEllipses: [[755, 678, 62, 97], [1340, 636, 46, 83]] },
    order: ['deep', 'char', 'silver', 'darkred', 'red2', 'red', 'white'],
    fills: { white: '#E9E8E8', red: '#D30E15', rB: '#CD0D13', red2: '#C70C12', rD: '#C10C11', darkred: '#BB0C10', rF: '#B40C10', rG: '#AD0B0F', deep: '#161614', black: '#1E1E1E', char: '#292929', gray: '#323232', silver: '#BAB8B8' },
  },
  sportage: {
    file: 'SUV/KIA, SPORTAGE.png', minPx: 500,
    classes: [
      { name: 'red', rgb: [215, 13, 19] },
      { name: 'rB', rgb: [209, 13, 19] },
      { name: 'red2', rgb: [203, 13, 18] },
      { name: 'rD', rgb: [196, 13, 17] },
      { name: 'darkred', rgb: [189, 12, 16] },
      { name: 'rF', rgb: [182, 12, 15] },
      { name: 'rG', rgb: [175, 11, 14] },
      { name: 'deep', rgb: [20, 20, 19] },
      { name: 'black', rgb: [30, 30, 29] },
      { name: 'char', rgb: [42, 42, 41] },
      { name: 'gray', rgb: [50, 50, 50] },
      { name: 'silver', rgb: [187, 186, 186] },
      { name: 'white',   rgb: [252, 252, 252] },
    ],
    mergeInto: { rB: 'red', rD: 'red2', rF: 'darkred', rG: 'darkred', black: 'deep', gray: 'char' },
    blotchBox: [350, 212, 700, 350], // parabrisas (E1.20: sin la franja del techo)
    blotchSrc: ['red', 'rB', 'red2', 'rD', 'darkred', 'rF', 'rG'],
    fixed: [],
    whiteBoxes: [
      [448, 425, 658, 575, 160, 256],
      [90, 428, 132, 522, 160, 256],
    ],
    shadow: { band: [650, 920], th: 118, exceptMax: 228, exceptEllipses: [[762, 676, 62, 98], [1347, 633, 47, 84]] },
    order: ['deep', 'char', 'silver', 'darkred', 'red2', 'red', 'white'],
    fills: { white: '#EFEFEF', red: '#D50D13', rB: '#CF0D13', red2: '#C90D12', rD: '#C30D11', darkred: '#BD0C10', rF: '#B60C0F', rG: '#AF0B0E', deep: '#151513', black: '#1E1E1D', char: '#2A2A29', gray: '#323232', silver: '#BBBABA' },
  },
  cx5: {
    file: 'SUV/MAZDA, CX-5.png', minPx: 500,
    classes: [
      { name: 'red', rgb: [209, 14, 18] },
      { name: 'rB', rgb: [203, 13, 17] },
      { name: 'red2', rgb: [197, 13, 16] },
      { name: 'rD', rgb: [190, 12, 15] },
      { name: 'darkred', rgb: [184, 12, 15] },
      { name: 'rF', rgb: [178, 11, 14] },
      { name: 'deep', rgb: [20, 20, 19] },
      { name: 'black', rgb: [30, 30, 29] },
      { name: 'char', rgb: [41, 41, 41] },
      { name: 'gray', rgb: [49, 49, 49] },
      { name: 'gray2', rgb: [61, 61, 61] },
      { name: 'trim', rgb: [79, 79, 78] },
      { name: 'silver', rgb: [190, 189, 189] },
      { name: 'white',   rgb: [252, 252, 252] },
    ],
    mergeInto: { rB: 'red', rD: 'red2', rF: 'darkred', black: 'deep', gray: 'char' },
    blotchBox: [520, 228, 900, 340], // parabrisas (E1.20: sin la franja del techo)
    blotchSrc: ['red', 'rB', 'red2', 'rD', 'darkred', 'rF'],
    fixed: [],
    whiteBoxes: [
      [483, 462, 662, 532, 145, 256],
    ],
    shadow: { band: [650, 920], th: 118, exceptMax: 228, exceptEllipses: [[734, 682, 70, 101], [1372, 635, 46, 85]] },
    order: ['deep', 'char', 'gray2', 'trim', 'silver', 'darkred', 'red2', 'red', 'white'],
    fills: { white: '#E9E9E9', red: '#D10E12', rB: '#CB0D11', red2: '#C50D10', rD: '#BE0C0F', darkred: '#B80C0F', rF: '#B20B0E', deep: '#151513', black: '#1E1E1D', char: '#2A2A29', gray: '#313131', gray2: '#3D3D3D', trim: '#4F4F4E', silver: '#BEBDBD' },
  },
  runner: {
    file: 'SUV/TOYOTA, 4RUNNER.png', minPx: 500,
    classes: [
      { name: 'red', rgb: [208, 25, 27] },
      { name: 'rB', rgb: [202, 22, 24] },
      { name: 'red2', rgb: [196, 20, 21] },
      { name: 'rD', rgb: [190, 18, 19] },
      { name: 'darkred', rgb: [183, 16, 17] },
      { name: 'rF', rgb: [176, 14, 15] },
      { name: 'rG', rgb: [170, 12, 13] },
      { name: 'deep', rgb: [21, 21, 21] },
      { name: 'black', rgb: [31, 31, 30] },
      { name: 'char', rgb: [40, 40, 39] },
      { name: 'gray', rgb: [48, 48, 47] },
      { name: 'silver', rgb: [183, 182, 182] },
      { name: 'white', rgb: [251, 251, 251] },
    ],
    mergeInto: { rB: 'red', rD: 'red2', rF: 'darkred', rG: 'darkred', black: 'deep', gray: 'char' },
    blotchBox: [420, 215, 760, 330], // parabrisas (E1.20: sin la franja del techo)
    blotchSrc: ['red', 'rB', 'red2', 'rD', 'darkred', 'rF', 'rG'],
    fixed: [],
    whiteBoxes: [
      [798, 173, 1285, 205, 240, 256],
      [418, 425, 668, 512, 160, 256],
      [93, 410, 175, 492, 160, 256],
      [530, 578, 585, 632, 160, 256], // faro de niebla
    ],
    shadow: { band: [660, 920], th: 118, exceptMax: 228, exceptEllipses: [[786, 702, 65, 93], [1337, 641, 42, 77]] },
    order: ['deep', 'char', 'silver', 'darkred', 'red2', 'red', 'white'],
    fills: { red: '#D01A1B', rB: '#CA1618', red2: '#C41415', rD: '#BE1213', darkred: '#B71011', rF: '#B00E0F', rG: '#AA0C0D', deep: '#161616', black: '#1F1F1E', char: '#282827', gray: '#30302F', silver: '#B7B6B6', white: '#FBFBFB' },
  },
  rav4: {
    file: 'SUV/TOYOTA, RAV4.png', minPx: 500,
    classes: [
      { name: 'red', rgb: [218, 17, 20] },
      { name: 'rB', rgb: [212, 16, 19] },
      { name: 'red2', rgb: [205, 16, 18] },
      { name: 'rD', rgb: [198, 15, 17] },
      { name: 'darkred', rgb: [191, 14, 17] },
      { name: 'rF', rgb: [184, 13, 16] },
      { name: 'rG', rgb: [178, 13, 16] },
      { name: 'deep', rgb: [20, 20, 20] },
      { name: 'black', rgb: [29, 30, 29] },
      { name: 'char', rgb: [41, 41, 41] },
      { name: 'gray', rgb: [50, 50, 50] },
      { name: 'glass', rgb: [58, 58, 58] },
      { name: 'silver', rgb: [187, 186, 186] },
      { name: 'white',   rgb: [252, 252, 252] },
    ],
    mergeInto: { rB: 'red', rD: 'red2', rF: 'darkred', rG: 'darkred', black: 'deep', gray: 'char' },
    blotchBox: [400, 230, 760, 340], // parabrisas (E1.20: sin la franja del techo)
    blotchSrc: ['red', 'rB', 'red2', 'rD', 'darkred', 'rF', 'rG'],
    fixed: [],
    whiteBoxes: [
      [393, 422, 672, 532, 160, 256],
      [92, 432, 146, 522, 160, 256],
    ],
    shadow: { band: [650, 920], th: 118, exceptMax: 228, exceptEllipses: [[762, 691, 62, 95], [1348, 647, 46, 82]] },
    order: ['deep', 'char', 'glass', 'silver', 'darkred', 'red2', 'red', 'white'],
    fills: { white: '#EFEFEF', red: '#DA1114', red2: '#CD1012', rB: '#D41013', rD: '#C60F11', darkred: '#BF0E11', rF: '#B80D10', rG: '#B20D10', deep: '#151515', black: '#1D1E1D', char: '#292929', gray: '#323232', glass: '#3A3A3A', silver: '#BBBABA' },
  },
});


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
      { name: 'amber',   rgb: [196, 84, 15] },   // E1.20: medido en esquineros/bumper (antes 230,148,38 y ganaba el rojo)
      { name: 'white',   rgb: [252, 252, 252] },
    ],
    mergeInto: { rB: 'red', rD: 'red2', rF: 'darkred', rG: 'darkred', rH: 'darkred', black: 'deep' },
    fixed: [],
    whiteBoxes: [[55, 460, 135, 575, 235, 256], [430, 460, 545, 560, 235, 256]],
    shadow: { band: [655, 915], th: 118, exceptMax: 228, exceptEllipses: [[703, 690, 54, 85], [1281, 616, 30, 57]] },
    order: ['deep', 'char', 'gray', 'silver', 'darkred', 'red2', 'red', 'amber', 'white'],
    fills: { red: '#E30F1C', rB: '#DB0D19', red2: '#D30C15', rD: '#CB0B13', darkred: '#C30B12', rF: '#BB0A10', rG: '#B2090E', rH: '#A3080C', deep: '#131313', black: '#1E1E1E', char: '#282828', gray: '#333333', silver: '#C8C8C8', amber: '#C4540F', white: '#FCFCFC' },
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
    fills: { red: '#DD191A', rB: '#D61617', red2: '#CF1415', rD: '#C81213', darkred: '#C11112', deep: '#141414', black: '#1C1C1C', char: '#282828', gray: '#333332', glass: '#797979', silver: '#CBCBCB' },
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


// ── E1.18 (24-ago): INTERPRETACIÓN — lámparas estructuradas y degradados
// fieles (decisión del dueño: mostrar el modelo TAL CUAL la referencia).
const LAMPS = {
  civic:    { fill: '#D2D2D2', boxes: [[455, 483, 690, 556]], extra: [[100, 483, 150, 538, 237, 256]] },
  accent:   { fill: '#CDCCCC', boxes: [[452, 466, 758, 572]] },
  picanto:  { fill: '#C8C8C8', boxes: [[530, 392, 782, 538]] },
  rio:      { fill: '#CCCBCB', boxes: [[438, 458, 730, 570]], keep: ['gray'] },   // E1.20: interior gris 130 del faro NO se aplana
  mazda3:   { fill: '#8E8F91', boxes: [[473, 488, 705, 578]] },
  corolla:  { fill: '#CFCECE', boxes: [[488, 488, 740, 560]], keep: ['gray'] }, // E1.20b: interior 127 del faro
  yaris:    { fill: '#CFCECE', boxes: [[465, 483, 712, 570]], extra: [[132, 484, 181, 542, 237, 256]] },
  xb:       { fill: '#C6C5C5', boxes: [[478, 468, 620, 545], [118, 456, 195, 532]] },
  xd:       { fill: '#C9C8C8', boxes: [[476, 428, 715, 530]] },
  crv:      { fill: '#C4C2C2', boxes: [[405, 440, 675, 542], [97, 442, 134, 520]] },
  tucson:   { fill: '#C2C0C0', boxes: [[382, 458, 590, 542]] },
  sportage: { fill: '#C6C5C5', boxes: [[448, 425, 658, 575], [95, 435, 126, 517]] },
  cx5:      { fill: '#C6C5C5', boxes: [[483, 462, 662, 532]] },
  runner:   { fill: '#C2C1C1', boxes: [[418, 425, 668, 512], [102, 419, 166, 484], [530, 578, 585, 632]], extra: [[798, 173, 1285, 205, 240, 250]] }, // E1.20: max 250 - el fondo (>=250) sobre la barra vuelve a inundarse (salia tira blanca),
  rav4:     { fill: '#C6C5C5', boxes: [[393, 422, 672, 532], [101, 442, 137, 513]] },
  dmax:     { fill: '#C0BFBF', boxes: [[440, 434, 662, 524], [68, 432, 114, 500]] },
  gladiator:{ fill: '#BEBDBD', boxes: [[413, 430, 472, 509], [159, 430, 191, 494], [482, 483, 568, 517]] },
  l200:     { fill: '#C4C4C4', boxes: [[418, 426, 650, 526], [93, 422, 145, 506]] },
  frontier: { fill: '#C6C6C6', boxes: [[414, 423, 610, 513], [85, 416, 119, 490]] },
  hilux:    { fill: '#CCCCCC', boxes: [[440, 407, 680, 494], [109, 415, 145, 476]], keep: ['glass'] }, // E1.20: interior 121 del faro
  tacoma:   { fill: '#C9C8C8', boxes: [[444, 431, 634, 510], [79, 428, 115, 495]] },
};
// modelos cuyo continuo de rojo sale SIN fusionar (todas las bandas finas)
const REDFINE = ['xb', 'xd', 'tucson', 'sportage', 'cx5', 'runner', 'rav4',
  'dmax', 'gladiator', 'l200', 'frontier', 'r22', 'hilux', 'tacoma'];
// E1.20: el ÁMBAR (g≥80) no es familia roja — con r-g>60 entraba y salía
// pintado con shade(color) en el arte (xB/xD/22R perdían el ámbar)
const isRedFamily = (c) => c.rgb && c.rgb[0] - c.rgb[1] > 60 && !['amber', 'orange', 'darkorange', 'edge'].includes(c.name);

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
      && !['white', 'amber', 'lamp'].includes(c.name)
      && !(L.keep || []).includes(c.name)).map(c => c.name);
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

// E1.20: (a) ancla EDGE = antialias rojo/negro (punto medio entre el rojo
// principal y la clase más oscura) — caía en darkred y, dibujado DESPUÉS
// del negro con dilatación 2px, se comía ranuras de parrilla (Gladiator) y
// marcos de ventana (Hilux/Rio); se fusiona a la clase más oscura.
// (b) ámbar del DRL del CX-5. (c) reflejo ROSADO bajo el faro (4Runner/
// Tacoma) como banda roja clara — caía en silver y la caja de lámpara lo
// volvía lente.
const EDGE_MODELS = []; // E1.20: DESCARTADO — el punto medio rojo/negro se comía sombras rojas legítimas (puerta del Gladiator) y no arreglaba las ranuras
function applyE120() {
  for (const key of EDGE_MODELS) {
    const M = MODELS[key];
    if (!M || M.classes.some(c => c.name === 'edge')) continue;
    const red = M.classes.find(c => c.name === 'red');
    const darkest = M.classes.filter(c => c.rgb && !isRedFamily(c)).sort((a, b) => Math.max(...a.rgb) - Math.max(...b.rgb))[0];
    M.classes.push({ name: 'edge', rgb: [Math.round((red.rgb[0] + darkest.rgb[0]) / 2), Math.round((red.rgb[1] + darkest.rgb[1]) / 2), Math.round((red.rgb[2] + darkest.rgb[2]) / 2)] });
    M.mergeInto = Object.assign({}, M.mergeInto, { edge: darkest.name });
  }
  if (MODELS.cx5 && !MODELS.cx5.classes.some(c => c.name === 'amber')) {
    MODELS.cx5.classes.push({ name: 'amber', rgb: [168, 100, 70] });
    MODELS.cx5.fills.amber = '#A86446';
    MODELS.cx5.order.push('amber');
  }
  for (const [key, rgb] of Object.entries(PINK)) {
    const M = MODELS[key];
    if (!M || M.classes.some(c => c.name === 'rP')) continue;
    M.classes.push({ name: 'rP', rgb });
    M.order.splice(M.order.indexOf('red'), 0, 'rP');
    M.fills.rP = '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('');
  }
}
const PINK = {}; // (sin uso: los reflejos bajo faro resultaron rojo puro)
for (const k of ['yaris', 'hilux', 'corolla', 'picanto']) MODELS[k].dilateRed = 1; // E1.20b

// E1.18: transformación de LÁMPARAS y bandas de rojo (ver LAMPS/REDFINE)
applyE118();
applyE120();

module.exports = { MODELS };
if (require.main === module) {
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
    // AUTOS (E1.15): shadow.except = cajas (ruedas) EXENTAS del descarte —
    // en los SUV la sombra de piso (180-192) empata con el plateado de los
    // rines; también quedan exentas las piezas blancas dentro de una
    // whiteBox (la tira reflejante trasera del Civic cae en la banda)
    if (M.shadow && y >= M.shadow.band[0] && y <= M.shadow.band[1]
        && r >= M.shadow.th && g >= M.shadow.th && b >= M.shadow.th
        && !(M.whiteBoxes || []).some(B => inBoxEarly(x, y, B) && r >= (B[4] || 235) && r < (B[5] || 256))
        && !(((M.shadow.except || []).some(B => inBoxEarly(x, y, B))
             || (M.shadow.exceptEllipses || []).some(E => ((x - E[0]) / E[2]) ** 2 + ((y - E[1]) / E[3]) ** 2 <= 1))
           && r < (M.shadow.exceptMax || 256))) return -1;
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

  // despeckle por componentes entre clases NEUTRAS
  {
    const SPECIAL = new Set(['red', 'darkred', 'green', 'orange', 'darkorange', 'teal', 'darkteal', 'blue', 'amber', 'white', 'taillight', 'tailred', 'spring', 'navy', 'springsilver', 'hubdot', 'ring', 'cabin', 'lamp', 'edge']);
    const GRAY = CLASSES.map((c, i) => (!SPECIAL.has(c.name) && c.rgb ? i : -1)).filter(i => i >= 0);
    const MIN_PX = M.minPx || 150;
    // E1.20: clases que se FUSIONAN al mismo destino (mergeInto, que corre
    // después) cuentan como UNA para crecer islas y para votar — las
    // ranuras de la parrilla del Gladiator se partían en trozos black/deep
    // <minPx y cada trozo se cedía a la cara darkred de la parrilla
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
      // E1.16: dentro de las elipses de rin el detalle chico es legítimo
      // (bolsillos/ranuras de 100-400px) — el despeckle no las toca
      if (M.shadow && M.shadow.exceptEllipses) {
        let sx = 0, sy = 0;
        for (const p2 of comp) { sx += p2 % W; sy += (p2 / W) | 0; }
        const cx = sx / comp.length, cy = sy / comp.length;
        if (M.shadow.exceptEllipses.some(E => ((cx - E[0]) / E[2]) ** 2 + ((cy - E[1]) / E[3]) ** 2 <= 1)) continue;
      }
      const votes = new Map();
      let bgTouch = 0, borderN = 0;
      // E1.20: una isla OSCURA nunca se funde a una clase clara neutra
      // (lamp/white/plata) — la ceja del faro de Tacoma/4Runner y las
      // barras de techo se derretían en la lámpara o en el fondo blanco
      const srcDark = Math.max(...CLASSES[ci].rgb) < 110;
      const lightNeutral = (k) => CLASSES[k].name === 'lamp' || CLASSES[k].name === 'white' || (CLASSES[k].rgb && Math.min(...CLASSES[k].rgb) >= 150);
      for (const p of comp) {
        const x = p % W, y = (p / W) | 0;
        for (const [q, ok] of [[p - 1, x > 0], [p + 1, x < W - 1], [p - W, y > 0], [p + W, y < H - 1]]) {
          if (!ok) continue;
          const c = cls[q];
          if (mt(c) === mt(ci)) continue;
          borderN++;
          if (c < 0) { bgTouch++; continue; }
          if (srcDark && lightNeutral(c)) continue;
          // E1.14: el BLANCO también absorbe motas grises. E1.16: TODA
          // clase vota — las líneas de panel picadas sobre el cuerpo ROJO
          // (cofre/techo de los picops) no tenían vecino gris y quedaban
          // como motas; ahora se funden a la clase dominante (el rojo)
          votes.set(c, (votes.get(c) || 0) + 1);
        }
      }
      // E1.14: el guard de "blob legítimo junto a fondo" exige además un
      // tamaño mínimo — las motas de 10-30px del AA en costuras junto a
      // fondo encerrado eran redondas (área/perímetro ≥1.2) y sobrevivían
      // como cadena punteada; los blobs reales (punta de escape) miden 100s
      if (borderN && bgTouch / borderN > 0.2 && comp.length / borderN >= 1.2 && comp.length >= 60) continue;
      // E1.20b: una isla OSCURA COMPACTA (manija, trim) es pieza, no mota —
      // se conserva; las líneas de panel (delgadas: área/borde < 1.5) siguen
      // fundiéndose al cuerpo como en E1.16
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

  // E1.17: manchas de COLOR encerradas en oscuro (reflejos del cuerpo en
  // el parabrisas) → se funden a la clase oscura dominante
  if (M.blotchSrc) {
    const SRC = new Set(M.blotchSrc.map(n => idxOf(n)));
    const isDark = (ci2) => ci2 >= 0 && CLASSES[ci2].rgb && CLASSES[ci2].rgb[0] < 100 && CLASSES[ci2].rgb[1] < 100;
    const seenB = new Uint8Array(W * H);
    for (let start = 0; start < W * H; start++) {
      if (seenB[start] || !SRC.has(cls[start])) continue;
      const ci = cls[start];
      const comp = [];
      const st = [start]; seenB[start] = 1;
      while (st.length) {
        const p2 = st.pop();
        comp.push(p2);
        const x = p2 % W, y = (p2 / W) | 0;
        for (const [q, ok] of [[p2 - 1, x > 0], [p2 + 1, x < W - 1], [p2 - W, y > 0], [p2 + W, y < H - 1]]) {
          if (ok && !seenB[q] && cls[q] === ci) { seenB[q] = 1; st.push(q); }
        }
      }
      if (comp.length >= 3000) continue;
      if (M.blotchBox) {
        let sx = 0, sy = 0;
        for (const p3 of comp) { sx += p3 % W; sy += (p3 / W) | 0; }
        const bx = sx / comp.length, by = sy / comp.length;
        const B = M.blotchBox;
        if (!(bx >= B[0] && bx <= B[2] && by >= B[1] && by <= B[3])) continue;
      }
      const votes = new Map();
      let darkN = 0, borderN = 0;
      for (const p2 of comp) {
        const x = p2 % W, y = (p2 / W) | 0;
        for (const [q, ok] of [[p2 - 1, x > 0], [p2 + 1, x < W - 1], [p2 - W, y > 0], [p2 + W, y < H - 1]]) {
          if (!ok) continue;
          const c = cls[q];
          if (c === ci || SRC.has(c)) continue;
          borderN++;
          if (isDark(c)) { darkN++; votes.set(c, (votes.get(c) || 0) + 1); }
        }
      }
      if (!borderN || darkN / borderN < 0.65) continue;
      let best = null, bv = -1;
      for (const [c, v] of votes) if (v > bv) { bv = v; best = c; }
      if (best !== null) for (const p2 of comp) cls[p2] = best;
    }
  }

  // E1.19: interior visto A TRAVÉS del cristal — componentes de ROJO
  // chicos (<6000px) dentro de cabinBox (invernadero) → clase 'cabin'
  // FIJA (espejo/asientos: en la referencia son rojos del interior, no
  // deben recolorear con la carrocería)
  if (M.cabinBox) {
    const CAB = idxOf('cabin');
    const REDS = new Set(CLASSES.map((c, i) => (c.rgb && c.rgb[0] - c.rgb[1] > 60 ? i : -1)).filter(i => i >= 0));
    const seenC = new Uint8Array(W * H);
    for (let start = 0; start < W * H; start++) {
      if (seenC[start] || !REDS.has(cls[start])) continue;
      const comp = [];
      const st = [start]; seenC[start] = 1;
      while (st.length) {
        const p2 = st.pop();
        comp.push(p2);
        const x = p2 % W, y = (p2 / W) | 0;
        for (const [q, ok] of [[p2 - 1, x > 0], [p2 + 1, x < W - 1], [p2 - W, y > 0], [p2 + W, y < H - 1]]) {
          if (ok && !seenC[q] && REDS.has(cls[q])) { seenC[q] = 1; st.push(q); }
        }
      }
      if (comp.length >= 6000) continue;
      let sx = 0, sy = 0;
      for (const p2 of comp) { sx += p2 % W; sy += (p2 / W) | 0; }
      const cx = sx / comp.length, cy = sy / comp.length;
      const B = M.cabinBox;
      if (cx >= B[0] && cx <= B[2] && cy >= B[1] && cy <= B[3]) {
        for (const p2 of comp) cls[p2] = CAB;
      }
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
    // E1.20b: dilateRed 1 → las bandas rojas (dibujadas DESPUÉS) solo crecen
    // 1px y dejan de adelgazar los marcos finos de ventana (Yaris/Hilux)
    m = dilate(m, (M.dilateRed === 1 && isRedFamily(CLASSES[ci])) ? 1 : 2);
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
  mod += '// arnés paramétrico E1.12) — NO editar a mano; regenerar con el arnés.\n';
  mod += `export const ${EXPORT} = {\n`;
  for (const r of results) mod += `  ${r.name}: ${JSON.stringify(r.d)},\n`;
  mod += '};\n';
  fs.writeFileSync(`C:/proyectos/club-turkaj/src/components/ui/${key}Trace.js`, mod);
  console.log(`${key}Trace.js escrito,`, mod.length, 'chars');
})();
}
