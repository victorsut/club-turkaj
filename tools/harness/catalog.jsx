// Arnés de verificación visual de la pestaña CANJES (Catalog, cliente)
// con título + categorías PEGAJOSOS (4-sep-2026).
//   ?dark=1  ·  ?scroll=N (desplaza la lista de premios)
// Uso: npx vite --config tools/harness/vite.harness.config.js
//      http://localhost:3100/tools/harness/catalog.html?scroll=600
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/styles/global.css';
import Catalog from '../../src/views/shared/Catalog';

const q = new URLSearchParams(location.search);
const dark = q.get('dark') === '1';
const cats = ['combustible', 'servicio', 'merch', 'cultural', 'shell', 'premium'];
const rewards = Array.from({ length: 18 }, (_, i) => ({
  id: 'r' + i, name: ['Café americano', 'Lavado básico', 'Gorra', 'Tanque lleno', 'Cambio de aceite', 'Camisa'][i % 6] + ' ' + (i + 1),
  pts: 40 + i * 25, cat: cats[i % cats.length], icon: '🎁', active: true, desc: 'Premio de prueba',
}));

function Harness() {
  const [catF, setCatF] = useState('todos');
  const ctx = {
    rewards, me: { id: 'me', points: 300, gallons: 20 }, gT: () => ({ name: dark ? 'BLACK' : 'ORO', redeemDisc: 0 }),
    cfg: { qPerPt: 10 }, cTier: { name: dark ? 'BLACK' : 'ORO' }, catF, setCatF,
    redeem: () => {}, setRedeemConfirm: () => {}, client: true, redeemedList: [], activityLog: [],
    dark, showQR: false, stations: [], stores: [],
  };
  return <Catalog {...ctx} />;
}
document.body.style.background = dark ? '#0B0B0D' : '#F7F7F9';
if (q.get('scroll')) setTimeout(() => { const el = document.querySelector('#root > div > div'); if (el) el.scrollTop = +q.get('scroll'); }, 600);
createRoot(document.getElementById('root')).render(<div style={{ width: 390 }}><Harness /></div>);
