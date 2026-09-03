// Verificación TANDA 9 — diff 1:1 vs referencia + render recolor azul
// sobre tarjeta negra. El lienzo del render usa el color de fondo de la
// referencia (camiones: teal/amarillo) y el diff descarta la sombra de
// piso: banda de sombra (fondo blanco) o familia de tono del fondo
// (fondo de color).
const sharp = require('C:/proyectos/club-turkaj/node_modules/sharp');
const fs = require('fs');
const { MODELS } = require('./trace-mix.cjs');
const O = __dirname;
const DIR = 'C:/proyectos/club-turkaj/REFERENCIAS INTERFAZ/VEHÍCULOS/';

function shadeU(hex, amt) {
  const c = parseInt(hex.replace('#', ''), 16);
  const f = (v) => Math.max(0, Math.min(255, v + amt));
  return '#' + (((f(c >> 16) << 16) | (f((c >> 8) & 255) << 8) | f(c & 255)) >>> 0).toString(16).padStart(6, '0');
}

(async () => {
  const only = process.argv[2];
  for (const [key, M] of Object.entries(MODELS)) {
    if (only && key !== only) continue;
    if (!fs.existsSync(`${O}/${key}-trace.svg`) || !fs.existsSync(DIR + M.file)) continue;
    const main = M.classes.find(c => c.name === M.bodyNames[0]);
    const ch = main.rgb.indexOf(Math.max(...main.rgb));

    const render = await sharp(`${O}/${key}-trace.svg`).resize({ width: 1536 }).removeAlpha().raw().toBuffer();
    const ref = await sharp(DIR + M.file).flatten({ background: '#fff' }).removeAlpha().raw().toBuffer();
    const W = 1536, H = 1024;
    const hue = (r, g, b) => {
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if (mx - mn < 20) return -1;
      if (mx === r) return ((g - b) / (mx - mn) + 6) % 6;
      if (mx === g) return (b - r) / (mx - mn) + 2;
      return (r - g) / (mx - mn) + 4;
    };
    const h0 = M.bg ? hue(...M.bg) : -1;
    let diffCount = 0;
    for (let i = 0; i < W * H; i++) {
      const y = (i / W) | 0;
      const r = ref[i * 3], g = ref[i * 3 + 1], b = ref[i * 3 + 2];
      let skip = false;
      if (M.bg) {
        const h = hue(r, g, b);
        if (h >= 0) { let d = Math.abs(h - h0); if (d > 3) d = 6 - d; skip = d <= 0.5; }
      } else {
        const refLight = r >= 118 && g >= 118 && b >= 118;
        for (const SH of [M.shadow, M.shadow2]) {
          if (SH && y >= SH.band[0] && y <= SH.band[1] && refLight) skip = true;
        }
      }
      const d = Math.max(Math.abs(render[i * 3] - r), Math.abs(render[i * 3 + 1] - g), Math.abs(render[i * 3 + 2] - b));
      if (d > 70 && !skip) diffCount++;
    }
    console.log(`${key}: diff ${(diffCount / (W * H) * 100).toFixed(2)}%`);

    // render recolor azul sobre negro
    const txt = fs.readFileSync(`C:/proyectos/club-turkaj/src/components/ui/${key}Trace.js`, 'utf8');
    const body = txt.slice(txt.indexOf('= {') + 2, txt.lastIndexOf('};') + 1);
    const T = eval('(' + body + ')');
    const col = '#2F5BD7';
    let gsvg = '';
    for (const name of M.order) {
      if (!T[name]) continue;
      let f;
      if (name === M.bodyNames[0]) f = col;
      else if (M.bodyNames.includes(name)) f = shadeU(col, M.classes.find(c => c.name === name).rgb[ch] - main.rgb[ch]);
      else f = M.fills[name];
      gsvg += `<path d="${T[name]}" fill="${f}" fill-rule="evenodd"/>`;
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024"><rect width="100%" height="100%" fill="#232428"/>${gsvg}</svg>`;
    await sharp(Buffer.from(svg)).resize({ width: 900 }).png().toFile(`${O}/${key}-black.png`);
  }
  console.log('ok');
})();
