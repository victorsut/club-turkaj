// Blancos ENCERRADOS (no alcanzables por el flood del fondo): faros de los
// moto taxis y huecos internos. Uso: node encerrados9.cjs "<ref>" [th]
const sharp = require('C:/proyectos/club-turkaj/node_modules/sharp');
const DIR = 'C:/proyectos/club-turkaj/REFERENCIAS INTERFAZ/VEHÍCULOS/';

(async () => {
  const file = process.argv[2], TH = +(process.argv[3] || 235);
  const { data, info } = await sharp(DIR + file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const isW = (i) => data[i * 4] >= TH && data[i * 4 + 1] >= TH && data[i * 4 + 2] >= TH;
  const bg = new Uint8Array(W * H);
  const st = [];
  for (let x = 0; x < W; x++) st.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) st.push(y * W, y * W + W - 1);
  while (st.length) {
    const p = st.pop();
    if (bg[p] || !isW(p)) continue;
    bg[p] = 1;
    const x = p % W, y = (p / W) | 0;
    if (x > 0) st.push(p - 1);
    if (x < W - 1) st.push(p + 1);
    if (y > 0) st.push(p - W);
    if (y < H - 1) st.push(p + W);
  }
  const seen = new Uint8Array(W * H);
  const comps = [];
  for (let s = 0; s < W * H; s++) {
    if (!isW(s) || bg[s] || seen[s]) continue;
    const stk = [s]; seen[s] = 1;
    const c = { n: 0, sx: 0, sy: 0, x0: W, y0: H, x1: 0, y1: 0 };
    while (stk.length) {
      const p = stk.pop(); c.n++;
      const x = p % W, y = (p / W) | 0;
      c.sx += x; c.sy += y;
      if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x;
      if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
      for (const [q, ok] of [[p - 1, x > 0], [p + 1, x < W - 1], [p - W, y > 0], [p + W, y < H - 1]]) {
        if (ok && isW(q) && !bg[q] && !seen[q]) { seen[q] = 1; stk.push(q); }
      }
    }
    if (c.n >= 60) comps.push(c);
  }
  comps.sort((a, b) => b.n - a.n);
  for (const c of comps.slice(0, 20)) {
    console.log(String(c.n).padStart(8) + 'px', `c(${Math.round(c.sx / c.n)},${Math.round(c.sy / c.n)})`.padEnd(14), `bbox[${c.x0},${c.y0},${c.x1},${c.y1}]`);
  }
})();
