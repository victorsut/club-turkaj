// Zoom lado a lado ref | render de una caja: node zoom-mix.cjs <key> x0 y0 x1 y1
const sharp = require('C:/proyectos/club-turkaj/node_modules/sharp');
const { MODELS } = require('./trace-mix.cjs');
const DIR = 'C:/proyectos/club-turkaj/REFERENCIAS INTERFAZ/VEHÍCULOS/';
const O = __dirname;
(async () => {
  const key = process.argv[2];
  let [x0, y0, x1, y1] = process.argv.slice(3, 7).map(Number);
  const PAD = 30;
  x0 = Math.max(0, x0 - PAD); y0 = Math.max(0, y0 - PAD);
  x1 = Math.min(1535, x1 + PAD); y1 = Math.min(1023, y1 + PAD);
  const w = x1 - x0, h = y1 - y0;
  const TW = 420, th = Math.round(h * TW / w);
  const ref = await sharp(DIR + MODELS[key].file).flatten({ background: '#fff' }).extract({ left: x0, top: y0, width: w, height: h }).resize({ width: TW }).png().toBuffer();
  const ren = await sharp(`${O}/${key}-trace.svg`).resize({ width: 1536 }).png().toBuffer();
  const renC = await sharp(ren).extract({ left: x0, top: y0, width: w, height: h }).resize({ width: TW }).png().toBuffer();
  await sharp({ create: { width: TW * 2 + 6, height: th, channels: 3, background: '#333' } })
    .composite([{ input: ref, left: 0, top: 0 }, { input: renC, left: TW + 6, top: 0 }])
    .png().toFile(`${O}/zoom-${key}.png`);
  console.log('zoom-' + key + '.png', w + 'x' + h);
})();
