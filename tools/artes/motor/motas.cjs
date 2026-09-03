// Detector de MOTAS CLARAS del arte (E1.23b): pixeles del trace con tono
// claro (>=200) donde la referencia NO tiene pieza clara — o es fondo
// (silueta: el arte no debería pintar) o es pieza OSCURA (<150).
// Sobre la tarjeta clara del app esas motas leen como "manchas blancas".
// Uso: node motas.cjs <key>
const sharp = require('C:/proyectos/club-turkaj/node_modules/sharp');
const fs = require('fs');
const { MODELS } = require('./trace-mix.cjs');
const DIR = 'C:/proyectos/club-turkaj/REFERENCIAS INTERFAZ/VEHÍCULOS/';
const O = __dirname;
(async () => {
  const key = process.argv[2];
  const M = MODELS[key];
  // el SVG del arnés trae rect de fondo — lo quitamos para tener alpha real
  let svg = fs.readFileSync(`${O}/${key}-trace.svg`, 'utf8');
  svg = svg.replace(/<rect[^/]*\/>/, '');
  const art = await sharp(Buffer.from(svg)).resize({ width: 1536 }).raw().toBuffer({ resolveWithObject: true });
  const A = art.data, CH = art.info.channels;
  const ref = await sharp(DIR + M.file).flatten({ background: '#fff' }).removeAlpha().raw().toBuffer();
  const W = 1536, H = 1024;
  const mask = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const a = CH === 4 ? A[i * 4 + 3] : 255;
    if (a < 128) continue;
    const av = Math.min(A[i * CH], A[i * CH + 1], A[i * CH + 2]);
    if (av < 200) continue; // solo tinta CLARA del arte
    const r = ref[i * 3], g = ref[i * 3 + 1], b = ref[i * 3 + 2];
    const refBg = r >= 244 && g >= 244 && b >= 244;
    const refDark = Math.max(r, g, b) < 150;
    if (refBg || refDark) mask[i] = 1;
  }
  // componentes
  const seen = new Uint8Array(W * H);
  const comps = [];
  for (let s = 0; s < W * H; s++) {
    if (!mask[s] || seen[s]) continue;
    const st = [s]; seen[s] = 1;
    const c = { n: 0, x0: W, y0: H, x1: 0, y1: 0 };
    while (st.length) {
      const p = st.pop(); c.n++;
      const x = p % W, y = (p / W) | 0;
      if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x;
      if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
      for (const [q, ok] of [[p - 1, x > 0], [p + 1, x < W - 1], [p - W, y > 0], [p + W, y < H - 1]]) {
        if (ok && mask[q] && !seen[q]) { seen[q] = 1; st.push(q); }
      }
    }
    if (c.n >= 30) comps.push(c);
  }
  comps.sort((a, b) => b.n - a.n);
  let tot = 0; for (const c of comps) tot += c.n;
  console.log(`${key}: ${comps.length} motas claras >=30px, total ${tot}px`);
  for (const c of comps.slice(0, 20)) console.log(String(c.n).padStart(7) + 'px', `bbox[${c.x0},${c.y0},${c.x1},${c.y1}]`);
  // mapa visual: arte sobre tarjeta OSCURA con las motas en magenta
  const img = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H; i++) {
    const a = CH === 4 ? A[i * 4 + 3] : 255;
    if (a < 128) { img[i * 3] = 0x23; img[i * 3 + 1] = 0x24; img[i * 3 + 2] = 0x28; continue; }
    if (mask[i]) { img[i * 3] = 255; img[i * 3 + 1] = 0; img[i * 3 + 2] = 200; continue; }
    img[i * 3] = A[i * CH]; img[i * 3 + 1] = A[i * CH + 1]; img[i * 3 + 2] = A[i * CH + 2];
  }
  await sharp(img, { raw: { width: W, height: H, channels: 3 } }).resize({ width: 900 }).png().toFile(`${O}/${key}-motas.png`);
})();
