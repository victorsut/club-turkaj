// Arnés de verificación visual D4 (4-sep-2026): tarjeta Precios de
// Combustible de Admin → Configuración con el interruptor por estación.
//   ?per=1   → modo por estación encendido (Turkaj III con precio propio)
//   ?modal=global | ?modal=station → abre el modal correspondiente
// Uso: npx vite --config tools/harness/vite.harness.config.js
//      http://localhost:3100/tools/harness/d4.html?per=1
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/styles/global.css';
import FuelPricesCard from '../../src/views/admin/settings/FuelPricesCard';
import FuelPricesModal from '../../src/views/admin/settings/FuelPricesModal';
import { adminTheme as AT } from '../../src/constants/styles';

const q = new URLSearchParams(location.search);
const per = q.get('per') === '1';
const modal = q.get('modal');

const card = { background: AT.card, borderRadius: 16, border: `1px solid ${AT.border}`, padding: 16 };
const cardTitle = { fontSize: 11, fontWeight: 800, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 };
const cardHint = { fontSize: 11, color: '#777', marginBottom: 12, lineHeight: 1.5 };
const row = { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${AT.border}`, fontSize: 13 };
const ghostCardBtn = (color) => ({
  width: '100%', padding: '11px 16px', borderRadius: 12, background: 'transparent',
  border: `1px solid ${AT.border}`, color, fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700, cursor: 'pointer',
});

const stations0 = [
  { id: 's1', name: 'Turkaj I', fuelPrices: null },
  { id: 's2', name: 'Turkaj II', fuelPrices: null },
  { id: 's3', name: 'Turkaj III', fuelPrices: { super: 45.49, regular: 42.49, diesel: 48.29 } },
];

function Harness() {
  const [cfg, setCfg] = useState({ fuelPrices: { super: 44.99, regular: 41.99, diesel: 47.99 }, fuelPricesPerStation: per });
  const [stations, setStations] = useState(stations0);
  const admin = { id: 'a', name: 'Admin', email: 'a@x' };
  const fire = (m) => console.log('[fire]', m);
  return (
    <div style={{ width: 440, padding: 16 }}>
      <FuelPricesCard
        cfg={cfg} setCfg={setCfg} stations={stations} setStations={setStations}
        loggedAdmin={admin} fire={fire}
        card={card} cardTitle={cardTitle} cardHint={cardHint} row={row}
        ghostCardBtn={ghostCardBtn} border={AT.border}
      />
      {modal && (
        <FuelPricesModal
          cfg={cfg} setCfg={setCfg} fire={fire} loggedAdmin={admin}
          station={modal === 'station' ? stations[2] : null} setStations={setStations}
          onClose={() => {}}
        />
      )}
    </div>
  );
}
document.body.style.background = AT.bg;
createRoot(document.getElementById('root')).render(<Harness />);
