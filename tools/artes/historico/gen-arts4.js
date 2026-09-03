// Regenera los 8 componentes Art corregidos en E1.13 (feedback del
// dueño 22-ago) — ensambladores PUROS, mismo patrón de gen-arts/2/3.
const fs = require('fs');
const OUT = 'C:/proyectos/club-turkaj/src/components/ui/';

const ARTS = [
  { key: 'eco', comp: 'EcoArt', file: 'HERO, ECO.png', tf: 'translate(19.3 8.6) scale(0.1288)',
    order: [['black', '#363A3D'], ['char', '#44494C'], ['midgray', '#7D7E80'], ['gray', '#A0A0A1'], ['silver', '#B5B5B5'], ['silver2', '#C8C8C8'], ['red', 'BODY'], ['springsilver', '#A6A6A7'], ['amber', '#ED7727']] },
  { key: 'crf', comp: 'CrfArt', file: 'HONDA, CRF.png', tf: 'translate(23.5 11.4) scale(0.1241)',
    order: [['black', '#343639'], ['darkgray', '#444649'], ['navy', '#32344A'], ['mid', '#787A7E'], ['gray', '#98999C'], ['silver', '#BBBCBF'], ['lightgray', '#CCCDD0'], ['xlight', '#DDDEE0'], ['darkred', 'SHADE:-14'], ['red', 'BODY'], ['white', '#F4F5F5']] },
  { key: 'xr', comp: 'XrArt', file: 'HONDA, XR.png', tf: 'translate(23.7 7.4) scale(0.1259)',
    order: [['tire', '#20232B'], ['black', '#343639'], ['darkgray', '#64666A'], ['gray', '#787A7E'], ['silver', '#BBBCBF'], ['lightgray', '#CCCDD0'], ['xlight', '#DDDEE0'], ['red', 'BODY'], ['white', '#F2F3F3']] },
  { key: 'zeta', comp: 'ZetaArt', file: 'ITALIKA, Z.png', tf: 'translate(16.9 2.2) scale(0.1314)',
    order: [['tire', '#20282A'], ['dark', '#2E3436'], ['charcoal', '#3E4244'], ['gray', '#787A7E'], ['silver', '#A9AAAD'], ['lightgray', '#CCCDD2'], ['xlight', '#DDDEE0'], ['green', 'BODY'], ['white', '#EDEDED']] },
  { key: 'dita', comp: 'DitaArt', file: 'ITALIKA, D.png', tf: 'translate(22.1 4.5) scale(0.1287)',
    order: [['dk1', '#343B40'], ['dk5', '#434B52'], ['xlight', '#DCDCDC'], ['darkteal', 'SHADE:-18'], ['teal', 'BODY'], ['white', '#EBEBEB'], ['ring', '#DCDCDC'], ['tailred', '#D13C3C'], ['amber', '#EB962D']] },
  { key: 'dm', comp: 'DmArt', file: 'ITALIKA, DM.png', tf: 'translate(22.7 4.5) scale(0.1292)',
    order: [['dark', '#24282C'], ['black', '#343638'], ['silver', '#AAABAD'], ['silver15', '#B2B3B5'], ['silver2', '#BBBCBF'], ['xlight', '#DBDCDE'], ['darkorange', 'SHADE:-22'], ['orange', 'BODY'], ['tailred', '#D73232']] },
  { key: 'ft', comp: 'FtArt', file: 'ITALIKA, FT.png', tf: 'translate(20.1 5.8) scale(0.1327)',
    order: [['f1', '#2B3237'], ['f2', '#373D42'], ['f3', '#43494D'], ['gray', '#8C8D8E'], ['silver', '#AAABAC'], ['orange', 'BODY'], ['tailred', '#D22D32']] },
  { key: 'xtz', comp: 'XtzArt', file: 'YAMAHA, XTZ.png', tf: 'translate(19.6 3.3) scale(0.1304)',
    order: [['black', '#30343A'], ['slate', '#363A48'], ['silver', '#A9AAAD'], ['silver2', '#BBBCBF'], ['lightgray', '#CCCED0'], ['xlight', '#DBDCDE'], ['blue', 'BODY'], ['tailred', '#D72D30'], ['amber', '#F0A028']] },
];

for (const a of ARTS) {
  const EXPORT = a.key.toUpperCase() + '_TRACE';
  const usesShade = a.order.some(([, f]) => f.startsWith('SHADE:'));
  let s = `// src/components/ui/${a.comp}.jsx\n`;
  s += `// F6 E1.13 (22-ago-2026) — ${a.file.replace('.png', '')} recalcada con las\n`;
  s += `// correcciones del dueño (REFERENCIAS INTERFAZ/VEHÍCULOS/MOTOS/${a.file}):\n`;
  s += '// arnés trace-motos con anclas finas fusionadas (mergeInto), whiteBox\n';
  s += '// con tope superior (el fondo IA 250-253 ya no se pinta de blanco) y\n';
  s += '// despeckle de islas blancas. Ensamblador PURO (decisión E1.9f); la\n';
  s += `// capa de color recolorea vía el degradado -body del padre.\n`;
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
