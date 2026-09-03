const sharp = require('C:/proyectos/club-turkaj/node_modules/sharp');
const fs = require('fs');
const BASE = 'C:/proyectos/club-turkaj/REFERENCIAS INTERFAZ/VEHÍCULOS/';
(async () => {
  const items = [];
  for (const sub of ['AUTOS LIVIANOS', 'SUV']) {
    for (const f of fs.readdirSync(BASE + sub).filter(f => f.endsWith('.png'))) {
      items.push({ sub, f });
    }
  }
  const TW = 380, TH = 253;
  const cols = 4, rows = Math.ceil(items.length / cols);
  const comps = [];
  for (let i = 0; i < items.length; i++) {
    const buf = await sharp(BASE + items[i].sub + '/' + items[i].f).resize({ width: TW }).toBuffer();
    comps.push({ input: buf, left: (i % cols) * TW, top: ((i / cols) | 0) * TH });
    console.log(i, items[i].sub + '/' + items[i].f);
  }
  await sharp({ create: { width: cols * TW, height: rows * TH, channels: 3, background: { r: 30, g: 30, b: 34 } } })
    .composite(comps).png().toFile(__dirname + '/autos-contact.png');
  console.log('ok');
})();
