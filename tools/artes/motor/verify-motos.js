// Verificación de la 3ª tanda: (1) diff pixel a pixel del trace.svg vs
// la referencia (excluye la banda de sombra de piso, descartada a
// propósito); (2) render RECOLOREADO (azul) sobre tarjeta negra — la
// prueba que destapa halos y huecos tono-sobre-tono (regla E1.9e).
const sharp = require('C:/proyectos/club-turkaj/node_modules/sharp');
const fs = require('fs');
const O = __dirname;
const DIR = 'C:/proyectos/club-turkaj/REFERENCIAS INTERFAZ/VEHÍCULOS/MOTOS/';

const CFG = {
  xr: { // E1.14 (24-ago): recalco con anclas re-medidas
    ref: 'HONDA, XR.png', shadow: [878, 945],
    layers: [['black', '#2F3032'], ['tire', '#3A3B3D'], ['muffler', '#434444'], ['engdark', '#515254'], ['engmid', '#6A6B6C'], ['gray', '#77787A'], ['silver', '#BEBEC0'], ['lightgray', '#D3D3D4'], ['xlight', '#E3E3E3'], ['darkred', 'SHADE:-30'], ['red', 'BODY'], ['white', '#F1F1F1']],
    zones: [['tail', 100, 150, 500, 420], ['engine', 600, 440, 400, 360], ['front', 850, 80, 430, 400]],
  },
  dita: { // E1.14: recalco (frente/faro + panel + aros)
    ref: 'ITALIKA, D.png', shadow: [888, 935],
    layers: [['dk1', '#343B40'], ['dk5', '#434B52'], ['xlight', '#DCDCDC'], ['darkteal', 'SHADE:-18'], ['teal', 'BODY'], ['white', '#EBEBEB'], ['ring', '#DCDCDC'], ['tailred', '#D13C3C'], ['amber', '#EB962D']],
    zones: [['front', 900, 60, 500, 640], ['panel', 150, 320, 560, 380], ['wheelR', 180, 600, 420, 340]],
  },
};

function shade(hex, pct) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + (pct / 100) * (pct > 0 ? 255 - v : v))));
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(f).map(v => v.toString(16).padStart(2, '0')).join('');
}

(async () => {
  const only = process.argv[2];
  for (const [key, C] of Object.entries(CFG)) {
    if (only && key !== only) continue;
    const txt = fs.readFileSync(`C:/proyectos/club-turkaj/src/components/ui/${key}Trace.js`, 'utf8');
    const body = txt.slice(txt.indexOf('= {') + 2, txt.lastIndexOf('};') + 1);
    const T = eval('(' + body + ')');

    // (1) diff 1:1: trace.svg ya lleva los tonos de la referencia
    const render = await sharp(`${O}/${key}-trace.svg`).resize({ width: 1536 }).removeAlpha().raw().toBuffer();
    const ref = await sharp(DIR + C.ref).removeAlpha().raw().toBuffer();
    const W = 1536, H = 1024;
    const out = Buffer.alloc(W * H * 3);
    let diffCount = 0, total = 0;
    for (let i = 0; i < W * H; i++) {
      const y = (i / W) | 0;
      const refLight = ref[i * 3] >= 200 && ref[i * 3 + 1] >= 200 && ref[i * 3 + 2] >= 200;
      const inShadow = y >= C.shadow[0] && y <= C.shadow[1] && refLight;
      total++;
      const d = Math.max(Math.abs(render[i * 3] - ref[i * 3]), Math.abs(render[i * 3 + 1] - ref[i * 3 + 1]), Math.abs(render[i * 3 + 2] - ref[i * 3 + 2]));
      if (d > 70 && !inShadow) { out[i * 3] = 255; out[i * 3 + 1] = 40; out[i * 3 + 2] = 40; diffCount++; }
      else {
        const g = (ref[i * 3] + ref[i * 3 + 1] + ref[i * 3 + 2]) / 3 * 0.35 + 160;
        out[i * 3] = g; out[i * 3 + 1] = g; out[i * 3 + 2] = g;
      }
    }
    console.log(`${key}: diff fuerte ${diffCount} px (${(diffCount / total * 100).toFixed(2)}%)`);
    await sharp(out, { raw: { width: W, height: H, channels: 3 } }).png().resize({ width: 950 }).toFile(`${O}/${key}-diff.png`);

    // (2) render recoloreado sobre tarjeta negra + zooms
    const col = '#2F5BD7';
    let g = `<defs><linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${shade(col, 18)}"/><stop offset="100%" stop-color="${shade(col, -14)}"/>
    </linearGradient></defs>`;
    for (const [name, fill] of C.layers) {
      if (!T[name]) continue;
      const f = fill === 'BODY' ? 'url(#body)' : fill.startsWith('SHADE:') ? shade(col, +fill.slice(6)) : fill;
      g += `<path d="${T[name]}" fill="${f}" fill-rule="evenodd"/>`;
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024"><rect width="100%" height="100%" fill="#232428"/>${g}</svg>`;
    await sharp(Buffer.from(svg)).png().toFile(`${O}/${key}-black.png`);
    await sharp(`${O}/${key}-black.png`).resize({ width: 820 }).toFile(`${O}/${key}-black-small.png`);
    for (const [n, l, t, w, h] of C.zones) {
      await sharp(`${O}/${key}-black.png`).extract({ left: l, top: t, width: w, height: h })
        .resize({ width: Math.round(w * 1.4), kernel: 'nearest' }).toFile(`${O}/${key}-z-${n}.png`);
    }
  }
  console.log('ok');
})();
