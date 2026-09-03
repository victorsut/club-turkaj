// Genera los 9 *Art.jsx de la TANDA 9 desde MODELS (trace-mix.cjs):
// capas = M.order; la banda PRINCIPAL del cuerpo (bodyNames[0]) → {color}
// PLANO (regla E1.19: ≥3 bandas → sin degradado encima); las demás bandas
// del cuerpo → shade(color, delta en el canal dominante); resto → fill fijo.
const fs = require('fs');
const { MODELS } = require('./trace-mix.cjs');
const OUT = 'C:/proyectos/club-turkaj/src/components/ui/';

const META = {
  grace:  ['GraceArt', 'GRACE_TRACE', 'graceTrace', 'translate(29 18.2) scale(0.118)'],
  h1:     ['H1Art', 'H1_TRACE', 'h1Trace', 'translate(30.5 21.5) scale(0.1176)'],
  pregio: ['PregioArt', 'PREGIO_TRACE', 'pregioTrace', 'translate(28.4 16.3) scale(0.1195)'],
  urvan:  ['UrvanArt', 'URVAN_TRACE', 'urvanTrace', 'translate(28.2 15.8) scale(0.119)'],
  hiace:  ['HiaceArt', 'HIACE_TRACE', 'hiaceTrace', 'translate(24.6 13.4) scale(0.1227)'],
  torito: ['ToritoArt', 'TORITO_TRACE', 'toritoTrace', 'translate(18.5 -2.6) scale(0.1317)'],
  ape:    ['ApeArt', 'APE_TRACE', 'apeTrace', 'translate(6.7 -6.4) scale(0.1388)'],
  h100:   ['H100Art', 'H100_TRACE', 'h100Trace', 'translate(16.4 5.9) scale(0.1316)'],
  k2700:  ['K2700Art', 'K2700_TRACE', 'k2700Trace', 'translate(18 8.6) scale(0.1318)'],
  // E1.23: referencias RENOVADAS por el dueño (estilo plano verde)
  mazda3: ['Mazda3Art', 'MAZDA3_TRACE', 'mazda3Trace', 'translate(26.3 21.6) scale(0.1225)'],
  yaris:  ['YarisArt', 'YARIS_TRACE', 'yarisTrace', 'translate(20.2 15.7) scale(0.129)'],
};

for (const [key, [comp, exp, trace, tf]] of Object.entries(META)) {
  const M = MODELS[key];
  const main = M.classes.find(c => c.name === M.bodyNames[0]);
  const ch = main.rgb.indexOf(Math.max(...main.rgb)); // canal dominante del cuerpo
  const isBody = (n) => M.bodyNames.includes(n);
  let s = `// src/components/ui/${comp}.jsx\n`;
  s += `// F6 TANDA 9 (2-sep-2026) — micro bus / moto taxi / camión ligero.\n`;
  s += `// Cuerpo recoloreable por bandas PLANAS (regla E1.19: el sombreado ya\n`;
  s += `// viene codificado en las bandas de la referencia); cada banda extra\n`;
  s += `// recolorea con shade(color, delta). GENERADO por gen-arts-mix.cjs —\n`;
  s += `// regenerar con el arnés, no editar a mano. Vectorizada de\n`;
  s += `// REFERENCIAS INTERFAZ/VEHÍCULOS/${M.file}.\n`;
  s += `import { shade } from './vehicleArtUtils.js';\n`;
  s += `import { ${exp} as T } from './${trace}.js';\n\n`;
  s += `export default function ${comp}({ uid, color }) {\n`;
  s += `  return (\n    <g>\n`;
  s += `      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />\n`;
  s += `      <g transform="${tf}">\n`;
  for (const name of M.order) {
    let f;
    if (name === M.bodyNames[0]) f = '{color}';
    else if (isBody(name)) {
      const c = M.classes.find(x => x.name === name);
      f = `{shade(color, ${c.rgb[ch] - main.rgb[ch]})}`;
    } else f = `{"${M.fills[name]}"}`;
    s += `        <path d={T.${name}} fill=${f} fillRule="evenodd" />\n`;
  }
  s += `      </g>\n    </g>\n  );\n}\n`;
  fs.writeFileSync(OUT + comp + '.jsx', s);
  console.log(comp + '.jsx', M.order.length, 'capas');
}
