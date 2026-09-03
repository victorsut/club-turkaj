// Render del ESTADO ACTUAL en producción de los modelos a corregir:
// pila de capas de cada *Art.jsx sobre tarjeta negra con recolor.
const sharp = require('C:/proyectos/club-turkaj/node_modules/sharp');
const fs = require('fs');
const O = __dirname;

const STACKS = {
  eco:  { col: '#2F5BD7', layers: [['black', '#363A3D'], ['char', '#44494C'], ['midgray', '#7D7E80'], ['gray', '#A0A0A1'], ['silver', '#B5B5B5'], ['silver2', '#C8C8C8'], ['red', 'BODY'], ['springsilver', '#A6A6A7'], ['amber', '#ED7727']] },
  crf:  { col: '#2F5BD7', layers: [['black', '#343639'], ['darkgray', '#444649'], ['navy', '#32344A'], ['mid', '#787A7E'], ['gray', '#98999C'], ['silver', '#BBBCBF'], ['lightgray', '#CCCDD0'], ['xlight', '#DDDEE0'], ['darkred', 'SHADE:-14'], ['red', 'BODY'], ['white', '#F4F5F5']] },
  xr:   { col: '#2F5BD7', layers: [['tire', '#20232B'], ['black', '#343639'], ['darkgray', '#64666A'], ['gray', '#787A7E'], ['silver', '#BBBCBF'], ['lightgray', '#CCCDD0'], ['xlight', '#DDDEE0'], ['red', 'BODY'], ['white', '#F2F3F3']] },
  zeta: { col: '#2F5BD7', layers: [['tire', '#20282A'], ['dark', '#2E3436'], ['charcoal', '#3E4244'], ['gray', '#787A7E'], ['silver', '#A9AAAD'], ['lightgray', '#CCCDD2'], ['xlight', '#DDDEE0'], ['green', 'BODY'], ['white', '#EDEDED']] },
  dita: { col: '#2F5BD7', layers: [['dk1', '#343B40'], ['dk5', '#434B52'], ['xlight', '#DCDCDC'], ['darkteal', 'SHADE:-18'], ['teal', 'BODY'], ['white', '#EBEBEB'], ['ring', '#DCDCDC'], ['tailred', '#D13C3C'], ['amber', '#EB962D']] },
  dm:   { col: '#2F5BD7', layers: [['dark', '#24282C'], ['black', '#343638'], ['silver', '#AAABAD'], ['silver15', '#B2B3B5'], ['silver2', '#BBBCBF'], ['xlight', '#DBDCDE'], ['darkorange', 'SHADE:-22'], ['orange', 'BODY'], ['white', '#F2F3F3'], ['tailred', '#D73232']] },
  ft:   { col: '#2F5BD7', layers: [['f1', '#2B3237'], ['f2', '#373D42'], ['f3', '#43494D'], ['gray', '#8C8D8E'], ['silver', '#AAABAC'], ['xlight', '#DCDCDE'], ['orange', 'BODY'], ['tailred', '#D22D32'], ['amber', '#F0A028']] },
  xtz:  { col: '#C62828', layers: [['black', '#30343A'], ['slate', '#363A48'], ['silver', '#A9AAAD'], ['silver2', '#BBBCBF'], ['lightgray', '#CCCED0'], ['xlight', '#DBDCDE'], ['blue', 'BODY'], ['tailred', '#D72D30'], ['amber', '#F0A028']] },
};

function shade(hex, pct) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + (pct / 100) * (pct > 0 ? 255 - v : v))));
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(f).map(v => v.toString(16).padStart(2, '0')).join('');
}

(async () => {
  for (const [key, C] of Object.entries(STACKS)) {
    const txt = fs.readFileSync(`C:/proyectos/club-turkaj/src/components/ui/${key}Trace.js`, 'utf8');
    const body = txt.slice(txt.indexOf('= {') + 2, txt.lastIndexOf('};') + 1);
    const T = eval('(' + body + ')');
    let g = `<defs><linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${shade(C.col, 18)}"/><stop offset="100%" stop-color="${shade(C.col, -14)}"/>
    </linearGradient></defs>`;
    for (const [name, fill] of C.layers) {
      if (!T[name]) continue;
      const f = fill === 'BODY' ? 'url(#body)' : fill.startsWith('SHADE:') ? shade(C.col, +fill.slice(6)) : fill;
      g += `<path d="${T[name]}" fill="${f}" fill-rule="evenodd"/>`;
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024"><rect width="100%" height="100%" fill="#232428"/>${g}</svg>`;
    await sharp(Buffer.from(svg)).png().toFile(`${O}/${key}-cur-black.png`);
    await sharp(`${O}/${key}-cur-black.png`).resize({ width: 880 }).toFile(`${O}/${key}-cur-small.png`);
    console.log(key, 'ok');
  }
})();
