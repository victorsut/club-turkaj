// Genera los componentes Art de la 3ª tanda (Hero Eco, Hero XPulse,
// Yamaha YBR) — ensambladores PUROS (decisión E1.9f: cero profundidad
// dibujada; el color recolorea vía el degradado -body del padre).
const fs = require('fs');
const OUT = 'C:/proyectos/club-turkaj/src/components/ui/';

const ARTS = [
  { key: 'eco', comp: 'EcoArt', file: 'HERO, ECO.png', tf: 'translate(19.3 8.6) scale(0.1288)',
    order: [['dark', '#2E3235'], ['black', '#363A3D'], ['char2', '#3D4245'], ['char', '#44494C'], ['midgray', '#7D7E80'], ['gray', '#A0A0A1'], ['silver', '#B5B5B5'], ['silver2', '#C8C8C8'], ['red', 'BODY'], ['springsilver', '#A6A6A7'], ['amber', '#ED7727']] },
  { key: 'xpulse', comp: 'XpulseArt', file: 'HERO, XPULSE.png', tf: 'translate(19.8 5.9) scale(0.1291)',
    order: [['dark', '#313941'], ['cap', '#3C434B'], ['char', '#494E53'], ['gray', '#87888B'], ['silver', '#B5B4B4'], ['lightgray', '#D2D2D3'], ['red', 'BODY'], ['taillight', '#D91F1E'], ['hubdot', '#D2D2D3']] },
  { key: 'ybr', comp: 'YbrArt', file: 'YAMAHA, YBR.png', tf: 'translate(18.9 5.2) scale(0.1304)',
    order: [['black', '#313538'], ['char', '#383D42'], ['darkgray', '#6F7073'], ['gray', '#949494'], ['silver', '#B5B5B6'], ['silver2', '#BEBEBF'], ['silver3', '#C5C5C6'], ['orange', 'BODY'], ['tailred', '#C91D20'], ['amber', '#E05E0E']] },
];

for (const a of ARTS) {
  const EXPORT = a.key.toUpperCase() + '_TRACE';
  let s = `// src/components/ui/${a.comp}.jsx\n`;
  s += `// F6 E1.12 (22-ago-2026) — ${a.file.replace('.png', '')} VECTORIZADA de la\n`;
  s += `// referencia del dueño (REFERENCIAS INTERFAZ/VEHÍCULOS/MOTOS/${a.file})\n`;
  s += '// con el arnés paramétrico de calco (trace-motos): capas de color por\n';
  s += '// anclas MEDIDAS + potrace. Ensamblador PURO: cada capa lleva su tono\n';
  s += '// de referencia (cero profundidad dibujada — decisión E1.9f); la capa\n';
  s += `// de color recolorea vía el degradado -body del padre.\n`;
  s += `import { ${EXPORT} as T } from './${a.key}Trace.js';\n\n`;
  s += `export default function ${a.comp}({ uid }) {\n`;
  s += '  return (\n    <g>\n';
  s += '      <ellipse cx={120} cy={132} rx={98} ry={8} fill="rgba(0,0,0,.20)" />\n';
  s += `      <g transform="${a.tf}">\n`;
  for (const [name, fill] of a.order) {
    const f = fill === 'BODY' ? '{`url(#${uid}-body)`}' : `"${fill}"`;
    s += `        <path d={T.${name}} fill=${f} fillRule="evenodd" />\n`;
  }
  s += '      </g>\n    </g>\n  );\n}\n';
  fs.writeFileSync(OUT + a.comp + '.jsx', s);
  console.log(a.comp + '.jsx escrito');
}
