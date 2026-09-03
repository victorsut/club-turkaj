// Verificación de la 3ª tanda: (1) diff pixel a pixel del trace.svg vs
// la referencia (excluye la banda de sombra de piso, descartada a
// propósito); (2) render RECOLOREADO (azul) sobre tarjeta negra — la
// prueba que destapa halos y huecos tono-sobre-tono (regla E1.9e).
const sharp = require('C:/proyectos/club-turkaj/node_modules/sharp');
const fs = require('fs');
const O = __dirname;
const DIR = 'C:/proyectos/club-turkaj/REFERENCIAS INTERFAZ/VEHÍCULOS/MOTOS/';

const CFG = {
  eco: {
    ref: 'HERO, ECO.png', shadow: [840, 905],
    layers: [['dark', '#2E3235'], ['black', '#363A3D'], ['char2', '#3D4245'], ['char', '#44494C'], ['midgray', '#7D7E80'], ['gray', '#A0A0A1'], ['silver', '#B5B5B5'], ['silver2', '#C8C8C8'], ['red', 'BODY'], ['springsilver', '#A6A6A7'], ['amber', '#ED7727']],
    zones: [['tail', 110, 280, 380, 340], ['engine', 600, 380, 480, 420], ['front', 1050, 150, 440, 480]],
  },
  xpulse: {
    ref: 'HERO, XPULSE.png', shadow: [838, 916],
    layers: [['dark', '#313941'], ['cap', '#3C434B'], ['char', '#494E53'], ['gray', '#87888B'], ['silver', '#B5B4B4'], ['lightgray', '#D2D2D3'], ['red', 'BODY'], ['taillight', '#D91F1E'], ['hubdot', '#D2D2D3'], ['white', '#F6F6F6']],
    zones: [['tail', 100, 280, 400, 350], ['screen', 980, 90, 440, 400], ['wheelF', 1030, 470, 460, 440]],
  },
  ybr: {
    ref: 'YAMAHA, YBR.png', shadow: [840, 916],
    layers: [['black', '#313538'], ['char', '#383D42'], ['darkgray', '#6F7073'], ['gray', '#949494'], ['silver', '#B5B5B6'], ['silver2', '#BEBEBF'], ['silver3', '#C5C5C6'], ['orange', 'BODY'], ['tailred', '#C91D20'], ['amber', '#E05E0E']],
    zones: [['tail', 100, 300, 380, 340], ['exhaust', 350, 550, 500, 380], ['front', 1020, 130, 460, 480]],
  },
};

function shade(hex, pct) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + (pct / 100) * (pct > 0 ? 255 - v : v))));
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(f).map(v => v.toString(16).padStart(2, '0')).join('');
}

(async () => {
  for (const [key, C] of Object.entries(CFG)) {
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
      g += `<path d="${T[name]}" fill="${fill === 'BODY' ? 'url(#body)' : fill}" fill-rule="evenodd"/>`;
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
