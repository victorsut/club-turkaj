// Analiza las manchas REALES de diff por modelo: erosiona el antialias (2px),
// agrupa por componentes y reporta caja, tamaño y color ref vs arte.
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import sharp from 'sharp';
import fs from 'fs';
const ROOT = 'C:/proyectos/club-turkaj';
const REF = ROOT + '/REFERENCIAS INTERFAZ/VEHÍCULOS';
const MODELS = JSON.parse(fs.readFileSync(ROOT + '/tools/artes/comparador/models.json', 'utf8'));
const ONLY = process.argv.slice(2);
const MIN = 250; // px mínimos de una mancha tras erosión
const vite = await createServer({ root: ROOT, server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
const { shade } = await vite.ssrLoadModule('/src/components/ui/vehicleArtUtils.js');
const defs = (c) => `<defs><linearGradient id="c-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${shade(c,52)}"/><stop offset="45%" stop-color="${c}"/><stop offset="100%" stop-color="${shade(c,-42)}"/></linearGradient><linearGradient id="c-glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3D4A58"/><stop offset="55%" stop-color="#1E2731"/><stop offset="100%" stop-color="#131A22"/></linearGradient><linearGradient id="c-rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#E8EAEE"/><stop offset="100%" stop-color="#9A9EA8"/></linearGradient></defs>`;
const hex = (r,g,b)=>'#'+[r,g,b].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
function dominant(raw, n) {
  const B = new Map();
  for (let i=0;i<n;i++){const r=raw[i*3],g=raw[i*3+1],b=raw[i*3+2];const mx=Math.max(r,g,b),mn=Math.min(r,g,b);if(mx-mn<70||mx<90)continue;
    let h; if(mx===r)h=((g-b)/(mx-mn)+6)%6; else if(mx===g)h=(b-r)/(mx-mn)+2; else h=(r-g)/(mx-mn)+4; const k=Math.floor(h*4);
    const e=B.get(k)||{n:0,r:0,g:0,b:0}; e.n++;e.r+=r;e.g+=g;e.b+=b;B.set(k,e);}
  const best=[...B.values()].sort((a,b)=>b.n-a.n)[0]; return best?hex(best.r/best.n,best.g/best.n,best.b/best.n):'#D21E1F';
}
// TANDA 9: fondo de COLOR (camiones) — lienzo del render = color de la
// esquina de la referencia y el diff descarta la familia de tono del
// fondo (sombra de piso = mismo tono oscurecido); color de cuerpo
// EXPLÍCITO opcional en models.json (columna 6) para cuerpos blancos
// donde el color dominante saturado sería el fondo.
const hueOf=(r,g,b)=>{const mx=Math.max(r,g,b),mn=Math.min(r,g,b);if(mx-mn<20)return -1;
  if(mx===r)return ((g-b)/(mx-mn)+6)%6; if(mx===g)return (b-r)/(mx-mn)+2; return (r-g)/(mx-mn)+4;};
const out = {};
for (const [key,art,ref,,,fixedColor] of MODELS) {
  if (ONLY.length && !ONLY.includes(key)) continue;
  const refPath = REF+'/'+ref; if(!fs.existsSync(refPath)) continue;
  const meta = await sharp(refPath).metadata(); const W=meta.width,H=meta.height;
  const refRaw = await sharp(refPath).flatten({background:'#fff'}).removeAlpha().raw().toBuffer();
  const color = fixedColor || dominant(refRaw, W*H);
  const bgc=[refRaw[(2*W+2)*3],refRaw[(2*W+2)*3+1],refRaw[(2*W+2)*3+2]];
  const bgHue=hueOf(...bgc);
  const bgHex=hex(...bgc);
  const mod = await vite.ssrLoadModule(`/src/components/ui/${art}.jsx`);
  let m = renderToStaticMarkup(React.createElement('svg',{xmlns:'http://www.w3.org/2000/svg'},React.createElement(mod.default,{uid:'c',color})));
  m = m.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'').replace(/<ellipse[^>]*rgba\(0,0,0[^>]*\/>/g,'').replace(/ transform="translate\([^"]*"/,'');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="${bgHex}"/>${defs(color)}${m}</svg>`;
  const artRaw = await sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer();
  const mask = new Uint8Array(W*H);
  for(let i=0;i<W*H;i++){
    if(bgHue>=0){const h=hueOf(refRaw[i*3],refRaw[i*3+1],refRaw[i*3+2]);
      if(h>=0){let dd=Math.abs(h-bgHue);if(dd>3)dd=6-dd;if(dd<=0.5){mask[i]=0;continue;}}}
    const d=Math.max(Math.abs(artRaw[i*3]-refRaw[i*3]),Math.abs(artRaw[i*3+1]-refRaw[i*3+1]),Math.abs(artRaw[i*3+2]-refRaw[i*3+2]));mask[i]=d>70?1:0;}
  // erosión radio 2
  const er = new Uint8Array(W*H);
  for(let y=2;y<H-2;y++)for(let x=2;x<W-2;x++){const i=y*W+x;if(!mask[i])continue;let ok=1;
    for(let dy=-2;dy<=2&&ok;dy++)for(let dx=-2;dx<=2;dx++){if(!mask[i+dy*W+dx]){ok=0;break;}} er[i]=ok;}
  // componentes sobre la máscara ORIGINAL sembrados desde píxeles erosionados
  const lab = new Int32Array(W*H); let n=0; const comps=[];
  const stack=new Int32Array(W*H);
  for(let s=0;s<W*H;s++){ if(!er[s]||lab[s])continue; n++; let sp=0; stack[sp++]=s; lab[s]=n;
    const c={n:0,x0:W,y0:H,x1:0,y1:0,rr:0,rg:0,rb:0,ar:0,ag:0,ab:0,core:0};
    while(sp){const i=stack[--sp]; const x=i%W,y=(i/W)|0; c.n++; if(er[i])c.core++; if(x<c.x0)c.x0=x;if(x>c.x1)c.x1=x;if(y<c.y0)c.y0=y;if(y>c.y1)c.y1=y;
      c.rr+=refRaw[i*3];c.rg+=refRaw[i*3+1];c.rb+=refRaw[i*3+2];c.ar+=artRaw[i*3];c.ag+=artRaw[i*3+1];c.ab+=artRaw[i*3+2];
      for(const j of [i-1,i+1,i-W,i+W]){ if(j<0||j>=W*H||lab[j]||!mask[j])continue; lab[j]=n; stack[sp++]=j; } }
    if(c.core>=MIN) comps.push(c); }
  comps.sort((a,b)=>b.core-a.core);
  const rows = comps.slice(0,12).map(c=>({core:c.core,px:c.n,box:[c.x0,c.y0,c.x1,c.y1],ref:hex(c.rr/c.n,c.rg/c.n,c.rb/c.n),art:hex(c.ar/c.n,c.ag/c.n,c.ab/c.n)}));
  out[key]={color,W,H,total:comps.reduce((s,c)=>s+c.core,0),comps:rows};
  console.log(`\n== ${key} (${color}) manchas≥${MIN}px: ${comps.length}, área núcleo total ${out[key].total}px`);
  for(const r of rows) console.log(`  ${String(r.core).padStart(6)}px  box [${r.box.join(',')}]  ref ${r.ref} → arte ${r.art}`);
}
await vite.close();
fs.writeFileSync(ROOT+'/tools/artes/comparador/analisis.json', JSON.stringify(out,null,1));
