// Vectoriza la SUZUKI GN125 por CAPAS DE COLOR — mismo pipeline E1.9g de
// la Navi (flood-fill fondo + clases por ancla + mayoría 5×5 con voto de
// fondo CALIFICADO + despeckle por componentes + dilatación 2px + potrace).
// Voto de fondo calificado (≥60% de la ventana): los RAYOS de las ruedas
// son líneas finas junto al fondo y un voto simple se los comería.
const sharp = require('C:/proyectos/club-turkaj/node_modules/sharp');
const potrace = require('C:/Users/gasol/AppData/Local/Temp/claude/C--proyectos-club-turkaj/28aa1b05-a99c-469f-946b-6aef7d919aca/scratchpad/node_modules/potrace');
const fs = require('fs');

const F = 'C:/proyectos/club-turkaj/REFERENCIAS INTERFAZ/VEHÍCULOS/SUZUKI, GN125 y GN125F.png';
const O = __dirname;

(async () => {
  const { data, info } = await sharp(F).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;

  // ── flood fill del fondo (blanco conectado al borde) ──
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

  // ── clases (anclas medidas del histograma de la GN) ──
  const CLASSES = [
    { name: 'red',      rgb: [209, 25, 38] },   // tanque + panel → recolorable
    { name: 'black',    rgb: [43, 44, 45] },    // asiento, cuadro, llantas, espejo
    { name: 'tire',     rgb: [26, 27, 28] },    // manubrio y piezas negro profundo
    { name: 'midgray',  rgb: [102, 104, 106] }, // detalles del motor
    { name: 'gray',     rgb: [152, 154, 156] }, // rayos, tubo bajo
    { name: 'silver',   rgb: [172, 174, 176] }, // horquilla, parrilla, escape
    { name: 'silver2',  rgb: [190, 192, 194] }, // guardafangos, motor claro
    { name: 'lightgray',rgb: [206, 208, 210] }, // caras claras del motor
    { name: 'amber',    rgb: [240, 160, 40] },
    { name: 'taillight',rgb: null },            // calavera = rojo FIJO (región)
  ];
  const TAIL = [95, 370, 185, 465]; // x1,y1,x2,y2 — cuadro rojo trasero
  const inBox = (x, y, B) => x >= B[0] && x <= B[2] && y >= B[1] && y <= B[3];
  const classOf = (i) => {
    if (bg[i]) return -1;
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    // hueco interno = transparente; umbral 235 (no 250): los huecos del
    // cuadro/basculante son blanco SUAVE (235-249) y con 250 caían en
    // lightgray como islitas que el despeckle fundía al negro vecino
    if (r >= 235 && g >= 235 && b >= 235) return -1;
    let best = 0, bd = 1e9;
    for (let c = 0; c < CLASSES.length; c++) {
      if (!CLASSES[c].rgb) continue;
      const [cr, cg, cb] = CLASSES[c].rgb;
      const d = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
      if (d < bd) { bd = d; best = c; }
    }
    if (CLASSES[best].name === 'red') {
      const x = i % W, y = (i / W) | 0;
      if (inBox(x, y, TAIL)) return CLASSES.findIndex(c => c.name === 'taillight');
    }
    return best;
  };
  let cls = new Int8Array(W * H);
  for (let i = 0; i < W * H; i++) cls[i] = classOf(i);

  // ── mayoría 5×5 (2 pasadas), fondo con voto CALIFICADO ──
  const BGV = CLASSES.length;
  for (let pass = 0; pass < 2; pass++) {
    const src = Int8Array.from(cls);
    const votes = new Int16Array(CLASSES.length + 1);
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
        // el fondo solo gana con ≥60% de la ventana (no muerde rayos finos)
        if (votes[BGV] >= 15 && votes[BGV] > bv) best = BGV;
        cls[p] = best === BGV ? -1 : best;
      }
    }
  }

  // ── DESPECKLE por componentes entre clases NEUTRAS ──
  {
    const GRAY = ['black', 'tire', 'midgray', 'gray', 'silver', 'silver2', 'lightgray']
      .map(n => CLASSES.findIndex(c => c.name === n));
    const MIN_PX = 150;
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
      // láminas finas junto a huecos/fondo son piezas legítimas — no absorber
      if (borderN && bgTouch / borderN > 0.2) continue;
      let best = null, bv = -1;
      for (const [c, v] of votes) if (v > bv) { bv = v; best = c; }
      if (best === null) continue;
      for (const p of comp) cls[p] = best;
    }
  }

  const counts = new Array(CLASSES.length).fill(0);
  for (let i = 0; i < W * H; i++) if (cls[i] >= 0) counts[cls[i]]++;
  console.log('pixeles por clase:', CLASSES.map((c, i) => `${c.name}:${counts[i]}`).join(' '));

  // medidas para asentar la moto en el lienzo del componente
  let bottom = 0, left = W, right = 0;
  for (let i = 0; i < W * H; i++) {
    if (cls[i] < 0) continue;
    const x = i % W, y = (i / W) | 0;
    if (y > bottom) bottom = y;
    if (x < left) left = x;
    if (x > right) right = x;
  }
  console.log('bbox del arte: x', left, '-', right, ' fondo y =', bottom);

  // mapa de clases (debug)
  {
    const DBG = [[230,34,41],[40,40,46],[10,10,14],[100,102,110],[255,0,255],[0,160,160],[160,120,255],[0,255,0],[244,156,31],[255,255,0]];
    const img = Buffer.alloc(W * H * 3, 255);
    for (let i = 0; i < W * H; i++) {
      if (cls[i] < 0) continue;
      const c = DBG[cls[i]] || [0,0,0];
      img[i*3] = c[0]; img[i*3+1] = c[1]; img[i*3+2] = c[2];
    }
    await sharp(img, { raw: { width: W, height: H, channels: 3 } }).png().toFile(O + '/gn-cls-map.png');
  }

  // ── máscara por clase → potrace (dilatación 2px, SIN redondear) ──
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
  const traceOne = (name, ci) => new Promise((res, rej) => {
    let m = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) if (cls[i] === ci) m[i] = 1;
    m = dilate(m);
    const mask = Buffer.alloc(W * H * 3, 255);
    for (let i = 0; i < W * H; i++) if (m[i]) { mask[i * 3] = 0; mask[i * 3 + 1] = 0; mask[i * 3 + 2] = 0; }
    sharp(mask, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer().then(png => {
      potrace.trace(png, { turdSize: 40, alphaMax: 1.1, optTolerance: 0.35, threshold: 128 }, (err, svg) => {
        if (err) return rej(err);
        const paths = [...svg.matchAll(/d="([^"]+)"/g)].map(m2 => m2[1]);
        res({ name, paths });
      });
    }).catch(rej);
  });

  const results = [];
  for (let c = 0; c < CLASSES.length; c++) results.push(await traceOne(CLASSES[c].name, c));

  // ── SVG de verificación ──
  const FILL = { red: '#D61222', black: '#222326', tire: '#131415', midgray: '#666870', gray: '#98999C', silver: '#A9AAAD', silver2: '#BBBCBF', lightgray: '#CCCDD0', amber: '#F49C1F', taillight: '#D02427' };
  const ORDER = ['tire', 'black', 'midgray', 'gray', 'silver', 'silver2', 'lightgray', 'red', 'taillight', 'amber'];
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="#fff"/>`;
  for (const name of ORDER) {
    const r = results.find(x => x.name === name);
    for (const d of r.paths) svg += `<path d="${d}" fill="${FILL[name]}" fill-rule="evenodd"/>`;
  }
  svg += '</svg>';
  fs.writeFileSync(O + '/gn-trace.svg', svg);
  const sizes = results.map(r => `${r.name}:${r.paths.join('').length}ch`);
  console.log('trazado:', sizes.join('  '));
  await sharp(Buffer.from(svg)).resize({ width: 900 }).png().toFile(O + '/gn-trace-preview.png');

  // ── módulo para el componente ──
  let mod = '// src/components/ui/gnTrace.js\n';
  mod += '// GENERADO desde REFERENCIAS INTERFAZ/VEHÍCULOS/SUZUKI, GN125 y GN125F.png\n';
  mod += '// (1536×1024, capas dilatadas 2px) por vectorización de capas de color\n';
  mod += '// (potrace, pipeline E1.9g) — NO editar a mano; regenerar con el arnés\n';
  mod += '// de calco si el dueño renueva la referencia.\n';
  mod += 'export const GN_TRACE = {\n';
  for (const r of results) mod += `  ${r.name}: ${JSON.stringify(r.paths.join(' '))},\n`;
  mod += '};\n';
  fs.writeFileSync('C:/proyectos/club-turkaj/src/components/ui/gnTrace.js', mod);
  console.log('gnTrace.js escrito,', mod.length, 'chars');
})();
