// Compara analisis.json (nuevo) contra baseline-e119.json: total de núcleo de manchas
// y total SIN las cajas de auto entero (líneas de panel / sombra de piso).
import fs from 'fs';
const A = JSON.parse(fs.readFileSync('C:/proyectos/club-turkaj/tools/artes/comparador/analisis.json','utf8'));
const B = JSON.parse(fs.readFileSync('C:/proyectos/club-turkaj/tools/artes/comparador/baseline-e119.json','utf8'));
const real = (m) => m.comps.filter(c => { const w=c.box[2]-c.box[0], h=c.box[3]-c.box[1]; return !(w>1000 && h>400); }).reduce((s,c)=>s+c.core,0);
let worse = [];
for (const k of Object.keys(B)) { const m = A[k]; if (!m) continue;
  const r = real(m); const flag = m.total > B[k] ? '  ▲ PEOR' : '';
  console.log(k.padEnd(10), 'antes', String(B[k]).padStart(6), '→ ahora', String(m.total).padStart(6), '| sin cajas enteras', String(r).padStart(6), flag);
  if (m.total > B[k]) worse.push(k);
}
console.log('empeoran:', worse.join(', ') || 'ninguno');
