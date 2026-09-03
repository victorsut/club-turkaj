// Muestreo de anclas: colores dominantes (cuantizados) de la referencia
// excluyendo fondo near-white, con conteo + bbox + centroide.
const sharp = require('C:/proyectos/club-turkaj/node_modules/sharp');
const DIR = 'C:/proyectos/club-turkaj/REFERENCIAS INTERFAZ/VEHÍCULOS/MOTOS/';
const file = process.argv[2];

(async () => {
  const { data, info } = await sharp(DIR + file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  // flood fill del fondo (mismo criterio del arnés)
  const isWhite = (i) => data[i * 4] > 235 && data[i * 4 + 1] > 235 && data[i * 4 + 2] > 235;
  const bg = new Uint8Array(W * H);
  const stack = [];
  for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
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
  const Q = 10; // paso de cuantización
  const map = new Map();
  for (let i = 0; i < W * H; i++) {
    if (bg[i]) continue;
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const k = `${Math.round(r / Q) * Q},${Math.round(g / Q) * Q},${Math.round(b / Q) * Q}`;
    let e = map.get(k);
    if (!e) { e = { n: 0, sr: 0, sg: 0, sb: 0, x1: W, y1: H, x2: 0, y2: 0, sx: 0, sy: 0 }; map.set(k, e); }
    const x = i % W, y = (i / W) | 0;
    e.n++; e.sr += r; e.sg += g; e.sb += b; e.sx += x; e.sy += y;
    if (x < e.x1) e.x1 = x; if (x > e.x2) e.x2 = x;
    if (y < e.y1) e.y1 = y; if (y > e.y2) e.y2 = y;
  }
  const rows = [...map.entries()].map(([k, e]) => ({
    k, n: e.n,
    rgb: [Math.round(e.sr / e.n), Math.round(e.sg / e.n), Math.round(e.sb / e.n)],
    bbox: [e.x1, e.y1, e.x2, e.y2],
    c: [Math.round(e.sx / e.n), Math.round(e.sy / e.n)],
  })).sort((a, b) => b.n - a.n).filter(r => r.n > 800);
  console.log(file, W + 'x' + H, '— clusters >800px:');
  for (const r of rows) {
    console.log(`  rgb(${r.rgb.join(',')})  n=${r.n}  bbox=[${r.bbox.join(',')}]  centro=(${r.c.join(',')})`);
  }
})();
