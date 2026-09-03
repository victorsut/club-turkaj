// Detecta piezas ÁMBAR (naranja) por modelo: componentes >=120px
const sharp = require('C:/proyectos/club-turkaj/node_modules/sharp');
const DIR = 'C:/proyectos/club-turkaj/REFERENCIAS INTERFAZ/VEHÍCULOS/';
const files = {
  civic: 'AUTOS LIVIANOS/HONDA, CIVIC.png', accent: 'AUTOS LIVIANOS/HYUNDAI, ACCENT.png',
  picanto: 'AUTOS LIVIANOS/KIA, PICANTO.png', rio: 'AUTOS LIVIANOS/KIA, RIO.png',
  mazda3: 'AUTOS LIVIANOS/MAZDA, MAZDA 3.png', corolla: 'AUTOS LIVIANOS/TOYOTA, COROLLA.png',
  yaris: 'AUTOS LIVIANOS/TOYOTA, YARIS.png', xb: 'AUTOS LIVIANOS/SCION, XB.png',
  xd: 'AUTOS LIVIANOS/SCION, XD.png', crv: 'SUV/HONDA, CR-V.png',
  tucson: 'SUV/HYUNDAI, TUCSON.png', sportage: 'SUV/KIA, SPORTAGE.png',
  cx5: 'SUV/MAZDA, CX-5.png', runner: 'SUV/TOYOTA, 4RUNNER.png', rav4: 'SUV/TOYOTA, RAV4.png',
};
(async () => {
  for (const [k, f] of Object.entries(files)) {
    const { data, info } = await sharp(DIR + f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const W = info.width, H = info.height;
    const isA = (i) => {
      const r = data[i*4], g = data[i*4+1], b = data[i*4+2];
      return r > 170 && g > 95 && g < 190 && b < 120 && (r - g) > 35 && (g - b) > 30;
    };
    const seen = new Uint8Array(W*H);
    const out = [];
    for (let s = 0; s < W*H; s++) {
      if (seen[s] || !isA(s)) continue;
      let n = 0, x1 = W, y1 = H, x2 = 0, y2 = 0, sr = 0, sg = 0, sb = 0;
      const st = [s]; seen[s] = 1;
      while (st.length) {
        const p = st.pop(); n++;
        sr += data[p*4]; sg += data[p*4+1]; sb += data[p*4+2];
        const x = p % W, y = (p/W)|0;
        if (x<x1)x1=x; if (x>x2)x2=x; if (y<y1)y1=y; if (y>y2)y2=y;
        for (const [q,ok] of [[p-1,x>0],[p+1,x<W-1],[p-W,y>0],[p+W,y<H-1]])
          if (ok && !seen[q] && isA(q)) { seen[q]=1; st.push(q); }
      }
      if (n >= 120) out.push({n, box:[x1,y1,x2,y2], rgb:[Math.round(sr/n),Math.round(sg/n),Math.round(sb/n)]});
    }
    out.sort((a,b)=>b.n-a.n);
    console.log(k + ':', out.length ? out.slice(0,4).map(c=>`n=${c.n} rgb(${c.rgb}) [${c.box}]`).join(' | ') : 'sin ambar');
  }
})();
