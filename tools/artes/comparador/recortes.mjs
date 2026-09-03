// Montaje por modelo: para cada mancha del análisis, fila ref | arte | diff (desde los webp 960px)
import sharp from 'sharp';
import fs from 'fs';
const S = process.env.CMP_DIR || 'C:/proyectos/club-turkaj/tools/artes/comparador/cmp';
const A = JSON.parse(fs.readFileSync('C:/proyectos/club-turkaj/tools/artes/comparador/analisis.json','utf8'));
const keys = process.argv.slice(2);
const K = 960/1536, PAD = 40, TW = 300;
for (const key of keys) {
  const m = A[key]; if (!m) continue;
  const comps = m.comps.filter(c => { const w=c.box[2]-c.box[0], h=c.box[3]-c.box[1]; return !(w>1000 && h>400); }).slice(0,5); // fuera cajas de auto entero (líneas/sombra)
  if (!comps.length) continue;
  const rows = [];
  for (const c of comps) {
    let [x0,y0,x1,y1] = c.box.map(v=>Math.round(v*K)); x0=Math.max(0,x0-PAD); y0=Math.max(0,y0-PAD); x1=Math.min(959,x1+PAD); y1=Math.min(Math.round(m.H*K)-1,y1+PAD);
    const w=x1-x0, h=y1-y0; const th = Math.round(h*TW/w);
    const tiles = [];
    for (const k of ['ref','art','dif']) tiles.push(await sharp(`${S}/${key}-${k}.webp`).extract({left:x0,top:y0,width:w,height:h}).resize({width:TW,height:th}).png().toBuffer());
    rows.push({tiles, th, label:`${c.core}px ref ${c.ref} → arte ${c.art}`});
  }
  const H = rows.reduce((s,r)=>s+r.th+4,0);
  const comp = []; let y=0;
  for (const r of rows) { r.tiles.forEach((t,i)=>comp.push({input:t,left:i*(TW+4),top:y})); y += r.th+4; }
  await sharp({create:{width:TW*3+8,height:H,channels:3,background:'#222'}}).composite(comp).png().toFile(`${S}/crop-${key}.png`);
  console.log(key, rows.map(r=>r.label).join(' | '));
}
