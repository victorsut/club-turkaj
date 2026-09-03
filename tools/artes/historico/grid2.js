// Cuadrícula sobre la NUEVA referencia vectorial de la Navi.
const sharp = require('C:/proyectos/club-turkaj/node_modules/sharp');
const f = 'REFERENCIAS INTERFAZ/VEHÍCULOS/HONDA, NAVI.png';
const o = process.env.SCRATCH;

(async () => {
  const meta = await sharp(f).metadata();
  const W = meta.width, H = meta.height;
  console.log('dimensiones:', W, H);
  let g = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">`;
  for (let x = 0; x <= W; x += 25) {
    const major = x % 100 === 0;
    g += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${major ? '#0044FF' : '#00BB44'}" stroke-width="${major ? 1.6 : 0.6}" opacity="0.6"/>`;
  }
  for (let y = 0; y <= H; y += 25) {
    const major = y % 100 === 0;
    g += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${major ? '#0044FF' : '#00BB44'}" stroke-width="${major ? 1.6 : 0.6}" opacity="0.6"/>`;
  }
  for (let x = 0; x <= W; x += 100)
    for (let y = 0; y <= H; y += 100)
      g += `<text x="${x + 3}" y="${y + 15}" font-size="15" font-family="Arial" fill="#FF00AA" font-weight="bold">${x},${y}</text>`;
  g += '</svg>';
  await sharp(f).composite([{ input: Buffer.from(g), top: 0, left: 0 }]).toFile(o + '/navi2-grid.png');
  const half = Math.round(W / 2);
  await sharp(o + '/navi2-grid.png').extract({ left: 0, top: 0, width: half, height: H }).resize({ width: 950 }).toFile(o + '/navi2-g-rear.png');
  await sharp(o + '/navi2-grid.png').extract({ left: half - 100, top: 0, width: W - half + 100, height: H }).resize({ width: 950 }).toFile(o + '/navi2-g-front.png');
  console.log('ok');
})();
