// Genera los 7 *Art.jsx de la tanda PICOPS (E1.16).
const fs = require('fs');
const OUT = 'C:/proyectos/club-turkaj/src/components/ui/';

const MODELS = {
  dmax:      { comp: 'DmaxArt',      exp: 'DMAX_TRACE',      trace: 'dmaxTrace',      ref: 'PICOPS/ISUZU, DMAX.png',        tf: 'translate(27.2 22.5) scale(0.1203)',
    layers: [['deep', "'#161615'"], ['char', "'#282827'"], ['gray', "'#353535'"], ['silver', "'#B6B5B5'"], ['darkred', -28], ['red2', -14], ['red', 'BODY']] },
  gladiator: { comp: 'GladiatorArt', exp: 'GLADIATOR_TRACE', trace: 'gladiatorTrace', ref: 'PICOPS/JEEP, GLADIATOR.png',    tf: 'translate(30.1 24.8) scale(0.117)',
    layers: [['deep', "'#171716'"], ['char', "'#292928'"], ['gray2', "'#3A3A3A'"], ['silver', "'#B4B3B3'"], ['darkred', -28], ['red2', -14], ['red', 'BODY']] },
  l200:      { comp: 'L200Art',      exp: 'L200_TRACE',      trace: 'l200Trace',      ref: 'PICOPS/MITSUBISHI, L200.png',   tf: 'translate(25 21.5) scale(0.1223)',
    layers: [['deep', "'#1D1D1C'"], ['char', "'#282828'"], ['gray2', "'#3B3B3B'"], ['glass', "'#4A4A4A'"], ['silver', "'#BDBDBD'"], ['darkred', -28], ['red2', -14], ['red', 'BODY']] },
  frontier:  { comp: 'FrontierArt',  exp: 'FRONTIER_TRACE',  trace: 'frontierTrace',  ref: 'PICOPS/NISSAN, FRONTIER.png',   tf: 'translate(26.4 24.8) scale(0.1197)',
    layers: [['deep', "'#151515'"], ['char', "'#282828'"], ['gray2', "'#3B3B3A'"], ['glass', "'#515150'"], ['silver', "'#C3C3C3'"], ['darkred', -24], ['red2', -12], ['red', 'BODY']] },
  r22:       { comp: 'R22Art',       exp: 'R22_TRACE',       trace: 'r22Trace',       ref: 'PICOPS/TOYOTA, 22R.png',        tf: 'translate(28.3 24.1) scale(0.1196)',
    layers: [['deep', "'#131313'"], ['char', "'#282828'"], ['gray', "'#333333'"], ['silver', "'#C8C8C8'"], ['darkred', -32], ['red2', -16], ['red', 'BODY'], ['amber', "'#E69426'"], ['white', "'#FCFCFC'"]] },
  hilux:     { comp: 'HiluxArt',     exp: 'HILUX_TRACE',     trace: 'hiluxTrace',     ref: 'PICOPS/TOYOTA, HILUX.png',      tf: 'translate(23.1 22.4) scale(0.123)',
    layers: [['deep', "'#141414'"], ['char', "'#282828'"], ['glass', "'#797979'"], ['silver', "'#CBCBCB'"], ['darkred', -28], ['red2', -14], ['red', 'BODY']] },
  tacoma:    { comp: 'TacomaArt',    exp: 'TACOMA_TRACE',    trace: 'tacomaTrace',    ref: 'PICOPS/TOYOTA, TACOMA.png',     tf: 'translate(26.4 22.8) scale(0.1212)',
    layers: [['deep', "'#0E0E0E'"], ['dark', "'#1E1E1E'"], ['gray', "'#323332'"], ['glass', "'#3E3E3E'"], ['silver', "'#C9C8C8'"], ['darkred', -28], ['red2', -14], ['red', 'BODY']] },
};

for (const [key, M] of Object.entries(MODELS)) {
  const usesShade = M.layers.some(([, f]) => typeof f === 'number');
  let s = `// src/components/ui/${M.comp}.jsx\n`;
  s += `// F6 E1.16 (24-ago-2026) — tanda PICOPS: vectorizada de\n`;
  s += `// REFERENCIAS INTERFAZ/VEHÍCULOS/${M.ref} con el arnés trace-autos\n`;
  s += `// (anclas finas de rojo fusionadas, elipses de rin exentas de la\n`;
  s += `// sombra Y del despeckle, motas de líneas de panel absorbidas al\n`;
  s += `// vecino de color). Ensamblador PURO (decisión E1.9f); la capa de\n`;
  s += `// color recolorea vía el degradado -body del padre.\n`;
  if (usesShade) s += `import { shade } from './vehicleArtUtils.js';\n`;
  s += `import { ${M.exp} as T } from './${M.trace}.js';\n\n`;
  s += `export default function ${M.comp}({ uid${usesShade ? ', color' : ''} }) {\n`;
  s += `  return (\n    <g>\n`;
  s += `      <ellipse cx={120} cy={132} rx={100} ry={8} fill="rgba(0,0,0,.20)" />\n`;
  s += `      <g transform="${M.tf}">\n`;
  for (const [name, fill] of M.layers) {
    const f = fill === 'BODY' ? '{`url(#${uid}-body)`}'
      : typeof fill === 'number' ? `{shade(color, ${fill})}`
      : `{${fill.replace(/'/g, '"')}}`;
    s += `        <path d={T.${name}} fill=${f} fillRule="evenodd" />\n`;
  }
  s += `      </g>\n    </g>\n  );\n}\n`;
  fs.writeFileSync(OUT + M.comp + '.jsx', s);
  console.log(M.comp + '.jsx');
}
