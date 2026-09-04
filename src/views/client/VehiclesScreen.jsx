// src/views/client/VehiclesScreen.jsx
// Pestaña VEHÍCULOS — entrada de la ventana real para TODOS los socios
// (rollout de F6, 4-sep-2026, decisión del dueño). Sustituye a
// VehiclesSoon: ya no hay compuerta de beta — list_my_vehicles devuelve
// la ficha directamente y VehiclesHome se monta con ella. Este archivo
// solo carga la lista (con spinner y reintento) y descarga el chunk.
import { useEffect, useState, lazy, Suspense } from 'react';
import { BRAND_ORANGE } from '../../constants/styles';
import { listMyVehicles } from '../../services/vehicleService';
import LogoSpinner from '../../components/ui/LogoSpinner';

// LAZY (code splitting, 14-ago): la ventana —con el arte de los
// vehículos y los formularios— baja solo al entrar a la pestaña.
// 3-sep: un REINTENTO tras 800 ms antes de rendirse (deploy entre medio
// o red inestable); si vuelve a fallar, el ChunkBoundary del router
// recarga una vez y luego ofrece Reintentar — nunca pantalla en blanco.
const VehiclesHome = lazy(() => import('./vehicles/VehiclesHome').catch(() =>
  new Promise(r => setTimeout(r, 800)).then(() => import('./vehicles/VehiclesHome'))
));

export default function VehiclesScreen(ctx) {
  const { me, dark } = ctx;
  const [vehicles, setVehicles] = useState(null); // null = cargando
  const [error, setError] = useState(false);
  const [tryK, setTryK] = useState(0);

  useEffect(() => {
    let alive = true;
    if (!me?.id || String(me.id).startsWith('temp-')) return;
    setError(false);
    listMyVehicles().then(({ data, error: err }) => {
      if (!alive) return;
      if (err || !data?.ok) { setError(true); return; }
      setVehicles(Array.isArray(data.vehicles) ? data.vehicles : []);
    });
    return () => { alive = false; };
  }, [me?.id, tryK]);

  const center = { minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, textAlign: 'center' };

  if (error) {
    return (
      <div style={center}>
        <div style={{ fontSize: 14, color: dark ? 'rgba(255,255,255,.6)' : '#6B6B6B', lineHeight: 1.6, maxWidth: 280 }}>
          No se pudieron cargar tus vehículos. Revisa tu conexión e inténtalo de nuevo.
        </div>
        <button onClick={() => setTryK(k => k + 1)} style={{
          padding: '12px 22px', borderRadius: 14, border: 'none', cursor: 'pointer',
          background: BRAND_ORANGE, color: '#fff', fontFamily: "'DM Sans'", fontSize: 13.5, fontWeight: 800,
        }}>Reintentar</button>
      </div>
    );
  }

  const spinner = <div style={center}><LogoSpinner size={44} dark={dark} /></div>;
  if (!vehicles) return spinner;

  return (
    <Suspense fallback={spinner}>
      <VehiclesHome ctx={ctx} vehicles={vehicles} setVehicles={setVehicles} />
    </Suspense>
  );
}
