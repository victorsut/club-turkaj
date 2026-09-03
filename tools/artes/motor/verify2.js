// Verificación E1.18 — deriva las CAPAS automáticamente de MODELS
// (trace-autos.js exporta las configs): diff 1:1 vs referencia + render
// recolor azul sobre tarjeta negra. La banda roja PRINCIPAL ('red') va
// como BODY; las demás bandas rojas como shade(color, delta_R).
const sharp = require('C:/proyectos/club-turkaj/node_modules/sharp');
const fs = require('fs');
const { MODELS } = require('./trace-autos.js');
const O = __dirname;
const DIR = 'C:/proyectos/club-turkaj/REFERENCIAS INTERFAZ/VEHÍCULOS/';

const SHTH = { xb: 140, xd: 95, cx5: 145, runner: 145, dmax: 145, gladiator: 145, l200: 160, frontier: 160, r22: 145, hilux: 160, tacoma: 155, crv: 150, tucson: 150, sportage: 150, rav4: 150 };

function shadeU(hex, amt) {
  const c = parseInt(hex.replace('#', ''), 16);
  const f = (v) => Math.max(0, Math.min(255, v + amt));
  return '#' + (((f(c >> 16) << 16) | (f((c >> 8) & 255) << 8) | f(c & 255)) >>> 0).toString(16).padStart(6, '0');
}
function shadePct(hex, pct) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + (pct / 100) * (pct > 0 ? 255 - v : v))));
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(f).map(v => v.toString(16).padStart(2, '0')).join('');
}

(async () => {
  const only = process.argv[2];
  for (const [key, M] of Object.entries(MODELS)) {
    if (only && key !== only) continue;
    if (!fs.existsSync(`${O}/${key}-trace.svg`) || !fs.existsSync(DIR + M.file)) continue;
    const isRed = (n) => { const c = M.classes.find(x => x.name === n); return c && c.rgb && c.rgb[0] - c.rgb[1] > 60 && !['amber', 'orange', 'darkorange', 'edge'].includes(n); };
    const mainRed = M.classes.find(c => c.name === 'red');

    // diff 1:1
    const render = await sharp(`${O}/${key}-trace.svg`).resize({ width: 1536 }).removeAlpha().raw().toBuffer();
    const ref = await sharp(DIR + M.file).removeAlpha().raw().toBuffer();
    const W = 1536, H = 1024;
    let diffCount = 0;
    const shT = SHTH[key] || 200;
    for (let i = 0; i < W * H; i++) {
      const y = (i / W) | 0;
      const refLight = ref[i * 3] >= shT && ref[i * 3 + 1] >= shT && ref[i * 3 + 2] >= shT;
      const inShadow = M.shadow && y >= M.shadow.band[0] && y <= M.shadow.band[1] && refLight;
      const d = Math.max(Math.abs(render[i * 3] - ref[i * 3]), Math.abs(render[i * 3 + 1] - ref[i * 3 + 1]), Math.abs(render[i * 3 + 2] - ref[i * 3 + 2]));
      if (d > 70 && !inShadow) diffCount++;
    }
    console.log(`${key}: diff ${(diffCount / (W * H) * 100).toFixed(2)}%`);

    // render recolor azul sobre negro
    const txt = fs.readFileSync(`C:/proyectos/club-turkaj/src/components/ui/${key}Trace.js`, 'utf8');
    const body = txt.slice(txt.indexOf('= {') + 2, txt.lastIndexOf('};') + 1);
    const T = eval('(' + body + ')');
    const col = '#2F5BD7';
    let g = `<defs><linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${shadePct(col, 18)}"/><stop offset="100%" stop-color="${shadePct(col, -14)}"/>
    </linearGradient></defs>`;
    for (const name of M.order) {
      if (!T[name]) continue;
      const nRed = M.classes.filter(c => isRed(c.name)).length;
      let f;
      if (name === 'red') f = nRed >= 3 ? col : 'url(#body)';
      else if (isRed(name)) f = shadeU(col, M.classes.find(c => c.name === name).rgb[0] - mainRed.rgb[0]);
      else f = M.fills[name];
      g += `<path d="${T[name]}" fill="${f}" fill-rule="evenodd"/>`;
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024"><rect width="100%" height="100%" fill="#232428"/>${g}</svg>`;
    await sharp(Buffer.from(svg)).png().toFile(`${O}/${key}-black.png`);
  }
  console.log('ok');
})();
