// Arnés de verificación visual de la vista RIFA con carrusel de meses
// (4-sep-2026). Monta ClientRaffle con un ctx simulado: 9 meses, premios
// con y sin imagen, ganadores y participantes. Sin Supabase.
// Uso: npx vite --config tools/harness/vite.harness.config.js
//      http://localhost:3100/tools/harness/raffle.html?month=7&dark=1
import { createRoot } from 'react-dom/client';
import '../../src/styles/global.css';
import ClientRaffle from '../../src/views/client/ClientRaffle';

const q = new URLSearchParams(location.search);
const dark = q.get('dark') === '1';
const curMonth = 8; // septiembre
const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const raffleCal = months.map((m, i) => ({
  m, name: i <= curMonth ? ['Tanque lleno', 'Casco', 'Llantas', 'Cambio de aceite', 'Combo lavado', 'Bocina', 'Tanque lleno', 'Casco', 'Llantas'][i] : null,
  icon: '🎁', img: null, v: `Q${(i + 1) * 100}`, winnerId: i < curMonth && i !== 3 ? `u${i}` : null,
  year: 2026, ticketPts: null,
}));
const rafData = months.map((_, i) => ({
  participants: i > curMonth || i === 3 ? [] : [
    { cid: 'me', name: 'Víctor', tickets: 2 + i, avatar: null },
    { cid: `u${i}`, name: 'Ezer M.', tickets: 3, avatar: null },
    { cid: 'x', name: 'Fernando M.', tickets: 1, avatar: null },
    ...Array.from({ length: 25 }, (_, k) => ({ cid: 'p' + i + '_' + k, name: 'Socio ' + (k + 1), tickets: 1 + (k % 4), avatar: null })),
  ],
}));
const ctx = {
  me: { id: 'me', points: 120 }, cfg: { ticketPts: 5 }, cTier: { name: dark ? 'BLACK' : 'ORO' },
  raffleCal, rafData, buyTickets: () => {}, curMonth, custs: [], dark,
};

// ?month=N → arranca en ese mes (el arnés no puede arrastrar)
const start = q.get('month');
const Wrapped = () => {
  const c = { ...ctx, curMonth };
  return <ClientRaffle {...c} />;
};
document.body.style.background = dark ? '#0B0B0D' : '#F7F7F9';
if (q.get('scroll')) setTimeout(() => { const el = document.querySelector('#root > div > div'); if (el) el.scrollTop = +q.get('scroll'); }, 600);
createRoot(document.getElementById('root')).render(<div style={{ width: 390 }}><Wrapped /></div>);
if (start != null) {
  // simular el tap en ‹ hasta llegar al mes pedido (usa el mismo go() del hook)
  setTimeout(() => {
    const n = curMonth - Number(start);
    for (let i = 0; i < n; i++) document.querySelector('[aria-label="Mes anterior"]')?.click();
  }, 300);
}
