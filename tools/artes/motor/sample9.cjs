// Muestreo de anclas para la tanda 9 (micro bus / moto taxis / camión ligero).
// Uso: node sample9.js "<ruta relativa a VEHÍCULOS/>" [x1 y1 x2 y2]
// Imprime: tamaño, color de fondo (esquinas), y top colores EXACTOS con
// conteo + centroide + bbox (agrupados por celda RGB/8 para absorber ruido).
const sharp = require('C:/proyectos/club-turkaj/node_modules/sharp');
const DIR = 'C:/proyectos/club-turkaj/REFERENCIAS INTERFAZ/VEHÍCULOS/';

(async () => {
  const file = process.argv[2];
  const box = process.argv.length >= 7 ? process.argv.slice(3, 7).map(Number) : null;
  const { data, info } = await sharp(DIR + file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const px = (x, y) => [data[(y * W + x) * 4], data[(y * W + x) * 4 + 1], data[(y * W + x) * 4 + 2]];
  console.log(file, W + 'x' + H, 'esquinas:', JSON.stringify([px(2, 2), px(W - 3, 2), px(2, H - 3), px(W - 3, H - 3)]));
  const bg = px(2, 2);
  const cells = new Map();
  const x0 = box ? box[0] : 0, y0 = box ? box[1] : 0, x1 = box ? box[2] : W - 1, y1 = box ? box[3] : H - 1;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = (y * W + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (Math.abs(r - bg[0]) < 12 && Math.abs(g - bg[1]) < 12 && Math.abs(b - bg[2]) < 12) continue;
      const k = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      let e = cells.get(k);
      if (!e) { e = { n: 0, r: 0, g: 0, b: 0, sx: 0, sy: 0, bx0: W, by0: H, bx1: 0, by1: 0 }; cells.set(k, e); }
      e.n++; e.r += r; e.g += g; e.b += b; e.sx += x; e.sy += y;
      if (x < e.bx0) e.bx0 = x; if (x > e.bx1) e.bx1 = x;
      if (y < e.by0) e.by0 = y; if (y > e.by1) e.by1 = y;
    }
  }
  const rows = [...cells.values()].sort((a, b) => b.n - a.n).slice(0, 40);
  for (const e of rows) {
    console.log(
      `rgb(${Math.round(e.r / e.n)},${Math.round(e.g / e.n)},${Math.round(e.b / e.n)})`.padEnd(18),
      String(e.n).padStart(8) + 'px',
      `c(${Math.round(e.sx / e.n)},${Math.round(e.sy / e.n)})`.padEnd(14),
      `bbox[${e.bx0},${e.by0},${e.bx1},${e.by1}]`
    );
  }
})();
