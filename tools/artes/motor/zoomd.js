const sharp = require('C:/proyectos/club-turkaj/node_modules/sharp');
const DIR = 'C:/proyectos/club-turkaj/REFERENCIAS INTERFAZ/VEHÍCULOS/';
const [ref, key, x1, y1, x2, y2, out] = process.argv.slice(2);
const B = [x1, y1, x2, y2].map(Number);
(async () => {
  const w = B[2]-B[0], h = B[3]-B[1];
  const a = await sharp(DIR + ref).extract({ left: B[0], top: B[1], width: w, height: h }).resize({ width: 560 }).toBuffer();
  const b = await sharp(`${__dirname}/${key}-trace.svg`).png().toBuffer();
  const bc = await sharp(b).extract({ left: B[0], top: B[1], width: w, height: h }).resize({ width: 560 }).toBuffer();
  const ah = Math.round(560 * h / w);
  await sharp({ create: { width: 1140, height: ah, channels: 3, background: { r: 255, g: 0, b: 255 } } })
    .composite([{ input: a, left: 0, top: 0 }, { input: bc, left: 580, top: 0 }])
    .png().toFile(`${__dirname}/${out}`);
  console.log('ok', out);
})();
