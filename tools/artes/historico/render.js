// Render 1:1 del arte de NaviArt.jsx (paridad con el componente E1.9e)
// sobre fondo negro (tarjeta) y blanco; recorta zonas y hace el diff
// pixel a pixel contra la referencia.
const sharp = require('C:/proyectos/club-turkaj/node_modules/sharp');
const fs = require('fs');
const O = __dirname;
const REF = 'C:/proyectos/club-turkaj/REFERENCIAS INTERFAZ/VEHÍCULOS/HONDA, NAVI.png';

const txt = fs.readFileSync('C:/proyectos/club-turkaj/src/components/ui/naviTrace.js', 'utf8');
const body = txt.slice(txt.indexOf('= {') + 2, txt.lastIndexOf('};') + 1);
const T = eval('(' + body + ')');

function shade(hex, pct) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + (pct / 100) * (pct > 0 ? 255 - v : v))));
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(f).map(v => v.toString(16).padStart(2, '0')).join('');
}

function art(bodyColor) {
  let s = `<defs>
    <linearGradient id="nsofa" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3A3B42"/><stop offset="45%" stop-color="#26272C"/><stop offset="100%" stop-color="#191A1E"/>
    </linearGradient>
    <linearGradient id="ngray" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4E4F57"/><stop offset="100%" stop-color="#34353C"/>
    </linearGradient>
    <linearGradient id="nen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2D2F33"/><stop offset="100%" stop-color="#232527"/>
    </linearGradient>
    <linearGradient id="nwheel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#35363C"/><stop offset="100%" stop-color="#27282C"/>
    </linearGradient>
    <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${shade(bodyColor, 18)}"/><stop offset="100%" stop-color="${shade(bodyColor, -14)}"/>
    </linearGradient>
  </defs>`;
  const layer = (name, fill) => `<path d="${T[name]}" fill="${fill}" fill-rule="evenodd"/>`;
  s += layer('black', 'url(#nsofa)');
  s += layer('engray', 'url(#nen)');
  s += layer('wheelgray', 'url(#nwheel)');
  s += layer('darkgray', '#3A3B41');
  s += layer('midgray', 'url(#ngray)');
  s += layer('darkred', shade(bodyColor, -34));
  s += layer('red', 'url(#body)');
  s += layer('spring', '#E02A28');
  s += layer('taillight', '#D02427');
  s += layer('white', '#F2F2EF');
  s += layer('amber', '#F49C1F');
  for (const [cx, cy] of [[283, 780], [1306, 785]]) {
    s += `<path d="M ${cx - 124} ${cy - 95} A 157 157 0 0 1 ${cx + 40} ${cy - 150}" stroke="rgba(255,255,255,.07)" stroke-width="16" fill="none" stroke-linecap="round"/>`;
  }
  s += `<path d="M764 324 Q 884 300 992 324" stroke="rgba(255,255,255,.20)" stroke-width="16" fill="none" stroke-linecap="round"/>
  <path d="M236 304 Q 424 292 560 320" stroke="rgba(255,255,255,.10)" stroke-width="14" fill="none" stroke-linecap="round"/>
  <path d="M1132 644 Q 1244 588 1364 632" stroke="rgba(255,255,255,.08)" stroke-width="14" fill="none" stroke-linecap="round"/>
  <path d="M1304 344 Q 1304 328 1320 332 L 1324 416" stroke="rgba(255,255,255,.85)" stroke-width="12" fill="none" stroke-linecap="round"/>`;
  return s;
}

(async () => {
  const variants = [['black', '#232428', '#2F5BD7'], ['white', '#ffffff', '#2F5BD7'], ['white-red', '#ffffff', '#E62229']];
  for (const [tag, bg, col] of variants) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024"><rect width="100%" height="100%" fill="${bg}"/>${art(col)}</svg>`;
    await sharp(Buffer.from(svg)).resize({ width: 1536 }).png().toFile(`${O}/r-${tag}.png`);
  }
  const zones = [['rear', 90, 560, 400, 400], ['center', 430, 560, 480, 360], ['front', 1090, 560, 420, 400]];
  for (const [n, l, t, w, h] of zones) {
    await sharp(`${O}/r-black.png`).extract({ left: l, top: t, width: w, height: h })
      .resize({ width: Math.round(w * 1.6), kernel: 'nearest' }).toFile(`${O}/nb-${n}.png`);
  }
  await sharp(`${O}/r-black.png`).resize({ width: 760 }).toFile(`${O}/r-black-small.png`);
  await sharp(`${O}/r-white-red.png`).resize({ width: 900 }).toFile(`${O}/r-whitered-small.png`);

  // DIFF pixel a pixel contra la referencia (render rojo sobre blanco)
  const render = await sharp(`${O}/r-white-red.png`).removeAlpha().raw().toBuffer();
  const ref = await sharp(REF).removeAlpha().raw().toBuffer();
  const W = 1536, H = 1024;
  const out = Buffer.alloc(W * H * 3);
  let diffCount = 0;
  for (let i = 0; i < W * H; i++) {
    const d = Math.max(Math.abs(render[i * 3] - ref[i * 3]), Math.abs(render[i * 3 + 1] - ref[i * 3 + 1]), Math.abs(render[i * 3 + 2] - ref[i * 3 + 2]));
    if (d > 70) { out[i * 3] = 255; out[i * 3 + 1] = 40; out[i * 3 + 2] = 40; diffCount++; }
    else {
      const g = (ref[i * 3] + ref[i * 3 + 1] + ref[i * 3 + 2]) / 3 * 0.35 + 160;
      out[i * 3] = g; out[i * 3 + 1] = g; out[i * 3 + 2] = g;
    }
  }
  console.log('pixeles con diferencia fuerte:', diffCount, `(${(diffCount / (W * H) * 100).toFixed(2)}%)`);
  await sharp(out, { raw: { width: W, height: H, channels: 3 } }).png().resize({ width: 950 }).toFile(`${O}/navi-diff.png`);
  console.log('ok');
})();
