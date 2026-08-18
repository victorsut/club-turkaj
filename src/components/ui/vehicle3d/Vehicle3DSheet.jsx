// src/components/ui/vehicle3d/Vehicle3DSheet.jsx
// F6 E2-3D — Modal a pantalla completa del visor 3D. Este archivo es la
// frontera del React.lazy: al abrirlo baja el chunk de three.js.
import Vehicle3DViewer from './Vehicle3DViewer.jsx';

export default function Vehicle3DSheet({ vehicle, bodyKey, dark, onClose }) {
  const name = [vehicle?.brand, vehicle?.model].filter(Boolean).join(' ') || 'Mi vehículo';
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: dark ? 'rgba(10,10,14,.96)' : 'rgba(244,243,246,.97)',
      display: 'flex', flexDirection: 'column',
      animation: 'fadeIn .22s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 6px' }}>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: 2, color: '#FA5408', textTransform: 'uppercase' }}>Vista 3D</div>
          <div style={{ fontSize: 19, fontWeight: 900, color: dark ? '#fff' : '#0D0D0D', marginTop: 2 }}>{name}</div>
        </div>
        <button onClick={onClose} aria-label="Cerrar" style={{
          width: 38, height: 38, borderRadius: 12, border: 'none', cursor: 'pointer',
          background: dark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.07)',
          color: dark ? '#fff' : '#0D0D0D', fontSize: 17, fontWeight: 800,
        }}>✕</button>
      </div>
      <div onClick={e => e.stopPropagation()} style={{ flex: 1, minHeight: 0 }}>
        <Vehicle3DViewer body={bodyKey} color={vehicle?.color || '#9E9E9E'} />
      </div>
      <div style={{
        textAlign: 'center', padding: '0 20px 26px', fontSize: 12.5, fontWeight: 700,
        color: dark ? 'rgba(255,255,255,.45)' : 'rgba(0,0,0,.4)',
      }}>Arrastra para girarla — frente, atrás y de lado</div>
    </div>
  );
}
