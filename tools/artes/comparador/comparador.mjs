import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import sharp from 'sharp';
import fs from 'fs';
const ROOT = 'C:/proyectos/club-turkaj';
const REF = ROOT + '/REFERENCIAS INTERFAZ/VEHÍCULOS';
const OUT = process.argv[2];
const ONLY = process.argv.slice(3);
// modelos desde models.json (fuente única: key, Art, ref, categoría, nombre, [color fijo])
const MODELS = JSON.parse(fs.readFileSync(ROOT + '/tools/artes/comparador/models.json', 'utf8'));
const vite = await createServer({ root: ROOT, server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
const { shade } = await vite.ssrLoadModule('/src/components/ui/vehicleArtUtils.js');
const defs = (c) => `<defs><linearGradient id="c-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${shade(c,52)}"/><stop offset="45%" stop-color="${c}"/><stop offset="100%" stop-color="${shade(c,-42)}"/></linearGradient><linearGradient id="c-glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3D4A58"/><stop offset="55%" stop-color="#1E2731"/><stop offset="100%" stop-color="#131A22"/></linearGradient><linearGradient id="c-rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#E8EAEE"/><stop offset="100%" stop-color="#9A9EA8"/></linearGradient></defs>`;
const hex = (r,g,b)=>'#'+[r,g,b].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
function dominant(raw, n) { // color dominante saturado (bucket de tono más poblado)
  const B = new Map();
  for (let i=0;i<n;i++){const r=raw[i*3],g=raw[i*3+1],b=raw[i*3+2];const mx=Math.max(r,g,b),mn=Math.min(r,g,b);if(mx-mn<70||mx<90)continue;
    let h; if(mx===r)h=((g-b)/(mx-mn)+6)%6; else if(mx===g)h=(b-r)/(mx-mn)+2; else h=(r-g)/(mx-mn)+4; const k=Math.floor(h*4);
    const e=B.get(k)||{n:0,r:0,g:0,b:0}; e.n++;e.r+=r;e.g+=g;e.b+=b;B.set(k,e);}
  const best=[...B.values()].sort((a,b)=>b.n-a.n)[0]; return best?hex(best.r/best.n,best.g/best.n,best.b/best.n):'#D21E1F';
}
// TANDA 9: fondo de COLOR (camiones) — lienzo = color de esquina de la
// ref, el diff descarta la familia de tono del fondo (sombra de piso) y
// el color de cuerpo puede venir EXPLÍCITO en la columna 6 (cuerpos
// blancos: el dominante saturado sería el fondo).
const hueOf=(r,g,b)=>{const mx=Math.max(r,g,b),mn=Math.min(r,g,b);if(mx-mn<20)return -1;
  if(mx===r)return ((g-b)/(mx-mn)+6)%6; if(mx===g)return (b-r)/(mx-mn)+2; return (r-g)/(mx-mn)+4;};
const results=[];
for (const [key,art,ref,cat,name,fixedColor] of MODELS) {
  if (ONLY.length && !ONLY.includes(key)) continue;
  const refPath = REF+'/'+ref; if(!fs.existsSync(refPath)){console.log('SIN REF',key);continue;}
  const meta = await sharp(refPath).metadata(); const W=meta.width,H=meta.height;
  const refRaw = await sharp(refPath).flatten({background:'#fff'}).removeAlpha().raw().toBuffer();
  const color = fixedColor || dominant(refRaw, W*H);
  const bgc=[refRaw[(2*W+2)*3],refRaw[(2*W+2)*3+1],refRaw[(2*W+2)*3+2]];
  const bgHue=hueOf(...bgc);
  const mod = await vite.ssrLoadModule(`/src/components/ui/${art}.jsx`);
  let m = renderToStaticMarkup(React.createElement('svg',{xmlns:'http://www.w3.org/2000/svg'},React.createElement(mod.default,{uid:'c',color})));
  m = m.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'');
  m = m.replace(/<ellipse[^>]*rgba\(0,0,0[^>]*\/>/g,'');
  const tr = m.match(/transform="translate\(([-\d.]+) ([-\d.]+)\) scale\(([-\d.]+)\)"/);
  m = m.replace(/ transform="translate\([^"]*"/,'');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="${hex(...bgc)}"/>${defs(color)}${m}</svg>`;
  const artRaw = await sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer();
  const d = Buffer.alloc(W*H*3); let cnt=0, ink=0;
  for(let i=0;i<W*H;i++){const dr=Math.abs(artRaw[i*3]-refRaw[i*3]),dg=Math.abs(artRaw[i*3+1]-refRaw[i*3+1]),db=Math.abs(artRaw[i*3+2]-refRaw[i*3+2]);
    const isBgPx = Math.abs(refRaw[i*3]-bgc[0])<12&&Math.abs(refRaw[i*3+1]-bgc[1])<12&&Math.abs(refRaw[i*3+2]-bgc[2])<12;
    if(!isBgPx)ink++;
    let skip=false;
    if(bgHue>=0){const h=hueOf(refRaw[i*3],refRaw[i*3+1],refRaw[i*3+2]);
      if(h>=0){let dd=Math.abs(h-bgHue);if(dd>3)dd=6-dd;skip=dd<=0.5;}}
    if(!skip&&Math.max(dr,dg,db)>70){cnt++;d[i*3]=255;d[i*3+1]=0;d[i*3+2]=200;}
    else {d[i*3]=Math.min(255,Math.round(128+refRaw[i*3]*0.5));d[i*3+1]=Math.min(255,Math.round(128+refRaw[i*3+1]*0.5));d[i*3+2]=Math.min(255,Math.round(128+refRaw[i*3+2]*0.5));} }
  const TW=960;
  const toB64 = async (input, isRaw) => 'data:image/webp;base64,'+(await (isRaw?sharp(input,{raw:{width:W,height:H,channels:3}}):sharp(input)).resize({width:TW}).webp({quality:82}).toBuffer()).toString('base64');
  const r = { key, name, cat, color, diff:+(cnt/(W*H)*100).toFixed(2), diffInk:+(cnt/ink*100).toFixed(1), w:W, h:H, scale: tr?tr[3]:null,
    ref: await toB64(refPath,false), art: await toB64(Buffer.from(svg),false), dif: await toB64(d,true) };
  results.push(r); console.log(key, color, `${W}x${H}`, 'diff', r.diff+'%', 'sobre tinta', r.diffInk+'%');
}
await vite.close();
fs.writeFileSync(OUT, JSON.stringify(results));
console.log('ok', results.length);
