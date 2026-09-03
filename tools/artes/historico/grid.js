// Superpone una cuadrícula medida sobre la foto de la Navi (para trazar).
const sharp = require('C:/proyectos/club-turkaj/node_modules/sharp');
const f = 'REFERENCIAS INTERFAZ/VEHÍCULOS/HONDA, NAVI.png';
const o = process.env.SCRATCH;
const W = 1018, H = 718;

let g = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">`;
for (let x = 0; x <= W; x += 25) {
  const major = x % 100 === 0;
  g += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${major ? '#0044FF' : '#00BB44'}" stroke-width="${major ? 1.4 : 0.5}" opacity="0.65"/>`;
}
for (let y = 0; y <= H; y += 25) {
  const major = y % 100 === 0;
  g += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${major ? '#0044FF' : '#00BB44'}" stroke-width="${major ? 1.4 : 0.5}" opacity="0.65"/>`;
}
for (let x = 0; x <= W; x += 100)
  for (let y = 0; y <= H; y += 100)
    g += `<text x="${x + 3}" y="${y + 14}" font-size="13" font-family="Arial" fill="#FF00AA" font-weight="bold">${x},${y}</text>`;
g += '</svg>';

(async () => {
  const grid = Buffer.from(g);
  await sharp(f).composite([{ input: grid, top: 0, left: 0 }]).toFile(o + '/navi-grid.png');
  // zooms con cuadrícula para leer coordenadas finas
  const zones = [
    ['g-front', { left: 560, top: 0, width: 458, height: 718 }],
    ['g-rear', { left: 60, top: 180, width: 420, height: 538 }],
    ['g-center', { left: 330, top: 200, width: 420, height: 460 }],
  ];
  for (const [n, c] of zones) {
    await sharp(o + '/navi-grid.png').extract(c).resize({ width: 940 }).toFile(`${o}/${n}.png`);
  }
  console.log('ok');
})();
