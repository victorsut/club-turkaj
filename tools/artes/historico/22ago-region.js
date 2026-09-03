// Muestreo por REGIÓN: clusters de color dentro de una caja (sin excluir
// fondo — muestra también los near-white para calibrar umbrales).
const sharp = require('C:/proyectos/club-turkaj/node_modules/sharp');
const DIR = 'C:/proyectos/club-turkaj/REFERENCIAS INTERFAZ/VEHÍCULOS/MOTOS/';
const [file, x1, y1, x2, y2] = process.argv.slice(2);
const B = [x1, y1, x2, y2].map(Number);

(async () => {
  const { data, info } = await sharp(DIR + file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const Q = 8;
  const map = new Map();
  for (let y = B[1]; y <= B[3]; y++) {
    for (let x = B[0]; x <= B[2]; x++) {
      const i = y * W + x;
      const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
      const k = `${Math.round(r / Q) * Q},${Math.round(g / Q) * Q},${Math.round(b / Q) * Q}`;
      let e = map.get(k);
      if (!e) { e = { n: 0, sr: 0, sg: 0, sb: 0, x1: 1e9, y1: 1e9, x2: 0, y2: 0 }; map.set(k, e); }
      e.n++; e.sr += r; e.sg += g; e.sb += b;
      if (x < e.x1) e.x1 = x; if (x > e.x2) e.x2 = x;
      if (y < e.y1) e.y1 = y; if (y > e.y2) e.y2 = y;
    }
  }
  const rows = [...map.values()].map(e => ({
    n: e.n,
    rgb: [Math.round(e.sr / e.n), Math.round(e.sg / e.n), Math.round(e.sb / e.n)],
    bbox: [e.x1, e.y1, e.x2, e.y2],
  })).sort((a, b) => b.n - a.n).slice(0, 14);
  console.log(`${file} región [${B.join(',')}]:`);
  for (const r of rows) console.log(`  rgb(${r.rgb.join(',')})  n=${r.n}  bbox=[${r.bbox.join(',')}]`);
})();
