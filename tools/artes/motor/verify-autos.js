// Verificación de la 3ª tanda: (1) diff pixel a pixel del trace.svg vs
// la referencia (excluye la banda de sombra de piso, descartada a
// propósito); (2) render RECOLOREADO (azul) sobre tarjeta negra — la
// prueba que destapa halos y huecos tono-sobre-tono (regla E1.9e).
const sharp = require('C:/proyectos/club-turkaj/node_modules/sharp');
const fs = require('fs');
const O = __dirname;
const DIR = 'C:/proyectos/club-turkaj/REFERENCIAS INTERFAZ/VEHÍCULOS/';

const CFG = {
  civic: { ref: 'AUTOS LIVIANOS/HONDA, CIVIC.png', shadow: [640, 860],
    layers: [['black', '#333537'], ['dark', '#3F4041'], ['gray', '#969696'], ['silver', '#C0C0C0'], ['glass', '#D4D4D4'], ['darkred', 'SHADE:-15'], ['red', 'BODY'], ['white', '#FBFAFA']], zones: [] },
  accent: { ref: 'AUTOS LIVIANOS/HYUNDAI, ACCENT.png', shadow: [650, 870],
    layers: [['black', '#313333'], ['dark', '#3E3F40'], ['gray', '#969696'], ['silver', '#BFBEBE'], ['glass', '#CFCECE'], ['darkred', 'SHADE:-15'], ['red', 'BODY'], ['white', '#FAF9F9']], zones: [] },
  picanto: { ref: 'AUTOS LIVIANOS/KIA, PICANTO.png', shadow: [670, 885],
    layers: [['black', '#2A2A29'], ['dark', '#363635'], ['gray', '#848483'], ['glass', '#BEBEBE'], ['silver', '#D3D3D3'], ['darkred', 'SHADE:-10'], ['red', 'BODY'], ['white', '#F8F8F8']], zones: [] },
  rio: { ref: 'AUTOS LIVIANOS/KIA, RIO.png', shadow: [660, 875],
    layers: [['deep', '#1E1E1D'], ['dark', '#323232'], ['gray', '#828181'], ['glass', '#B0B0B0'], ['silver', '#C9C8C8'], ['lightgray', '#D5D5D5'], ['darkred', 'SHADE:-10'], ['red', 'BODY'], ['white', '#F9F8F8']], zones: [] },
  mazda3: { ref: 'AUTOS LIVIANOS/MAZDA, MAZDA 3.png', shadow: [660, 865],
    layers: [['black', '#313335'], ['dark', '#3F4041'], ['gray', '#969696'], ['glass', '#CBCBCB'], ['silver', '#D4D4D4'], ['darkred', 'SHADE:-15'], ['red', 'BODY'], ['white', '#F9F9F9']], zones: [] },
  corolla: { ref: 'AUTOS LIVIANOS/TOYOTA, COROLLA.png', shadow: [650, 860],
    layers: [['slate', '#2F363B'], ['slate2', '#3A4043'], ['gray', '#969696'], ['glass', '#CCCBCB'], ['red', 'BODY'], ['white', '#FCFBFB']], zones: [] },
  yaris: { ref: 'AUTOS LIVIANOS/TOYOTA, YARIS.png', shadow: [660, 870],
    layers: [['black', '#313436'], ['dark', '#3D4042'], ['gray', '#969696'], ['glass', '#CCCBCB'], ['red', 'BODY'], ['white', '#FAFAFA']], zones: [] },
  xb: { ref: 'AUTOS LIVIANOS/SCION, XB.png', shadow: [700, 880], shTh: 140,
    layers: [['black', '#1D1D1D'], ['dark', '#2D2D2C'], ['silver', '#B9B8B8'], ['lightgray', '#C8C8C8'], ['darkred', 'SHADE:-28'], ['red2', 'SHADE:-14'], ['red', 'BODY'], ['white', '#F2F2F2']], zones: [] },
  xd: { ref: 'AUTOS LIVIANOS/SCION, XD.png', shadow: [715, 878], shTh: 95,
    layers: [['black', '#131313'], ['char', '#282828'], ['silver', '#B9B8B8'], ['lightgray', '#DEDDDD'], ['darkred', 'SHADE:-28'], ['red2', 'SHADE:-14'], ['red', 'BODY'], ['white', '#F4F4F4']], zones: [] },
  crv: { ref: 'SUV/HONDA, CR-V.png', shadow: [700, 875],
    layers: [['deep', '#181818'], ['char', '#2C2C2C'], ['silver', '#BAB8B8'], ['darkred', 'SHADE:-10'], ['red', 'BODY'], ['white', '#F0EFEF']], zones: [] },
  tucson: { ref: 'SUV/HYUNDAI, TUCSON.png', shadow: [700, 875],
    layers: [['deep', '#161614'], ['char', '#292929'], ['silver', '#BAB8B8'], ['darkred', 'SHADE:-25'], ['red2', 'SHADE:-12'], ['red', 'BODY'], ['white', '#E9E8E8']], zones: [] },
  sportage: { ref: 'SUV/KIA, SPORTAGE.png', shadow: [700, 875],
    layers: [['deep', '#151513'], ['char', '#2A2A29'], ['silver', '#BBBABA'], ['darkred', 'SHADE:-25'], ['red2', 'SHADE:-12'], ['red', 'BODY'], ['white', '#EFEFEF']], zones: [] },
  cx5: { ref: 'SUV/MAZDA, CX-5.png', shadow: [702, 878], shTh: 145,
    layers: [['deep', '#151513'], ['char', '#2A2A29'], ['gray2', '#3D3D3D'], ['trim', '#4F4F4E'], ['silver', '#BEBDBD'], ['darkred', 'SHADE:-18'], ['red2', 'SHADE:-9'], ['red', 'BODY'], ['white', '#E9E9E9']], zones: [] },
  runner: { ref: 'SUV/TOYOTA, 4RUNNER.png', shadow: [710, 880], shTh: 145,
    layers: [['deep', '#161616'], ['char', '#282827'], ['silver', '#B7B6B6'], ['darkred', 'SHADE:-28'], ['red2', 'SHADE:-10'], ['red', 'BODY'], ['white', '#FBFBFB']], zones: [] },
  rav4: { ref: 'SUV/TOYOTA, RAV4.png', shadow: [705, 878],
    layers: [['deep', '#151515'], ['char', '#292929'], ['glass', '#3A3A3A'], ['silver', '#BBBABA'], ['darkred', 'SHADE:-25'], ['red2', 'SHADE:-14'], ['red', 'BODY'], ['white', '#EFEFEF']], zones: [] },
  dmax: { ref: 'PICOPS/ISUZU, DMAX.png', shadow: [660, 920], shTh: 145,
    layers: [['deep', '#161615'], ['char', '#282827'], ['gray', '#353535'], ['silver', '#B6B5B5'], ['darkred', 'SHADE:-14'], ['red2', 'SHADE:-7'], ['red', 'BODY']], zones: [] },
  gladiator: { ref: 'PICOPS/JEEP, GLADIATOR.png', shadow: [660, 920], shTh: 145,
    layers: [['deep', '#171716'], ['char', '#292928'], ['gray2', '#3A3A3A'], ['silver', '#B4B3B3'], ['darkred', 'SHADE:-13'], ['red2', 'SHADE:-6'], ['red', 'BODY']], zones: [] },
  l200: { ref: 'PICOPS/MITSUBISHI, L200.png', shadow: [660, 920], shTh: 160,
    layers: [['deep', '#1D1D1C'], ['char', '#282828'], ['gray2', '#3B3B3B'], ['glass', '#4A4A4A'], ['silver', '#BDBDBD'], ['darkred', 'SHADE:-13'], ['red2', 'SHADE:-6'], ['red', 'BODY']], zones: [] },
  frontier: { ref: 'PICOPS/NISSAN, FRONTIER.png', shadow: [655, 920], shTh: 160,
    layers: [['deep', '#151515'], ['char', '#282828'], ['gray2', '#3B3B3A'], ['glass', '#515150'], ['silver', '#C3C3C3'], ['darkred', 'SHADE:-12'], ['red2', 'SHADE:-6'], ['red', 'BODY']], zones: [] },
  r22: { ref: 'PICOPS/TOYOTA, 22R.png', shadow: [655, 915], shTh: 145,
    layers: [['deep', '#131313'], ['char', '#282828'], ['gray', '#333333'], ['silver', '#C8C8C8'], ['darkred', 'SHADE:-14'], ['red2', 'SHADE:-7'], ['red', 'BODY'], ['amber', '#E69426'], ['white', '#FCFCFC']], zones: [] },
  hilux: { ref: 'PICOPS/TOYOTA, HILUX.png', shadow: [645, 915], shTh: 160,
    layers: [['deep', '#141414'], ['char', '#282828'], ['glass', '#797979'], ['silver', '#CBCBCB'], ['darkred', 'SHADE:-13'], ['red2', 'SHADE:-6'], ['red', 'BODY']], zones: [] },
  tacoma: { ref: 'PICOPS/TOYOTA, TACOMA.png', shadow: [655, 920], shTh: 155,
    layers: [['deep', '#0E0E0E'], ['dark', '#1E1E1E'], ['gray', '#323332'], ['glass', '#3E3E3E'], ['silver', '#C9C8C8'], ['darkred', 'SHADE:-13'], ['red2', 'SHADE:-6'], ['red', 'BODY']], zones: [] },
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
      const shT = C.shTh || 200;
      const refLight = ref[i * 3] >= shT && ref[i * 3 + 1] >= shT && ref[i * 3 + 2] >= shT;
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
