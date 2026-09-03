// Genera los componentes Art de la 2ª tanda (6 modelos).
const fs = require('fs');
const OUT = 'C:/proyectos/club-turkaj/src/components/ui/';

const ARTS = [
  { key: 'dita', comp: 'DitaArt', file: 'ITALIKA, D.png', tf: 'translate(22.1 4.5) scale(0.1287)',
    order: [['dark', '#242C32'], ['char2', '#343840'], ['char1', '#444652'], ['xlight', '#DCDDDF'], ['darkteal', 'SHADE:-18'], ['teal', 'BODY'], ['white', '#F2F3F3'], ['tailred', '#D02D32'], ['amber', '#EB962D']] },
  { key: 'dm', comp: 'DmArt', file: 'ITALIKA, DM.png', tf: 'translate(22.7 4.5) scale(0.1292)',
    order: [['dark', '#24282C'], ['black', '#343638'], ['silver', '#A9AAAD'], ['silver2', '#BBBCBF'], ['xlight', '#DBDCDE'], ['orange', 'BODY'], ['white', '#F2F3F3'], ['tailred', '#D73232']] },
  { key: 'ft', comp: 'FtArt', file: 'ITALIKA, FT.png', tf: 'translate(20.2 6.2) scale(0.1323)',
    order: [['dark', '#263036'], ['char', '#343842'], ['char2', '#42464A'], ['silver', '#A9AAAD'], ['xlight', '#DBDCDE'], ['orange', 'BODY'], ['tailred', '#D22D32'], ['amber', '#F0A028']] },
  { key: 'dr', comp: 'DrArt', file: 'SUZUKI, DR.png', tf: 'translate(18.8 -0.9) scale(0.1339)',
    order: [['black', '#32363A'], ['char', '#424648'], ['silver', '#A9AAAD'], ['silver2', '#BAC6C8'], ['lightgray', '#CCCED0'], ['red', 'BODY'], ['white', '#F2F3F3']] },
  { key: 'en', comp: 'EnArt', file: 'SUZUKI, EN.png', tf: 'translate(20.3 5.1) scale(0.1298)',
    order: [['dark', '#242C30'], ['black', '#323538'], ['silver', '#A9AAAD'], ['lightgray', '#CCCED0'], ['xlight', '#DBDCDE'], ['blue', 'BODY'], ['tailred', '#D22830'], ['amber', '#F0A028']] },
  { key: 'xtz', comp: 'XtzArt', file: 'YAMAHA, XTZ.png', tf: 'translate(19.6 3.3) scale(0.1304)',
    order: [['black', '#30343A'], ['slate', '#363A48'], ['silver', '#A9AAAD'], ['silver2', '#BBBCBF'], ['lightgray', '#CCCED0'], ['xlight', '#DBDCDE'], ['blue', 'BODY'], ['tailred', '#D72D30'], ['amber', '#F0A028']] },
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
