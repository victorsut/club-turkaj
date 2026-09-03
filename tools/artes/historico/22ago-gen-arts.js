// Genera los componentes Art (ensambladores puros, patrón GnArt) para
// los 8 modelos calcados — fills de referencia, capa de recolor → -body.
const fs = require('fs');
const OUT = 'C:/proyectos/club-turkaj/src/components/ui/';

// shadePct: capas que recoloran con shade(color, pct) (sombras del cuerpo)
const ARTS = [
  { key: 'boxer', comp: 'BoxerArt', file: 'BAJAJ, BOXER.png', tf: 'translate(18.5 7.9) scale(0.1289)',
    order: [['tire', '#1E2125'], ['black', '#343638'], ['gray', '#98999C'], ['silver', '#A9AAAD'], ['silver2', '#BBBCBF'], ['lightgray', '#CCCDD0'], ['red', 'BODY'], ['taillight', '#D02427'], ['spring', '#E02A28'], ['amber', '#F49C1F']] },
  { key: 'pulsar', comp: 'PulsarArt', file: 'BAJAJ, PULSAR.png', tf: 'translate(22.4 9.7) scale(0.1242)',
    order: [['black', '#1E252A'], ['dark2', '#2D3235'], ['slate', '#484B50'], ['midslate', '#6C6E71'], ['gray', '#85878A'], ['silver', '#B1B2B4'], ['red', 'BODY'], ['spring', '#E02A28']] },
  { key: 'activa', comp: 'ActivaArt', file: 'HONDA, ACTIVA.png', tf: 'translate(15.4 1) scale(0.1326)',
    order: [['tire', '#242628'], ['black', '#36383A'], ['darkgray', '#444649'], ['gray', '#96989C'], ['silver', '#BBBCBF'], ['lightgray', '#CCCDD0'], ['darkred', 'SHADE:-16'], ['red', 'BODY'], ['amber', '#F49C1F']] },
  { key: 'cgl', comp: 'CglArt', file: 'HONDA, CGL.png', tf: 'translate(27.5 14) scale(0.1185)',
    order: [['tire', '#242628'], ['black', '#343638'], ['darkgray', '#505255'], ['gray', '#98999C'], ['silver', '#A9AAAD'], ['silver2', '#BBBCBF'], ['lightgray', '#CCCDD0'], ['darkred', 'SHADE:-40'], ['red', 'BODY'], ['taillight', '#C0272B'], ['amber', '#F49C1F']] },
  { key: 'crf', comp: 'CrfArt', file: 'HONDA, CRF.png', tf: 'translate(23.5 11.4) scale(0.1241)',
    order: [['black', '#343639'], ['darkgray', '#444649'], ['navy', '#32344A'], ['mid', '#787A7E'], ['gray', '#98999C'], ['silver', '#BBBCBF'], ['lightgray', '#CCCDD0'], ['xlight', '#DDDEE0'], ['darkred', 'SHADE:-14'], ['red', 'BODY'], ['spring', '#E02A28'], ['white', '#F4F5F5']] },
  { key: 'gnh', comp: 'GnhArt', file: 'HONDA, GN.png', tf: 'translate(30.8 -13.5) scale(0.1403)',
    order: [['tire', '#1C1E20'], ['black', '#343638'], ['darkgray', '#545659'], ['gray', '#98999C'], ['silver', '#A9AAAD'], ['silver2', '#BBBCBF'], ['lightgray', '#D0D1D4'], ['xlight', '#DEDFE1'], ['red', 'BODY'], ['taillight', '#C0272B'], ['amber', '#F49C1F']] },
  { key: 'xr', comp: 'XrArt', file: 'HONDA, XR.png', tf: 'translate(23.7 7.4) scale(0.1259)',
    order: [['tire', '#20232B'], ['black', '#343639'], ['darkgray', '#64666A'], ['gray', '#787A7E'], ['silver', '#BBBCBF'], ['lightgray', '#CCCDD0'], ['xlight', '#DDDEE0'], ['red', 'BODY'], ['white', '#F2F3F3']] },
  { key: 'zeta', comp: 'ZetaArt', file: 'ITALIKA, Z.png', tf: 'translate(16.9 2.2) scale(0.1314)',
    order: [['tire', '#20282A'], ['dark', '#2E3436'], ['charcoal', '#3E4244'], ['gray', '#787A7E'], ['silver', '#A9AAAD'], ['lightgray', '#CCCDD2'], ['xlight', '#DDDEE0'], ['green', 'BODY'], ['white', '#F2F3F3']] },
];

for (const a of ARTS) {
  const EXPORT = a.key.toUpperCase() + '_TRACE';
  const usesShade = a.order.some(([, f]) => f.startsWith('SHADE:'));
  let s = `// src/components/ui/${a.comp}.jsx\n`;
  s += `// F6 E1.11 (19-ago-2026) — ${a.file.replace('.png', '')} VECTORIZADA de la\n`;
  s += `// referencia del dueño (REFERENCIAS INTERFAZ/VEHÍCULOS/${a.file})\n`;
  s += '// con el arnés paramétrico de calco (trace-multi): capas de color por\n';
  s += '// anclas MEDIDAS + potrace. Ensamblador PURO: cada capa lleva su tono\n';
  s += '// de referencia (cero profundidad dibujada — decisión E1.9f); la capa\n';
  s += `// de color recolorea vía el degradado -body del padre.\n`;
  if (usesShade) s += "import { shade } from './vehicleArtUtils.js';\n";
  s += `import { ${EXPORT} as T } from './${a.key}Trace.js';\n\n`;
  s += `export default function ${a.comp}({ uid${usesShade ? ', color' : ''} }) {\n`;
  s += '  return (\n    <g>\n';
  s += '      <ellipse cx={120} cy={132} rx={98} ry={8} fill="rgba(0,0,0,.20)" />\n';
  s += `      <g transform="${a.tf}">\n`;
  for (const [name, fill] of a.order) {
    let f;
    if (fill === 'BODY') f = '{`url(#${uid}-body)`}';
    else if (fill.startsWith('SHADE:')) f = `{shade(color, ${fill.slice(6)})}`;
    else f = `"${fill}"`;
    s += `        <path d={T.${name}} fill=${f} fillRule="evenodd" />\n`;
  }
  s += '      </g>\n    </g>\n  );\n}\n';
  fs.writeFileSync(OUT + a.comp + '.jsx', s);
  console.log(a.comp + '.jsx escrito');
}
