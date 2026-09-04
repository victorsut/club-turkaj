// Arnés de verificación visual D24 (4-sep-2026):
//   ?view=form[&dark=1]  → VehicleForm en modo 'data' con el interruptor
//                          "Recordatorios de servicio" (vehículo simulado)
//   ?view=admin          → ServiceAlertsCard (Admin → Configuración)
// Uso: npx vite --config tools/harness/vite.harness.config.js
//      http://localhost:3100/tools/harness/d24.html?view=form&dark=1
import { createRoot } from 'react-dom/client';
import '../../src/styles/global.css';
import VehicleForm from '../../src/views/client/vehicles/VehicleForm';
import ServiceAlertsCard from '../../src/views/admin/settings/ServiceAlertsCard';
import { adminTheme as AT } from '../../src/constants/styles';

const q = new URLSearchParams(location.search);
const dark = q.get('dark') === '1';
const view = q.get('view') || 'form';

const vehicle = {
  id: 'v1', vtype: 'moto', brand: 'Honda', model: 'Navi', version: '', color: '#2E7D32', plate: 'M033LDJ',
  km: 12400, oil_type: '10W-40', next_service: '2026-09-20', next_service_km: 13000, tank_gal: 0.9, fuel_pref: 'regular',
  alerts_muted: q.get('muted') === '1',
};

let tree;
if (view === 'admin') {
  const card = { background: AT.card, borderRadius: 14, padding: 16, marginBottom: 14, border: `1px solid ${AT.border}` };
  const cardTitle = { fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 6 };
  const cardHint = { fontSize: 11, color: '#888', lineHeight: 1.5, marginBottom: 10 };
  document.body.style.background = AT.bg || '#0B0B0D';
  tree = (
    <div style={{ width: 420, padding: 16 }}>
      <ServiceAlertsCard
        cfg={{ serviceAlerts: { days: 7, km: 500, overdueEveryDays: 7, kmEveryDays: 14 } }}
        setCfg={() => {}} loggedAdmin={{ id: 'a', name: 'Admin' }} fire={(m) => console.log(m)}
        card={card} cardTitle={cardTitle} cardHint={cardHint}
      />
    </div>
  );
} else {
  document.body.style.background = dark ? '#0B0B0D' : '#F7F7F9';
  tree = (
    <div style={{ width: 390, minHeight: 800 }}>
      <VehicleForm vehicle={vehicle} mode="data" dark={dark} fire={(m) => console.log(m)}
        onClose={() => {}} onSaved={() => {}} onDeleted={() => {}} />
    </div>
  );
}
createRoot(document.getElementById('root')).render(tree);
