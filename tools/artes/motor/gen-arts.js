// Genera los 15 *Art.jsx de la tanda AUTOS LIVIANOS + SUV (E1.15).
// Ensambladores PUROS (regla E1.9f): capas calcadas + sombra elipse;
// 'BODY' = degradado -body del padre; números = shade(color, unidades).
const fs = require('fs');
const OUT = 'C:/proyectos/club-turkaj/src/components/ui/';

const MODELS = {
  civic:    { comp: 'CivicArt',    exp: 'CIVIC_TRACE',    trace: 'civicTrace',    ref: 'AUTOS LIVIANOS/HONDA, CIVIC.png',    tf: 'translate(25 22.8) scale(0.124)',
    layers: [['black', "'#333537'"], ['dark', "'#3F4041'"], ['gray', "'#969696'"], ['silver', "'#C0C0C0'"], ['glass', "'#D4D4D4'"], ['darkred', -26], ['red', 'BODY'], ['white', "'#FBFAFA'"]] },
  accent:   { comp: 'AccentArt',   exp: 'ACCENT_TRACE',   trace: 'accentTrace',   ref: 'AUTOS LIVIANOS/HYUNDAI, ACCENT.png', tf: 'translate(23.8 22.4) scale(0.1233)',
    layers: [['black', "'#313333'"], ['dark', "'#3E3F40'"], ['gray', "'#969696'"], ['silver', "'#BFBEBE'"], ['glass', "'#CFCECE'"], ['darkred', -18], ['red', 'BODY'], ['white', "'#FAF9F9'"]] },
  picanto:  { comp: 'PicantoArt',  exp: 'PICANTO_TRACE',  trace: 'picantoTrace',  ref: 'AUTOS LIVIANOS/KIA, PICANTO.png',    tf: 'translate(20.4 14.4) scale(0.1285)',
    layers: [['black', "'#2A2A29'"], ['dark', "'#363635'"], ['gray', "'#848483'"], ['glass', "'#BEBEBE'"], ['silver', "'#D3D3D3'"], ['darkred', -13], ['red', 'BODY'], ['white', "'#F8F8F8'"]] },
  rio:      { comp: 'RioArt',      exp: 'RIO_TRACE',      trace: 'rioTrace',      ref: 'AUTOS LIVIANOS/KIA, RIO.png',        tf: 'translate(23.7 21.8) scale(0.1234)',
    layers: [['deep', "'#1E1E1D'"], ['dark', "'#323232'"], ['gray', "'#828181'"], ['glass', "'#B0B0B0'"], ['silver', "'#C9C8C8'"], ['lightgray', "'#D5D5D5'"], ['darkred', -13], ['red', 'BODY'], ['white', "'#F9F8F8'"]] },
  mazda3:   { comp: 'Mazda3Art',   exp: 'MAZDA3_TRACE',   trace: 'mazda3Trace',   ref: 'AUTOS LIVIANOS/MAZDA, MAZDA 3.png',  tf: 'translate(26.3 23.7) scale(0.1226)',
    layers: [['black', "'#313335'"], ['dark', "'#3F4041'"], ['gray', "'#969696'"], ['glass', "'#CBCBCB'"], ['silver', "'#D4D4D4'"], ['darkred', -18], ['red', 'BODY'], ['white', "'#E4E4E4'"]] },
  corolla:  { comp: 'CorollaArt',  exp: 'COROLLA_TRACE',  trace: 'corollaTrace',  ref: 'AUTOS LIVIANOS/TOYOTA, COROLLA.png', tf: 'translate(19.5 18.3) scale(0.13)',
    layers: [['slate', "'#2F363B'"], ['slate2', "'#3A4043'"], ['gray', "'#969696'"], ['glass', "'#CCCBCB'"], ['red', 'BODY'], ['white', "'#FCFBFB'"]] },
  yaris:    { comp: 'YarisArt',    exp: 'YARIS_TRACE',    trace: 'yarisTrace',    ref: 'AUTOS LIVIANOS/TOYOTA, YARIS.png',   tf: 'translate(20.4 18.3) scale(0.1288)',
    layers: [['black', "'#313436'"], ['dark', "'#3D4042'"], ['gray', "'#969696'"], ['glass', "'#CCCBCB'"], ['red', 'BODY'], ['white', "'#FAFAFA'"]] },
  xb:       { comp: 'XbArt',       exp: 'XB_TRACE',       trace: 'xbTrace',       ref: 'AUTOS LIVIANOS/SCION, XB.png',       tf: 'translate(22.2 15.2) scale(0.1282)',
    layers: [['black', "'#1D1D1D'"], ['dark', "'#2D2D2C'"], ['silver', "'#B9B8B8'"], ['lightgray', "'#C8C8C8'"], ['darkred', -40], ['red2', -16], ['red', 'BODY'], ['white', "'#F2F2F2'"]] },
  xd:       { comp: 'XdArt',       exp: 'XD_TRACE',       trace: 'xdTrace',       ref: 'AUTOS LIVIANOS/SCION, XD.png',       tf: 'translate(23.9 18.8) scale(0.1239)',
    layers: [['black', "'#131313'"], ['char', "'#282828'"], ['silver', "'#B9B8B8'"], ['lightgray', "'#DEDDDD'"], ['darkred', -36], ['red2', -14], ['red', 'BODY'], ['white', "'#F4F4F4'"]] },
  crv:      { comp: 'CrvArt',      exp: 'CRV_TRACE',      trace: 'crvTrace',      ref: 'SUV/HONDA, CR-V.png',                tf: 'translate(25.7 21.9) scale(0.1233)',
    layers: [['deep', "'#181818'"], ['char', "'#2C2C2C'"], ['silver', "'#BAB8B8'"], ['darkred', -14], ['red', 'BODY'], ['white', "'#F0EFEF'"]] },
  tucson:   { comp: 'TucsonArt',   exp: 'TUCSON_TRACE',   trace: 'tucsonTrace',   ref: 'SUV/HYUNDAI, TUCSON.png',            tf: 'translate(24.9 21) scale(0.1247)',
    layers: [['deep', "'#161614'"], ['char', "'#292929'"], ['silver', "'#BAB8B8'"], ['darkred', -24], ['red2', -12], ['red', 'BODY'], ['white', "'#E9E8E8'"]] },
  sportage: { comp: 'SportageArt', exp: 'SPORTAGE_TRACE', trace: 'sportageTrace', ref: 'SUV/KIA, SPORTAGE.png',              tf: 'translate(24.6 21.5) scale(0.1242)',
    layers: [['deep', "'#151513'"], ['char', "'#2A2A29'"], ['silver', "'#BBBABA'"], ['darkred', -26], ['red2', -12], ['red', 'BODY'], ['white', "'#EFEFEF'"]] },
  cx5:      { comp: 'Cx5Art',      exp: 'CX5_TRACE',      trace: 'cx5Trace',      ref: 'SUV/MAZDA, CX-5.png',                tf: 'translate(26.9 23) scale(0.1214)',
    layers: [['deep', "'#151513'"], ['char', "'#2A2A29'"], ['gray2', "'#3D3D3D'"], ['trim', "'#4F4F4E'"], ['silver', "'#BEBDBD'"], ['darkred', -25], ['red2', -12], ['red', 'BODY'], ['white', "'#E9E9E9'"]] },
  runner:   { comp: 'RunnerArt',   exp: 'RUNNER_TRACE',   trace: 'runnerTrace',   ref: 'SUV/TOYOTA, 4RUNNER.png',            tf: 'translate(22.3 17.4) scale(0.125)',
    layers: [['deep', "'#161616'"], ['char', "'#282827'"], ['silver', "'#B7B6B6'"], ['darkred', -25], ['red2', -12], ['red', 'BODY'], ['white', "'#FBFBFB'"]] },
  rav4:     { comp: 'Rav4Art',     exp: 'RAV4_TRACE',     trace: 'rav4Trace',     ref: 'SUV/TOYOTA, RAV4.png',               tf: 'translate(25.3 21.5) scale(0.1227)',
    layers: [['deep', "'#151515'"], ['char', "'#292929'"], ['glass', "'#3A3A3A'"], ['silver', "'#BBBABA'"], ['darkred', -27], ['red2', -13], ['red', 'BODY'], ['white', "'#EFEFEF'"]] },
};

for (const [key, M] of Object.entries(MODELS)) {
  const usesShade = M.layers.some(([, f]) => typeof f === 'number');
  let s = `// src/components/ui/${M.comp}.jsx\n`;
  s += `// F6 E1.15 (24-ago-2026) — tanda AUTOS LIVIANOS + SUV: vectorizada de\n`;
  s += `// REFERENCIAS INTERFAZ/VEHÍCULOS/${M.ref} con el arnés trace-autos\n`;
  s += `// (anclas finas de rojo fusionadas, sombra de piso por banda con\n`;
  s += `// elipses de rin exentas, blancos de faros por whiteBox espacial).\n`;
  s += `// Ensamblador PURO (decisión E1.9f); la capa de color recolorea vía\n`;
  s += `// el degradado -body del padre.\n`;
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
