// Depura la zona del resorte: componentes rojos alrededor de la caja.
const sharp = require('C:/proyectos/club-turkaj/node_modules/sharp');
const F = 'C:/proyectos/club-turkaj/REFERENCIAS INTERFAZ/VEHÍCULOS/HONDA, NAVI.png';

(async () => {
  const { data, info } = await sharp(F).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const isRed = (x, y) => {
    const i = (y * W + x) * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    return r > 150 && g < 110 && b < 110;
  };
  // componentes rojos en zona amplia del resorte
  const X1 = 300, Y1 = 460, X2 = 600, Y2 = 850;
  const seen = new Set();
  const comps = [];
  for (let y = Y1; y < Y2; y++) for (let x = X1; x < X2; x++) {
    const k = y * W + x;
    if (seen.has(k) || !isRed(x, y)) continue;
    const st = [k]; seen.add(k);
    let n = 0, minx = 1e9, maxx = 0, miny = 1e9, maxy = 0;
    while (st.length) {
      const p = st.pop(); n++;
      const px = p % W, py = (p / W) | 0;
      minx = Math.min(minx, px); maxx = Math.max(maxx, px);
      miny = Math.min(miny, py); maxy = Math.max(maxy, py);
      for (const q of [p - 1, p + 1, p - W, p + W, p - W - 1, p - W + 1, p + W - 1, p + W + 1]) {
        const qx = q % W, qy = (q / W) | 0;
        if (qx < X1 - 50 || qx > X2 + 50 || qy < Y1 - 50 || qy > Y2 + 50) continue;
        if (seen.has(q) || !isRed(qx, qy)) continue;
        seen.add(q); st.push(q);
      }
    }
    if (n > 30) comps.push({ n, bbox: [minx, miny, maxx, maxy] });
  }
  comps.sort((a, b) => b.n - a.n);
  for (const c of comps.slice(0, 15)) console.log('n=', c.n, 'bbox=', c.bbox.join(','));
})();
