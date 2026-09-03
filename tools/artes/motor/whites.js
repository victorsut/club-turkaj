// Componentes de casi-blanco (>=th, no fondo) = candidatos a whiteBox.
// El blanco de pieza de los autos (faros ~251) EMPATA con el fondo: solo
// se separan espacialmente. Uso: node whites.js "SUB/ARCHIVO.png" [th]
const sharp = require('C:/proyectos/club-turkaj/node_modules/sharp');
const DIR = 'C:/proyectos/club-turkaj/REFERENCIAS INTERFAZ/VEHÍCULOS/';
const file = process.argv[2];
const TH = +(process.argv[3] || 235);
(async () => {
  const { data, info } = await sharp(DIR + file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const isW = (i) => data[i*4] >= TH && data[i*4+1] >= TH && data[i*4+2] >= TH;
  const bg = new Uint8Array(W * H);
  const stack = [];
  for (let x = 0; x < W; x++) stack.push(x, (H-1)*W + x);
  for (let y = 0; y < H; y++) stack.push(y*W, y*W + W - 1);
  while (stack.length) {
    const p = stack.pop();
    if (bg[p] || !isW(p)) continue;
    bg[p] = 1;
    const x = p % W, y = (p / W) | 0;
    if (x > 0) stack.push(p-1);
    if (x < W-1) stack.push(p+1);
    if (y > 0) stack.push(p-W);
    if (y < H-1) stack.push(p+W);
  }
  const seen = new Uint8Array(W * H);
  const comps = [];
  for (let s = 0; s < W*H; s++) {
    if (seen[s] || bg[s] || !isW(s)) continue;
    let n = 0, x1 = W, y1 = H, x2 = 0, y2 = 0, sr = 0;
    const st = [s]; seen[s] = 1;
    while (st.length) {
      const p = st.pop();
      n++; sr += data[p*4];
      const x = p % W, y = (p / W) | 0;
      if (x < x1) x1 = x; if (x > x2) x2 = x;
      if (y < y1) y1 = y; if (y > y2) y2 = y;
      for (const [q, ok] of [[p-1,x>0],[p+1,x<W-1],[p-W,y>0],[p+W,y<H-1]]) {
        if (ok && !seen[q] && !bg[q] && isW(q)) { seen[q] = 1; st.push(q); }
      }
    }
    if (n >= 250) comps.push({ n, box: [x1, y1, x2, y2], avg: Math.round(sr/n) });
  }
  comps.sort((a, b) => b.n - a.n);
  console.log(file, '— componentes casi-blancos >=250px (th', TH + '):');
  for (const c of comps.slice(0, 20)) console.log(`  n=${c.n} avg=${c.avg} box=[${c.box.join(',')}]`);
})();
