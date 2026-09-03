// Vectoriza la referencia de la Navi por CAPAS DE COLOR (cero interpretación):
// 1) histograma para conocer los colores planos reales
// 2) flood-fill desde los bordes para separar el FONDO blanco del lente blanco
// 3) máscara binaria por clase de color → potrace → path SVG
// 4) SVG combinado de verificación + JSON con los paths por clase
const sharp = require('C:/proyectos/club-turkaj/node_modules/sharp');
const potrace = require('C:/Users/gasol/AppData/Local/Temp/claude/C--proyectos-club-turkaj/28aa1b05-a99c-469f-946b-6aef7d919aca/scratchpad/node_modules/potrace');
const fs = require('fs');

const F = 'C:/proyectos/club-turkaj/REFERENCIAS INTERFAZ/VEHÍCULOS/HONDA, NAVI.png';
const O = __dirname;

(async () => {
  // resolución COMPLETA: bordes lisos (el dueño reportó bordes rasgados a 768)
  const { data, info } = await sharp(F).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;

  // ── histograma grueso (cuantiza a /16) ──
  const hist = new Map();
  for (let i = 0; i < W * H; i++) {
    const r = data[i * 4] >> 4, g = data[i * 4 + 1] >> 4, b = data[i * 4 + 2] >> 4;
    const k = (r << 8) | (g << 4) | b;
    hist.set(k, (hist.get(k) || 0) + 1);
  }
  const top = [...hist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14)
    .map(([k, n]) => `#${((k >> 8) & 15).toString(16)}${((k >> 4) & 15).toString(16)}${(k & 15).toString(16)} x${n}`);
  console.log('top colores (cuantizados):', top.join('  '));

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

  // ── clases de color (anclas RGB aproximadas; se asigna la más cercana) ──
  const CLASSES = [
    { name: 'red',      rgb: [230, 34, 41] },
    { name: 'darkred',  rgb: [190, 22, 28] },
    { name: 'black',    rgb: [34, 35, 42] },
    // E1.9e: tonos MEDIDOS de la referencia que antes se fundían con black
    // (por eso los rines/CVT se veían planos y se había inventado un kit
    // de profundidad que quedaba fuera de lugar). Con clase propia, rines,
    // mazas, horquilla, CVT y cárter quedan CALCADOS en posición exacta y
    // con la oclusión correcta por píxel.
    { name: 'engray',   rgb: [40, 42, 44] },  // bloque motor, cara cárter, mazas
    { name: 'wheelgray',rgb: [45, 46, 48] },  // aro/disco de rines, horquilla, cara CVT
    { name: 'darkgray', rgb: [58, 58, 64] },
    { name: 'midgray',  rgb: [76, 77, 84] },
    { name: 'white',    rgb: [238, 238, 236] },
    { name: 'amber',    rgb: [244, 156, 31] },
    { name: 'spring',   rgb: null },  // rojo FIJO (región del amortiguador)
    { name: 'taillight',rgb: null },  // rojo FIJO (calavera)
  ];
  // caja del resorte MEDIDA por componentes (dbg-spring.js): peldaños en
  // x 323-408, y 508-616
  const SPRING = [315, 500, 415, 625], TAIL = [138, 348, 218, 434]; // x1,y1,x2,y2
  const MIRROR = [880, 85, 1025, 225], LENSBOX = [1260, 290, 1380, 540];
  const inBox = (x, y, B) => x >= B[0] && x <= B[2] && y >= B[1] && y <= B[3];
  const classOf = (i) => {
    if (bg[i]) return -1;
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    if (r >= 250 && g >= 250 && b >= 250) return -1; // hueco interno = transparente
    let best = 0, bd = 1e9;
    for (let c = 0; c < CLASSES.length; c++) {
      if (!CLASSES[c].rgb) continue;
      const [cr, cg, cb] = CLASSES[c].rgb;
      const d = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
      if (d < bd) { bd = d; best = c; }
    }
    if (CLASSES[best].name === 'red' || CLASSES[best].name === 'darkred') {
      const x = i % W, y = (i / W) | 0;
      // el RESORTE se separa después por COMPONENTES (aquí solo la cola)
      if (inBox(x, y, TAIL)) return CLASSES.findIndex(c => c.name === 'taillight');
    }
    if (CLASSES[best].name === 'white') {
      // el blanco SOLO existe en el espejo y el lente del faro; el resto
      // de claros son fondo encerrado → transparente
      const x = i % W, y = (i / W) | 0;
      if (!inBox(x, y, MIRROR) && !inBox(x, y, LENSBOX)) return -1;
    }
    return best;
  };
  let cls = new Int8Array(W * H);
  for (let i = 0; i < W * H; i++) cls[i] = classOf(i);

  // Filtro de MAYORÍA 5×5 (2 pasadas): los píxeles del anti-aliasing
  // adoptan la clase dominante del vecindario — sin él, cada borde
  // genera contornos fantasma en las capas intermedias.
  // E1.9e: el FONDO también VOTA (índice CLASSES.length). Sin su voto, la
  // franja de halo anti-alias entre la moto y el fondo blanco ganaba como
  // midgray y sobrevivía como cadenas de MOTAS grises punteadas siguiendo
  // los bordes de llantas y guardafangos (visibles sobre tarjeta negra,
  // POR CORREGIR/img1.png del 19-ago).
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
        for (let c = 0; c <= BGV; c++) if (votes[c] > bv) { bv = votes[c]; best = c; }
        cls[p] = best === BGV ? -1 : best;
      }
    }
  }
  // ── RESORTE por COMPONENTES CONEXOS: solo los componentes rojos cuyo
  // 85%+ cae dentro de la caja del resorte pasan a rojo FIJO — el panel
  // rojo del cuerpo que roza la caja ya NO deja esquirlas rojas fijas.
  const RED_I = CLASSES.findIndex(c => c.name === 'red');
  const SPRING_I = CLASSES.findIndex(c => c.name === 'spring');
  {
    // etiquetado LOCAL dentro de la caja del resorte: un componente rojo
    // es resorte si NO toca el borde de la caja (lo que entra desde
    // afuera —el panel del cuerpo— toca el borde y queda excluido)
    const [bx1, by1, bx2, by2] = SPRING;
    const seen = new Uint8Array(W * H);
    for (let sy = by1; sy <= by2; sy++) {
      for (let sx = bx1; sx <= bx2; sx++) {
        const start = sy * W + sx;
        if (seen[start] || cls[start] !== RED_I) continue;
        const comp = [];
        const st = [start]; seen[start] = 1;
        let touchesEdge = false;
        while (st.length) {
          const p = st.pop();
          comp.push(p);
          const x = p % W, y = (p / W) | 0;
          if (x <= bx1 || x >= bx2 || y <= by1 || y >= by2) touchesEdge = true;
          for (const q of [p - 1, p + 1, p - W, p + W]) {
            const qx = q % W, qy = (q / W) | 0;
            if (!inBox(qx, qy, SPRING) || seen[q] || cls[q] !== RED_I) continue;
            seen[q] = 1; st.push(q);
          }
        }
        if (!touchesEdge) for (const p of comp) cls[p] = SPRING_I;
      }
    }
  }

  // E1.9g: DESPECKLE por COMPONENTES entre clases grises — en zonas de
  // tono intermedio (timón, horquilla, punta del escape) la clasificación
  // parpadea entre grises vecinos y deja islas moteadas que potrace traza
  // con bordes rasgados. Toda componente gris < MIN_PX se reasigna a la
  // clase vecina dominante; si la vecina dominante es el FONDO se deja
  // (piezas chicas legítimas que sobresalen, p.ej. la punta del escape).
  {
    const GRAY = ['black', 'engray', 'wheelgray', 'darkgray', 'midgray']
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
      // vecinos del borde: solo cuentan OTRAS clases GRISES — absorber a
      // rojo/ámbar/blanco muerde piezas legítimas (el brazo del espejo se
      // tragó al aro rojo en la 1ª versión); si no hay vecino gris, se queda
      const votes = new Map();
      for (const p of comp) {
        const x = p % W, y = (p / W) | 0;
        for (const [q, ok] of [[p - 1, x > 0], [p + 1, x < W - 1], [p - W, y > 0], [p + W, y < H - 1]]) {
          if (!ok) continue;
          const c = cls[q];
          if (c !== ci && GRAY.includes(c)) votes.set(c, (votes.get(c) || 0) + 1);
        }
      }
      let best = null, bv = -1;
      for (const [c, v] of votes) if (v > bv) { bv = v; best = c; }
      if (best === null) continue; // sin vecino gris (aislada / junto a color)
      for (const p of comp) cls[p] = best;
    }
  }

  const counts = new Array(CLASSES.length).fill(0);
  for (let i = 0; i < W * H; i++) if (cls[i] >= 0) counts[cls[i]]++;
  console.log('pixeles por clase:', CLASSES.map((c, i) => `${c.name}:${counts[i]}`).join(' '));

  // DEBUG: mapa de clases como imagen (hueco=blanco puro)
  {
    const DBG = [[230,34,41],[190,22,28],[40,40,46],[0,160,160],[160,120,255],[80,80,90],[120,121,130],[200,220,255],[244,156,31],[255,0,255],[0,255,0]];
    const img = Buffer.alloc(W * H * 3, 255);
    for (let i = 0; i < W * H; i++) {
      if (cls[i] < 0) continue;
      const c = DBG[cls[i]] || [0,0,0];
      img[i*3] = c[0]; img[i*3+1] = c[1]; img[i*3+2] = c[2];
    }
    await sharp(img, { raw: { width: W, height: H, channels: 3 } }).png().toFile(O + '/cls-map.png');
    await sharp(O + '/cls-map.png').extract({ left: 940, top: 470, width: 220, height: 320 }).resize({ width: 440 }).toFile(O + '/zone-cls.png');
  }

  // ── máscara por clase → potrace ──
  // ⚠️ NO redondear: potrace emite comandos RELATIVOS y redondear cada
  // delta ACUMULA deriva a lo largo del path (los "elementos movidos"
  // que reportó el dueño). Se conserva la precisión original.
  const round0 = (d) => d;
  // Dilatación de 2px por capa: las capas vecinas se SOLAPAN y el orden
  // de pintado esconde las costuras del anti-aliasing (piezas "flotantes"
  // y filos rasgados que reportó el dueño).
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
        const paths = [...svg.matchAll(/d="([^"]+)"/g)].map(m2 => round0(m2[1]));
        res({ name, paths });
      });
    }).catch(rej);
  });

  const results = [];
  for (let c = 0; c < CLASSES.length; c++) results.push(await traceOne(CLASSES[c].name, c));

  // ── SVG combinado de verificación (orden de pintado por capas) ──
  const FILL = { red: '#E62229', darkred: '#BE161C', black: '#26262A', engray: '#282A2C', wheelgray: '#2D2E31', darkgray: '#3A3A40', midgray: '#4A4B52', white: '#F2F2F0', amber: '#F49C1F', spring: '#E02A28', taillight: '#D02427' };
  const ORDER = ['black', 'engray', 'wheelgray', 'darkgray', 'midgray', 'darkred', 'red', 'spring', 'taillight', 'white', 'amber'];
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="#fff"/>`;
  for (const name of ORDER) {
    const r = results.find(x => x.name === name);
    for (const d of r.paths) svg += `<path d="${d}" fill="${FILL[name]}" fill-rule="evenodd"/>`;
  }
  svg += '</svg>';
  fs.writeFileSync(O + '/navi-trace.svg', svg);
  const sizes = results.map(r => `${r.name}:${r.paths.length}p/${r.paths.join('').length}ch`);
  console.log('trazado:', sizes.join('  '));
  await sharp(Buffer.from(svg)).resize({ width: 900 }).png().toFile(O + '/navi-trace-preview.png');

  // ── módulo de paths para el componente ──
  let mod = '// src/components/ui/naviTrace.js\n';
  mod += '// GENERADO desde REFERENCIAS INTERFAZ/VEHÍCULOS/HONDA, NAVI.png (1536×1024,\n'
  mod += '// capas dilatadas 2px para que el orden de pintado esconda costuras)\n';
  mod += '// por vectorización de capas de color (potrace) — NO editar a mano;\n';
  mod += '// regenerar con el arnés de calco si el dueño renueva la referencia.\n';
  mod += 'export const NAVI_TRACE = {\n';
  for (const r of results) mod += `  ${r.name}: ${JSON.stringify(r.paths.join(' '))},\n`;
  mod += '};\n';
  fs.writeFileSync('C:/proyectos/club-turkaj/src/components/ui/naviTrace.js', mod);
  console.log('naviTrace.js escrito,', mod.length, 'chars');
})();
