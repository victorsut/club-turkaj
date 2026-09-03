// Mide los CENTROS exactos de las llantas y el CVT: detecta los píxeles
// oscuros de cada región y calcula centroide + radio; además genera
// crops con cuadrícula fina para verificación visual.
const sharp = require('C:/proyectos/club-turkaj/node_modules/sharp');
const F = 'C:/proyectos/club-turkaj/REFERENCIAS INTERFAZ/VEHÍCULOS/HONDA, NAVI.png';
const O = __dirname;

(async () => {
  const { data, info } = await sharp(F).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const dark = (x, y) => {
    const i = (y * W + x) * 4;
    return data[i] < 90 && data[i + 1] < 90 && data[i + 2] < 90;
  };
  // centroide de píxeles oscuros dentro de una caja (sólo la mitad
  // INFERIOR de la rueda para no contaminar con guardafango/mofle)
  const centroid = (x1, y1, x2, y2) => {
    let sx = 0, sy = 0, n = 0;
    for (let y = y1; y < y2; y++) for (let x = x1; x < x2; x++)
      if (dark(x, y)) { sx += x; sy += y; n++; }
    return [sx / n, sy / n, n];
  };
  // rueda trasera: banda inferior (por debajo de mofle/motor)
  const r1 = centroid(120, 880, 560, 1024);
  // rueda delantera: banda inferior
  const r2 = centroid(1060, 880, 1480, 1024);
  console.log('banda inferior trasera cx≈', r1[0].toFixed(1), 'delantera cx≈', r2[0].toFixed(1));
  // radio: escanear la fila más baja con oscuro en cada zona
  const bottomAt = (x1, x2) => {
    for (let y = H - 1; y > 600; y--)
      for (let x = x1; x < x2; x++) if (dark(x, y)) return y;
    return -1;
  };
  console.log('fondo llanta trasera y=', bottomAt(150, 550), ' delantera y=', bottomAt(1080, 1460));
  // extremos horizontales de cada llanta a la altura del eje (~y 815)
  const spanAt = (y, x1, x2) => {
    let lo = -1, hi = -1;
    for (let x = x1; x < x2; x++) if (dark(x, y)) { if (lo < 0) lo = x; hi = x; }
    return [lo, hi];
  };
  for (const y of [790, 815, 840]) {
    console.log(`y=${y} trasera span`, spanAt(y, 90, 620), ' delantera span`', spanAt(y, 1030, 1500));
  }
})();
