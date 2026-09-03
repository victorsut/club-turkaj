// Recorte ref|arte|diff desde cmp-data.json (webp 960px) para una caja
// en coords 1536: node crop9.cjs <key> x0 y0 x1 y1 [out]
const sharp = require('C:/proyectos/club-turkaj/node_modules/sharp');
const fs = require('fs');
const DATA = JSON.parse(fs.readFileSync('C:/proyectos/club-turkaj/tools/artes/comparador/cmp-data.json', 'utf8'));
(async () => {
  const key = process.argv[2];
  const m = DATA.find(r => r.key === key);
  if (!m) { console.error('sin datos de', key); process.exit(1); }
  const K = 960 / m.w, PAD = 30;
  let [x0, y0, x1, y1] = process.argv.slice(3, 7).map(Number).map(v => Math.round(v * K));
  const HH = Math.round(m.h * K);
  x0 = Math.max(0, x0 - PAD); y0 = Math.max(0, y0 - PAD);
  x1 = Math.min(959, x1 + PAD); y1 = Math.min(HH - 1, y1 + PAD);
  const w = x1 - x0, h = y1 - y0;
  const TW = 300, th = Math.round(h * TW / w);
  const tiles = [];
  for (const k of ['ref', 'art', 'dif']) {
    const buf = Buffer.from(m[k].split(',')[1], 'base64');
    tiles.push(await sharp(buf).extract({ left: x0, top: y0, width: w, height: h }).resize({ width: TW, height: th }).png().toBuffer());
  }
  const out = process.argv[7] || `crop-${key}.png`;
  await sharp({ create: { width: TW * 3 + 8, height: th, channels: 3, background: '#222' } })
    .composite(tiles.map((t, i) => ({ input: t, left: i * (TW + 4), top: 0 })))
    .png().toFile(`${__dirname}/${out}`);
  console.log(out, `${w}x${h}`);
})();
