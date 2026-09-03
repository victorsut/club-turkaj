// Componentes CLAROS (th1..th2) — separa el RIN (encerrado por la llanta)
// de la sombra de piso (conectada al área abierta): imprime bbox de cada
// componente >=800px. Uso: node rims.js "SUB/FILE.png" [th1] [th2]
const sharp = require('C:/proyectos/club-turkaj/node_modules/sharp');
const DIR = 'C:/proyectos/club-turkaj/REFERENCIAS INTERFAZ/VEHÍCULOS/';
const file = process.argv[2];
const T1 = +(process.argv[3] || 195), T2 = +(process.argv[4] || 240);
(async () => {
  const { data, info } = await sharp(DIR + file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const ok = (i) => {
    const r = data[i*4], g = data[i*4+1], b = data[i*4+2];
    return r >= T1 && r < T2 && g >= T1 && g < T2 && b >= T1 && b < T2 && Math.abs(r-g) < 12 && Math.abs(g-b) < 12;
  };
  const seen = new Uint8Array(W*H);
  const out = [];
  for (let s = 0; s < W*H; s++) {
    if (seen[s] || !ok(s)) continue;
    let n = 0, x1 = W, y1 = H, x2 = 0, y2 = 0;
    const st = [s]; seen[s] = 1;
    while (st.length) {
      const p = st.pop();
      n++;
      const x = p % W, y = (p/W)|0;
      if (x<x1) x1=x; if (x>x2) x2=x; if (y<y1) y1=y; if (y>y2) y2=y;
      for (const [q,okk] of [[p-1,x>0],[p+1,x<W-1],[p-W,y>0],[p+W,y<H-1]])
        if (okk && !seen[q] && ok(q)) { seen[q]=1; st.push(q); }
    }
    if (n >= 800) out.push({n, box:[x1,y1,x2,y2]});
  }
  out.sort((a,b)=>b.n-a.n);
  for (const c of out.slice(0,12)) console.log(`  n=${c.n} box=[${c.box.join(',')}]`);
})();
