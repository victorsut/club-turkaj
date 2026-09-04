// Arnés de verificación visual del cuadro VEHÍCULO del inicio (4-sep-2026).
// Siembra la caché por socio y monta el tile en los 3 niveles, con y sin vehículo.
import { createRoot } from 'react-dom/client';
import '../../src/styles/global.css';
import VehicleBentoTile from '../../src/views/client/home/VehicleBentoTile';
import PromoBentoTile from '../../src/views/client/home/PromoBentoTile';
import { homeTileColors } from '../../src/constants/styles';

const seed = (id, v) => localStorage.setItem(`pp_home_vehicle_${id}`, JSON.stringify(v));
seed('navi', { id: 'a', vtype: 'moto', brand: 'Honda', model: 'Navi', color: '#2E7D32' });
seed('hilux', { id: 'b', vtype: 'picop', brand: 'Toyota', model: 'Hilux', color: '#37474F' });
seed('gen_liv', { id: 'c', vtype: 'liviano', brand: 'Chevrolet', model: 'Aveo', color: '#C62828' });
seed('gen_moto', { id: 'd', vtype: 'moto', brand: 'Genérica', model: 'XYZ', color: '#1565C0' });
seed('cx5', { id: 'e', vtype: 'liviano', brand: 'Mazda', model: 'CX-5', color: '#E0E0E0' });
seed('bus', { id: 'f', vtype: 'microbus', brand: 'Toyota', model: 'Hiace', color: '#F9A825' });
seed('tuk', { id: 'g', vtype: 'mototaxi', brand: 'Bajaj', model: 'Torito', color: '#C62828' });
localStorage.removeItem('pp_home_vehicle_none');

const Row = ({ tier, dark, ids }) => {
  const htp = homeTileColors(tier, dark);
  return (
    <div style={{ background: dark ? '#0B0B0D' : '#F7F7F9', padding: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: dark ? '#fff' : '#333', marginBottom: 6 }}>{tier} · {dark ? 'oscuro' : 'claro'}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
        {ids.map(id => <VehicleBentoTile key={id} me={{ id }} htp={htp} onOpen={() => {}} />)}
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')).render(
  <div style={{ width: 390 }}>
    <Row tier="PLATINO" dark={false} ids={['navi', 'hilux', 'gen_liv', 'gen_moto']} />
    <Row tier="ORO" dark={false} ids={['cx5', 'bus']} />
    <Row tier="BLACK" dark={true} ids={['tuk', 'none']} />
  </div>
);
// Uso: npx vite --config tools/harness/vite.harness.config.js
//      msedge --headless=new --screenshot=tile.png --window-size=390,1000 --virtual-time-budget=15000 http://localhost:3100/tools/harness/home-tile.html
