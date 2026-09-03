// DIFF pixel a pixel: recorta el render alineado y lo compara con la
// referencia; genera mapa de diferencias (rojo = donde difieren).
const sharp = require('C:/proyectos/club-turkaj/node_modules/sharp');
const O = __dirname;
const REF = 'C:/proyectos/club-turkaj/REFERENCIAS INTERFAZ/VEHÍCULOS/HONDA, NAVI.png';

(async () => {
  // el render: imagen (0,0) cae en pantalla (206,54)
  const render = await sharp(O + '/navi-full.png')
    .extract({ left: 206, top: 54, width: 1536, height: 1024 })
    .removeAlpha().raw().toBuffer();
  const ref = await sharp(REF).removeAlpha().raw().toBuffer();
  const W = 1536, H = 1024;
  const out = Buffer.alloc(W * H * 3);
  let diffCount = 0;
  for (let i = 0; i < W * H; i++) {
    const dr = Math.abs(render[i * 3] - ref[i * 3]);
    const dg = Math.abs(render[i * 3 + 1] - ref[i * 3 + 1]);
    const db = Math.abs(render[i * 3 + 2] - ref[i * 3 + 2]);
    const d = Math.max(dr, dg, db);
    if (d > 70) {
      out[i * 3] = 255; out[i * 3 + 1] = 40; out[i * 3 + 2] = 40; diffCount++;
    } else {
      // fondo: la referencia atenuada en gris
      const g = (ref[i * 3] + ref[i * 3 + 1] + ref[i * 3 + 2]) / 3 * 0.35 + 160;
      out[i * 3] = g; out[i * 3 + 1] = g; out[i * 3 + 2] = g;
    }
  }
  console.log('pixeles con diferencia fuerte:', diffCount, `(${(diffCount / (W * H) * 100).toFixed(2)}%)`);
  await sharp(out, { raw: { width: W, height: H, channels: 3 } }).png()
    .resize({ width: 950 }).toFile(O + '/navi-diff.png');
  console.log('ok');
})();
