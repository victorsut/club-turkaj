// E1.18 — genera los 22 *Art.jsx AUTOMÁTICAMENTE desde MODELS (trace-autos
// exporta las configs): capas = M.order; 'red' → degradado -body; demás
// bandas rojas → shade(color, deltaR vs red); resto → fill fijo del config.
const fs = require('fs');
const { MODELS } = require('./trace-autos.js');
const OUT = 'C:/proyectos/club-turkaj/src/components/ui/';

const META = { // comp, export, archivo trace, transform (bbox estable)
  civic:    ['CivicArt', 'CIVIC_TRACE', 'civicTrace', 'translate(25 22.8) scale(0.124)'],
  accent:   ['AccentArt', 'ACCENT_TRACE', 'accentTrace', 'translate(23.8 22.4) scale(0.1233)'],
  picanto:  ['PicantoArt', 'PICANTO_TRACE', 'picantoTrace', 'translate(20.4 14.4) scale(0.1285)'],
  rio:      ['RioArt', 'RIO_TRACE', 'rioTrace', 'translate(23.7 21.8) scale(0.1234)'],
  mazda3:   ['Mazda3Art', 'MAZDA3_TRACE', 'mazda3Trace', 'translate(26.3 23.7) scale(0.1226)'],
  corolla:  ['CorollaArt', 'COROLLA_TRACE', 'corollaTrace', 'translate(19.5 18.3) scale(0.13)'],
  yaris:    ['YarisArt', 'YARIS_TRACE', 'yarisTrace', 'translate(20.4 18.3) scale(0.1288)'],
  xb:       ['XbArt', 'XB_TRACE', 'xbTrace', 'translate(22.2 15.2) scale(0.1282)'],
  xd:       ['XdArt', 'XD_TRACE', 'xdTrace', 'translate(23.9 18.8) scale(0.1239)'],
  crv:      ['CrvArt', 'CRV_TRACE', 'crvTrace', 'translate(25.7 21.9) scale(0.1233)'],
  tucson:   ['TucsonArt', 'TUCSON_TRACE', 'tucsonTrace', 'translate(24.9 21) scale(0.1247)'],
  sportage: ['SportageArt', 'SPORTAGE_TRACE', 'sportageTrace', 'translate(24.6 21.5) scale(0.1242)'],
  cx5:      ['Cx5Art', 'CX5_TRACE', 'cx5Trace', 'translate(26.9 23) scale(0.1214)'],
  runner:   ['RunnerArt', 'RUNNER_TRACE', 'runnerTrace', 'translate(22.3 17.4) scale(0.125)'],
  rav4:     ['Rav4Art', 'RAV4_TRACE', 'rav4Trace', 'translate(25.3 21.5) scale(0.1227)'],
  dmax:     ['DmaxArt', 'DMAX_TRACE', 'dmaxTrace', 'translate(27.2 22.5) scale(0.1203)'],
  gladiator:['GladiatorArt', 'GLADIATOR_TRACE', 'gladiatorTrace', 'translate(30.1 24.8) scale(0.117)'],
  l200:     ['L200Art', 'L200_TRACE', 'l200Trace', 'translate(25 21.5) scale(0.1223)'],
  frontier: ['FrontierArt', 'FRONTIER_TRACE', 'frontierTrace', 'translate(26.4 24.8) scale(0.1197)'],
  r22:      ['R22Art', 'R22_TRACE', 'r22Trace', 'translate(28.3 24.1) scale(0.1196)'],
  hilux:    ['HiluxArt', 'HILUX_TRACE', 'hiluxTrace', 'translate(23.1 22.4) scale(0.123)'],
  tacoma:   ['TacomaArt', 'TACOMA_TRACE', 'tacomaTrace', 'translate(26.4 22.8) scale(0.1212)'],
};

for (const [key, [comp, exp, trace, tf]] of Object.entries(META)) {
  const M = MODELS[key];
  const isRed = (n) => { const c = M.classes.find(x => x.name === n); return c && c.rgb && c.rgb[0] - c.rgb[1] > 60; };
  const mainRed = M.classes.find(c => c.name === 'red');
  const usesShade = M.order.some(n => isRed(n) && n !== 'red');
  let s = `// src/components/ui/${comp}.jsx\n`;
  s += `// F6 E1.18 (24-ago-2026) — ronda de INTERPRETACIÓN (decisión del dueño:\n`;
  s += `// mostrar el modelo TAL CUAL la referencia): lámparas estructuradas\n`;
  s += `// (lente plata + destello blanco + elementos oscuros vía cajas de faro),\n`;
  s += `// degradado del cuerpo con TODAS las bandas finas de rojo (cada banda\n`;
  s += `// recolorea con shade(color, deltaR)) y ámbares fijos donde la\n`;
  s += `// referencia los tiene. GENERADO por gen-arts-auto.js — regenerar con\n`;
  s += `// el arnés, no editar a mano. Vectorizada de\n`;
  s += `// REFERENCIAS INTERFAZ/VEHÍCULOS/${M.file}.\n`;
  if (usesShade) s += `import { shade } from './vehicleArtUtils.js';\n`;
  s += `import { ${exp} as T } from './${trace}.js';\n\n`;
  s += `export default function ${comp}({ uid${usesShade ? ', color' : ''} }) {\n`;
  s += `  return (\n    <g>\n`;
  s += `      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />\n`;
  s += `      <g transform="${tf}">\n`;
  for (const name of M.order) {
    const nRed = M.classes.filter(c => c.rgb && c.rgb[0] - c.rgb[1] > 60).length;
    let f;
    if (name === 'red') f = nRed >= 3 ? '{color}' : '{`url(#${uid}-body)`}';
    else if (isRed(name)) f = `{shade(color, ${M.classes.find(c => c.name === name).rgb[0] - mainRed.rgb[0]})}`;
    else f = `{"${M.fills[name]}"}`;
    s += `        <path d={T.${name}} fill=${f} fillRule="evenodd" />\n`;
  }
  s += `      </g>\n    </g>\n  );\n}\n`;
  fs.writeFileSync(OUT + comp + '.jsx', s);
  console.log(comp + '.jsx', M.order.length, 'capas');
}
