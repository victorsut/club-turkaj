// Arnés de verificación visual del cuadro VEHÍCULO del inicio (4-sep-2026).
// Siembra la caché por socio y monta el tile en los 3 niveles, con y sin vehículo.
import { createRoot } from 'react-dom/client';
import '../../src/styles/global.css';
import VehicleBentoTile from '../../src/views/client/home/VehicleBentoTile';
import PromoBentoTile from '../../src/views/client/home/PromoBentoTile';
import { homeTileColors } from '../../src/constants/styles';

const seed = (id, v) => localStorage.setItem(`pp_home_vehicle_${id}`, JSON.stringify(v));
seed('navi', { id: 'a', vtype: 'moto', brand: 'Honda', model: 'Navi', color: '#C62828' });
seed('cx5', { id: 'b', vtype: 'liviano', brand: 'Mazda', model: 'CX-5', color: '#E0E0E0' });
seed('picop', { id: 'c', vtype: 'picop', brand: 'Toyota', model: 'Hilux', color: '#1565C0' });
localStorage.removeItem('pp_home_vehicle_none');

const Row = ({ tier, dark, id }) => {
  const htp = homeTileColors(tier, dark);
  return (
    <div style={{ background: dark ? '#0B0B0D' : '#F7F7F9', padding: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: dark ? '#fff' : '#333', marginBottom: 6 }}>{tier} · {dark ? 'oscuro' : 'claro'}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
        <VehicleBentoTile me={{ id }} htp={htp} onOpen={() => {}} />
        <VehicleBentoTile me={{ id: 'none' }} htp={htp} onOpen={() => {}} />
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')).render(
  <div style={{ width: 390, margin: '0 auto' }}>
    <Row tier="ORO" dark={false} id="navi" />
    <Row tier="PLATINO" dark={false} id="cx5" />
    <Row tier="BLACK" dark={true} id="picop" />
  </div>
);
// Uso: npx vite --config tools/harness/vite.harness.config.js
//      msedge --headless=new --screenshot=tile.png --window-size=390,1000 --virtual-time-budget=15000 http://localhost:3100/tools/harness/home-tile.html
