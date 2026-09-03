// Reemplaza el CFG de verify-autos.js con las 15 entradas de la tanda
const fs = require('fs');
const p = __dirname + '/verify-autos.js';
let s = fs.readFileSync(p, 'utf8');
const start = s.indexOf('const CFG = {');
const end = s.indexOf('};', start) + 2;
const cfg = `const CFG = {
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
  xb: { ref: 'AUTOS LIVIANOS/SCION, XB.png', shadow: [700, 880],
    layers: [['black', '#1D1D1D'], ['dark', '#2D2D2C'], ['silver', '#B9B8B8'], ['lightgray', '#C8C8C8'], ['darkred', 'SHADE:-28'], ['red2', 'SHADE:-14'], ['red', 'BODY']], zones: [] },
  xd: { ref: 'AUTOS LIVIANOS/SCION, XD.png', shadow: [715, 878],
    layers: [['black', '#131313'], ['char', '#282828'], ['silver', '#B9B8B8'], ['lightgray', '#DEDDDD'], ['darkred', 'SHADE:-28'], ['red2', 'SHADE:-14'], ['red', 'BODY']], zones: [] },
  crv: { ref: 'SUV/HONDA, CR-V.png', shadow: [700, 875],
    layers: [['deep', '#181818'], ['char', '#2C2C2C'], ['silver', '#BAB8B8'], ['darkred', 'SHADE:-10'], ['red', 'BODY']], zones: [] },
  tucson: { ref: 'SUV/HYUNDAI, TUCSON.png', shadow: [700, 875],
    layers: [['deep', '#161614'], ['char', '#292929'], ['silver', '#BAB8B8'], ['darkred', 'SHADE:-25'], ['red2', 'SHADE:-12'], ['red', 'BODY']], zones: [] },
  sportage: { ref: 'SUV/KIA, SPORTAGE.png', shadow: [700, 875],
    layers: [['deep', '#151513'], ['char', '#2A2A29'], ['silver', '#BBBABA'], ['darkred', 'SHADE:-25'], ['red2', 'SHADE:-12'], ['red', 'BODY']], zones: [] },
  cx5: { ref: 'SUV/MAZDA, CX-5.png', shadow: [702, 878],
    layers: [['deep', '#151513'], ['char', '#2A2A29'], ['gray2', '#3D3D3D'], ['trim', '#4F4F4E'], ['silver', '#BEBDBD'], ['darkred', 'SHADE:-18'], ['red', 'BODY']], zones: [] },
  runner: { ref: 'SUV/TOYOTA, 4RUNNER.png', shadow: [710, 880],
    layers: [['deep', '#161616'], ['char', '#282827'], ['silver', '#B7B6B6'], ['darkred', 'SHADE:-28'], ['red2', 'SHADE:-10'], ['red', 'BODY'], ['white', '#FBFBFB']], zones: [] },
  rav4: { ref: 'SUV/TOYOTA, RAV4.png', shadow: [705, 878],
    layers: [['deep', '#151515'], ['char', '#292929'], ['glass', '#3A3A3A'], ['silver', '#BBBABA'], ['darkred', 'SHADE:-25'], ['red2', 'SHADE:-14'], ['red', 'BODY']], zones: [] },
};`;
s = s.slice(0, start) + cfg + s.slice(end);
fs.writeFileSync(p, s);
console.log('CFG set');
