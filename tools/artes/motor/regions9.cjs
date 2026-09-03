// Componentes conexos por familia de color — para medir calaveras rojas,
// ámbares, faros claros y rines de la tanda 9.
// Uso: node regions9.cjs "<ref>" <red|amber|light|blue> [minPx]
const sharp = require('C:/proyectos/club-turkaj/node_modules/sharp');
const DIR = 'C:/proyectos/club-turkaj/REFERENCIAS INTERFAZ/VEHÍCULOS/';

const FAM = {
  red:   (r, g, b) => r - g > 70 && r - b > 70 && g < 120,
  amber: (r, g, b) => r > 150 && g > 70 && g < 200 && b < 100 && r - g > 40 && g - b > 30,
  light: (r, g, b) => r >= 198 && g >= 198 && b >= 198,
  blue:  (r, g, b) => b - r > 25 && b > 150,
};

(async () => {
  const file = process.argv[2], fam = FAM[process.argv[3]], MIN = +(process.argv[4] || 150);
  const { data, info } = await sharp(DIR + file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  // fondo: color de la esquina — un pixel de familia que EMPATA con fondo se salta
  const bg = [data[(2 * W + 2) * 4], data[(2 * W + 2) * 4 + 1], data[(2 * W + 2) * 4 + 2]];
  const isBgLike = (r, g, b) => Math.abs(r - bg[0]) < 14 && Math.abs(g - bg[1]) < 14 && Math.abs(b - bg[2]) < 14;
  const m = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    if (fam(r, g, b) && !isBgLike(r, g, b)) m[i] = 1;
  }
  const seen = new Uint8Array(W * H);
  const comps = [];
  for (let s = 0; s < W * H; s++) {
    if (!m[s] || seen[s]) continue;
    const st = [s]; seen[s] = 1;
    const c = { n: 0, sx: 0, sy: 0, x0: W, y0: H, x1: 0, y1: 0, r: 0, g: 0, b: 0 };
    while (st.length) {
      const p = st.pop(); c.n++;
      const x = p % W, y = (p / W) | 0;
      c.sx += x; c.sy += y;
      c.r += data[p * 4]; c.g += data[p * 4 + 1]; c.b += data[p * 4 + 2];
      if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x;
      if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
      for (const [q, ok] of [[p - 1, x > 0], [p + 1, x < W - 1], [p - W, y > 0], [p + W, y < H - 1]]) {
        if (ok && m[q] && !seen[q]) { seen[q] = 1; st.push(q); }
      }
    }
    if (c.n >= MIN) comps.push(c);
  }
  comps.sort((a, b) => b.n - a.n);
  for (const c of comps.slice(0, 25)) {
    console.log(
      String(c.n).padStart(8) + 'px',
      `c(${Math.round(c.sx / c.n)},${Math.round(c.sy / c.n)})`.padEnd(14),
      `bbox[${c.x0},${c.y0},${c.x1},${c.y1}]`.padEnd(28),
      `rgb(${Math.round(c.r / c.n)},${Math.round(c.g / c.n)},${Math.round(c.b / c.n)})`
    );
  }
})();
