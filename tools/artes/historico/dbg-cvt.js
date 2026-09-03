// Localiza el aro del CVT: componentes de gris (#3A-4A) en la zona motor.
const sharp = require('C:/proyectos/club-turkaj/node_modules/sharp');
const F = 'C:/proyectos/club-turkaj/REFERENCIAS INTERFAZ/VEHÍCULOS/HONDA, NAVI.png';

(async () => {
  const { data, info } = await sharp(F).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const isGray = (x, y) => {
    const i = (y * W + x) * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    return r > 44 && r < 96 && Math.abs(r - g) < 12 && Math.abs(g - b) < 14 && b >= r;
  };
  const X1 = 480, Y1 = 580, X2 = 850, Y2 = 950;
  const seen = new Set(), comps = [];
  for (let y = Y1; y < Y2; y++) for (let x = X1; x < X2; x++) {
    const k = y * W + x;
    if (seen.has(k) || !isGray(x, y)) continue;
    const st = [k]; seen.add(k);
    let n = 0, minx = 1e9, maxx = 0, miny = 1e9, maxy = 0;
    while (st.length) {
      const p = st.pop(); n++;
      const px = p % W, py = (p / W) | 0;
      minx = Math.min(minx, px); maxx = Math.max(maxx, px);
      miny = Math.min(miny, py); maxy = Math.max(maxy, py);
      for (const q of [p - 1, p + 1, p - W, p + W]) {
        const qx = q % W, qy = (q / W) | 0;
        if (qx < X1 || qx >= X2 || qy < Y1 || qy >= Y2) continue;
        if (seen.has(q) || !isGray(qx, qy)) continue;
        seen.add(q); st.push(q);
      }
    }
    if (n > 400) comps.push({ n, cx: (minx + maxx) / 2, cy: (miny + maxy) / 2, w: maxx - minx, h: maxy - miny });
  }
  comps.sort((a, b) => b.n - a.n);
  for (const c of comps.slice(0, 8)) console.log('n=', c.n, 'centro=', c.cx.toFixed(0), c.cy.toFixed(0), 'tam=', c.w, 'x', c.h);
})();
